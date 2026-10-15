"""
Client tool call execution support for LangCrew ChatKit.

This module provides functionality for agents to trigger client-side operations,
similar to OpenAI ChatKit's ClientToolCall mechanism.

Two main APIs:
1. create_client_tool() - Declarative factory for pure client tools (recommended)
2. trigger_client_tool_call() - Manual trigger for hybrid server+client tools
"""

import json
import logging
from typing import Any
from uuid import uuid4

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables.config import RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.types import interrupt

logger = logging.getLogger(__name__)


def create_client_tool(
    name: str,
    description: str,
    parameters: dict[str, Any] | None = None,
    wait_for_result: bool = True,
) -> BaseTool:
    """
    Create a client-side tool that triggers frontend operations.

    Args:
        name: Tool name (must match frontend handler)
        description: Tool description for LLM
        parameters: Optional JSON Schema for tool parameters
        wait_for_result: If True, blocks until frontend returns result (default: True)

    Returns:
        BaseTool instance that can be added to agent.tools

    Example:
        >>> get_location = create_client_tool(
        ...     name="get_location",
        ...     description="Get user location",
        ...     parameters={
        ...         "type": "object",
        ...         "properties": {
        ...             "accuracy": {"type": "string", "enum": ["high", "low"]}
        ...         }
        ...     },
        ...     wait_for_result=True,
        ... )
        >>> agent = Agent(tools=[get_location])
    """
    # Use prefixed name for LangChain tool registration
    # This allows adapter to filter out tool_call/tool_result events for client tools
    # Prefix with "langcrew_" to avoid conflicts with user-defined tools
    internal_name = f"langcrew_client_tool_{name}"

    # Capture variables for use in tool class
    _original_name = name
    _description = description
    _wait_for_result = wait_for_result
    _parameters = parameters or {"type": "object", "properties": {}}

    class ClientTool(BaseTool):
        """Dynamically created client tool class."""

        name: str = internal_name
        description: str = _description
        args_schema: dict = _parameters

        def _run(
            self, config: RunnableConfig | None = None, **kwargs
        ) -> dict[str, Any] | None:
            """Synchronous execution - wraps async version."""
            import asyncio

            try:
                return asyncio.run(self._arun(config=config, **kwargs))
            except RuntimeError:
                raise RuntimeError(
                    f"Client tool '{_original_name}' requires async execution. "
                    f"Use ainvoke() instead of invoke() when calling from async context."
                )

        async def _arun(
            self, config: RunnableConfig | None = None, **kwargs
        ) -> dict[str, Any] | None:
            """Asynchronous execution - actual implementation."""
            # config is explicitly passed as parameter (can be None)
            # kwargs contains only the tool parameters
            return await trigger_client_tool_call(
                config, _original_name, kwargs, _wait_for_result
            )

    return ClientTool()


async def trigger_client_tool_call(
    config: RunnableConfig | None,
    name: str,
    arguments: dict[str, Any],
    wait_for_result: bool = True,
) -> dict[str, Any] | None:
    """
    Manually trigger a client-side tool call.

    For pure client tools, use create_client_tool() instead.
    This is for hybrid tools that need both server and client logic.

    Args:
        config: RunnableConfig (auto-injected by LangChain, can be None)
        name: Client tool name
        arguments: Tool arguments (must be JSON-serializable)
        wait_for_result: If True, blocks until frontend returns result (default: True)

    Returns:
        Result dict from frontend if wait_for_result=True, else None

    Example:
        >>> @tool
        ... async def save_and_notify(text: str, config: RunnableConfig):
        ...     fact_id = await db.save(text)
        ...     await trigger_client_tool_call(
        ...         config, "show_notification", {"message": "Saved!"},
        ...         wait_for_result=False
        ...     )
        ...     return {"id": fact_id}
    """
    # Generate unique call_id (UUID-based, similar to tool_call_id)
    call_id = f"ctc_{uuid4().hex[:16]}"

    # Send event (will be filtered by should_send_messages on node re-execution)
    await adispatch_custom_event(
        "on_langcrew_client_tool_call",
        {
            "call_id": call_id,
            "name": name,
            "arguments": arguments,
            "wait_for_result": wait_for_result,
        },
        config=config,
    )

    if wait_for_result:
        resume_data = interrupt({"type": "client_tool_call", "call_id": call_id})

        # Parse resume_data based on source:
        # - str: from web module (http_server assembles JSON string)
        # - dict: from direct LangGraph usage or testing
        if isinstance(resume_data, str):
            try:
                parsed = json.loads(resume_data)
                final_call_id = parsed.get("call_id", call_id)
                actual_result = parsed.get("result")
            except json.JSONDecodeError:
                final_call_id = call_id
                actual_result = resume_data
        elif isinstance(resume_data, dict):
            final_call_id = resume_data.get("call_id", call_id)
            actual_result = resume_data.get("result", resume_data)
        else:
            final_call_id = call_id
            actual_result = resume_data
    else:
        final_call_id = call_id
        actual_result = None

    # Always send completed event (for both wait_for_result modes)
    await adispatch_custom_event(
        "on_langcrew_client_tool_call_completed",
        {"call_id": final_call_id, "status": "completed"},
        config=config,
    )

    return actual_result  # type: ignore[return-value]


__all__ = ["create_client_tool", "trigger_client_tool_call"]
