from __future__ import annotations

from langchain_core.messages import BaseMessage

from .artifact import CITATION_SOURCES_KEY
from .registry import CitationRegistry
from .types import CitationSource


def sources_from_message(message: BaseMessage) -> list[CitationSource]:
    """Read private initial Citation sources persisted with a message."""
    values = message.additional_kwargs.get(CITATION_SOURCES_KEY)
    if not isinstance(values, list):
        return []

    sources: list[CitationSource] = []
    for value in values:
        if isinstance(value, CitationSource):
            sources.append(value)
        elif isinstance(value, dict) and {"type", "source_key"}.issubset(value):
            sources.append(CitationSource.from_artifact_dict(value))
    return sources


def attach_citation_sources(
    message: BaseMessage,
    sources: list[CitationSource],
) -> BaseMessage:
    """Attach complete private Citation sources to their evidence message."""
    registry = CitationRegistry(sources_from_message(message))
    registry.register_many(sources)
    sources_by_identity = {
        (source.type, source.source_key): source for source in registry.values()
    }
    additional_kwargs = {
        **message.additional_kwargs,
        CITATION_SOURCES_KEY: [
            source.to_artifact_dict() for source in sources_by_identity.values()
        ],
    }
    return message.model_copy(update={"additional_kwargs": additional_kwargs})
