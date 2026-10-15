from __future__ import annotations

from ..citation.artifact import CITATION_SOURCES_KEY
from ..citation.types import CitationSource
from .protocol import UserMessageRequest


def attach_citation_sources_to_request(
    request: UserMessageRequest,
    sources: list[CitationSource],
) -> UserMessageRequest:
    """Return a request carrying static Citation sources for its HumanMessage."""
    if not sources:
        return request
    metadata = dict(request.metadata or {})
    metadata[CITATION_SOURCES_KEY] = [source.to_artifact_dict() for source in sources]
    return request.model_copy(update={"metadata": metadata})
