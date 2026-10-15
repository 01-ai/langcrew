from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from .registry import CitationRegistry
from .types import CitationResultItem, CitationSource

CITATION_SOURCES_KEY = "__langcrew_citation_sources__"
CITATION_RESULT_KEY = "__langcrew_citation_result__"
ORIGINAL_ARTIFACT_KEY = "__langcrew_original_artifact__"


@dataclass(frozen=True)
class _CitationResultPayload:
    items: list[CitationResultItem]
    collection: bool


def sources_from_artifact(artifact: Any) -> list[CitationSource]:
    if not isinstance(artifact, dict):
        return []
    values = artifact.get(CITATION_SOURCES_KEY)
    if not isinstance(values, list):
        return []

    sources: list[CitationSource] = []
    for value in values:
        if isinstance(value, CitationSource):
            sources.append(value)
        elif isinstance(value, dict) and {"type", "source_key"}.issubset(value):
            sources.append(CitationSource.from_artifact_dict(value))
    return sources


def _citation_result_from_artifact(artifact: Any) -> _CitationResultPayload | None:
    """Read the private payload produced by ``citation_result()``."""
    if not isinstance(artifact, dict):
        return None
    value = artifact.get(CITATION_RESULT_KEY)
    if not isinstance(value, dict):
        return None
    values = value.get("items")
    collection = value.get("collection")
    if not isinstance(values, list) or not isinstance(collection, bool):
        return None

    items: list[CitationResultItem] = []
    for value in values:
        if isinstance(value, CitationResultItem):
            items.append(value)
            continue
        if not isinstance(value, dict) or "value" not in value:
            return None
        source = value.get("source")
        if source is None:
            items.append(CitationResultItem(value=value["value"]))
            continue
        if isinstance(source, CitationSource):
            items.append(CitationResultItem(value=value["value"], source=source))
        elif isinstance(source, dict) and {"type", "source_key"}.issubset(source):
            items.append(
                CitationResultItem(
                    value=value["value"],
                    source=CitationSource.from_artifact_dict(source),
                )
            )
        else:
            return None
    return _CitationResultPayload(items=items, collection=collection)


def citation_result(
    *,
    value: Any | None = None,
    source: CitationSource | None = None,
    items: list[CitationResultItem] | None = None,
    content: Any = None,
    artifact: Any = None,
) -> tuple[Any, dict[str, Any]]:
    """Build a deferred LangChain ``content_and_artifact`` Citation result.

    ``content`` can preserve an existing Tool's exact content while ``items``
    carries the structured values used when Citation is enabled.
    """
    if items is None:
        if source is None:
            raise ValueError("citation_result requires source or items")
        resolved_items = [CitationResultItem(value=value, source=source)]
        resolved_content = value if content is None else content
    else:
        if source is not None:
            raise ValueError("citation_result accepts either source or items, not both")
        if not items:
            raise ValueError("citation_result items must not be empty")
        resolved_items = list(items)
        if not any(item.source is not None for item in resolved_items):
            raise ValueError("citation_result requires at least one citable item")
        resolved_content = (
            [item.value for item in resolved_items] if content is None else content
        )

    if isinstance(artifact, dict):
        result_artifact = dict(artifact)
    else:
        result_artifact = {ORIGINAL_ARTIFACT_KEY: artifact}
    result_artifact[CITATION_RESULT_KEY] = {
        "items": [
            {
                "value": item.value,
                "source": item.source.to_artifact_dict() if item.source else None,
            }
            for item in resolved_items
        ],
        "collection": items is not None,
    }
    return resolved_content, result_artifact


def materialize_citation_result(
    result: _CitationResultPayload,
    registry: CitationRegistry,
) -> str:
    """Inject registered Citation IDs while preserving result order and shape."""
    values: list[Any] = []
    for item in result.items:
        if item.source is None:
            values.append(item.value)
            continue
        source = registry.register(item.source)
        if source.id is None:
            raise ValueError("Citation source must have an ID")
        if isinstance(item.value, dict):
            values.append(
                {
                    "citation_id": source.id,
                    **{
                        key: value
                        for key, value in item.value.items()
                        if key != "citation_id"
                    },
                },
            )
        else:
            values.append({"citation_id": source.id, "content": item.value})

    value = values if result.collection else values[0]
    return (
        value
        if isinstance(value, str)
        else json.dumps(value, ensure_ascii=False, default=str)
    )


def attach_sources_to_artifact(
    artifact: Any,
    sources: list[CitationSource],
) -> dict[str, Any]:
    if isinstance(artifact, dict):
        merged = dict(artifact)
    else:
        merged = {ORIGINAL_ARTIFACT_KEY: artifact}
    merged.pop(CITATION_RESULT_KEY, None)
    merged[CITATION_SOURCES_KEY] = [source.to_artifact_dict() for source in sources]
    return merged


def public_artifact(artifact: Any) -> Any:
    if not isinstance(artifact, dict) or not {
        CITATION_SOURCES_KEY,
        CITATION_RESULT_KEY,
    }.intersection(artifact):
        return artifact
    if ORIGINAL_ARTIFACT_KEY in artifact:
        return artifact[ORIGINAL_ARTIFACT_KEY]
    return {
        key: value
        for key, value in artifact.items()
        if key
        not in {
            CITATION_SOURCES_KEY,
            CITATION_RESULT_KEY,
        }
    }
