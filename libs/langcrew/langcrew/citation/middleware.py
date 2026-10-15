from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable
from dataclasses import replace
from typing import Any

from langchain.agents.middleware.types import AgentMiddleware, ModelRequest
from langchain.tools.tool_node import ToolCallRequest
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.types import Command

from .artifact import (
    _citation_result_from_artifact,
    _CitationResultPayload,
    attach_sources_to_artifact,
    materialize_citation_result,
)
from .config import CitationConfig
from .memory import LangMemCitationToolAdapter
from .registry import CitationRegistry
from .types import CitationResultItem, CitationResultProvider, CitationSource

logger = logging.getLogger(__name__)


class CitationMiddleware(AgentMiddleware):
    """Register citable tool results and expose Citation IDs to the model."""

    def __init__(
        self,
        config: CitationConfig | None = None,
    ) -> None:
        self.config = config or CitationConfig(enabled=True)
        self._tool_adapters = (
            LangMemCitationToolAdapter(),
            *self.config.tool_adapters,
        )

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Any],
    ) -> Any:
        return handler(self._with_citation_prompt(request))

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[Any]],
    ) -> Any:
        return await handler(self._with_citation_prompt(request))

    def wrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], ToolMessage | Command],
    ) -> ToolMessage | Command:
        return self._process_tool_result(request, handler(request))

    async def awrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], Awaitable[ToolMessage | Command]],
    ) -> ToolMessage | Command:
        return self._process_tool_result(request, await handler(request))

    def _with_citation_prompt(self, request: ModelRequest) -> ModelRequest:
        if not self.config.enabled:
            return request

        prompt = self.config.resolved_prompt
        system_message = request.system_message
        if system_message is None:
            return request.override(
                system_message=SystemMessage(content=prompt),
            )

        content = system_message.content
        if isinstance(content, str):
            content = f"{content}\n\n{prompt}"
        else:
            content = list(content)
            content.append({"type": "text", "text": prompt})
        return request.override(
            system_message=system_message.model_copy(update={"content": content}),
        )

    def _process_tool_result(
        self,
        request: ToolCallRequest,
        result: ToolMessage | Command,
    ) -> ToolMessage | Command:
        if not self.config.enabled:
            return result
        if isinstance(result, ToolMessage):
            return self._process_tool_message(request, result)
        if not isinstance(result, Command) or not isinstance(result.update, dict):
            return result

        messages = result.update.get("messages", [])
        processed = [
            self._process_tool_message(request, message)
            if isinstance(message, ToolMessage)
            else message
            for message in messages
        ]
        return replace(
            result,
            update={**result.update, "messages": processed},
        )

    def _process_tool_message(
        self,
        request: ToolCallRequest,
        message: ToolMessage,
    ) -> ToolMessage:
        if message.status == "error":
            return message

        result_payload = _citation_result_from_artifact(message.artifact)
        if result_payload is None and isinstance(
            request.tool, CitationResultProvider
        ):
            provider = request.tool
            try:
                items = provider.extract_citation_items(request, message) or []
            except Exception:
                logger.exception(
                    "Citation result provider failed for %s",
                    request.tool_call.get("name", "unknown"),
                )
                items = []
            result_payload = self._result_from_items(items, message.content)

        if result_payload is None:
            for adapter in self._tool_adapters:
                try:
                    items = adapter(request, message) or []
                except Exception:
                    logger.exception(
                        "Citation tool adapter failed for %s",
                        request.tool_call.get("name", "unknown"),
                    )
                    continue
                result_payload = self._result_from_items(items, message.content)
                if result_payload is not None:
                    break
        if result_payload is None or not any(
            item.source is not None for item in result_payload.items
        ):
            return message

        try:
            registry = CitationRegistry()
            content = materialize_citation_result(result_payload, registry)
        except (TypeError, ValueError):
            logger.exception(
                "Invalid Citation sources for tool %s",
                request.tool_call.get("name", "unknown"),
            )
            return message
        artifact = attach_sources_to_artifact(message.artifact, registry.values())
        return message.model_copy(update={"content": content, "artifact": artifact})

    @classmethod
    def _result_from_items(
        cls,
        items: list[CitationResultItem],
        content: Any,
    ) -> _CitationResultPayload | None:
        if not items:
            return None
        if not isinstance(items, list) or not all(
            isinstance(item, CitationResultItem)
            and (item.source is None or isinstance(item.source, CitationSource))
            for item in items
        ):
            logger.warning("Citation provider returned an invalid result item")
            return None
        return _CitationResultPayload(
            items=items,
            collection=cls._content_is_collection(content),
        )

    @staticmethod
    def _content_is_collection(content: Any) -> bool:
        if isinstance(content, list):
            return True
        if not isinstance(content, str):
            return False
        try:
            return isinstance(json.loads(content), list)
        except json.JSONDecodeError:
            return False
