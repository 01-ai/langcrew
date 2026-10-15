from __future__ import annotations

import json
from typing import Any

from .types import CitationResultItem, CitationSource, CitationToolAdapter


class LangMemCitationToolAdapter(CitationToolAdapter):
    """Adapt LangMem search results without modifying its StructuredTool."""

    _TOOL_NAMES = {"search_user_memory", "search_app_memory"}

    def __call__(self, request, message) -> list[CitationResultItem] | None:
        tool_name = str(request.tool_call.get("name") or "")
        if tool_name not in self._TOOL_NAMES:
            return None

        visible_items = self._visible_items(message.content)
        artifact_items = self._artifact_items(message.artifact)

        results: list[CitationResultItem] = []
        for visible in visible_items:
            if not isinstance(visible, dict):
                results.append(CitationResultItem(value=visible))
                continue
            raw_memory_id = visible.get("key") or visible.get("id")
            if raw_memory_id in (None, ""):
                results.append(CitationResultItem(value=visible))
                continue

            memory_id = str(raw_memory_id)
            raw = artifact_items.get(memory_id, visible)
            memory_value = raw.get("value", raw.get("content", ""))
            source_name = raw.get("source_name")
            if isinstance(memory_value, dict) and "content" in memory_value:
                source_name = memory_value.get("source_name", source_name)
                memory_value = memory_value["content"]
            memory_content = (
                json.dumps(memory_value, ensure_ascii=False)
                if isinstance(memory_value, (dict, list))
                else str(memory_value)
            )
            if not memory_content.strip():
                results.append(CitationResultItem(value=visible))
                continue

            data = {"memory_id": memory_id, "content": memory_content}
            if source_name:
                data["source_name"] = source_name
            results.append(
                CitationResultItem(
                    value=visible,
                    source=CitationSource(
                        type="memory",
                        source_key=(
                            memory_id
                            if tool_name == "search_user_memory"
                            else f"app:{memory_id}"
                        ),
                        data=data,
                    ),
                )
            )

        return results if any(item.source is not None for item in results) else None

    @staticmethod
    def _visible_items(content: Any) -> list[Any]:
        try:
            value = json.loads(content) if isinstance(content, str) else content
        except (TypeError, json.JSONDecodeError) as exc:
            raise ValueError(
                "LangMem citation extraction expected a JSON array"
            ) from exc
        if not isinstance(value, list):
            raise ValueError("LangMem citation extraction expected a result array")
        return value

    @staticmethod
    def _artifact_items(artifact: Any) -> dict[str, dict[str, Any]]:
        if not isinstance(artifact, list):
            return {}
        items: dict[str, dict[str, Any]] = {}
        for raw in artifact:
            if hasattr(raw, "model_dump"):
                value = raw.model_dump()
            elif hasattr(raw, "dict"):
                value = raw.dict()
            else:
                value = raw
            if not isinstance(value, dict):
                continue
            raw_memory_id = value.get("key") or value.get("id")
            if raw_memory_id not in (None, ""):
                items[str(raw_memory_id)] = value
        return items
