from __future__ import annotations

from .ids import is_citation_source_id
from .registry import CitationRegistry
from .types import CitationParseResult, CitationSource

MARKER_PREFIX = "[[citation:"
SHORTHAND_MARKER_PREFIX = "[[C_"
MARKER_SUFFIX = "]]"
_MARKER_PREFIXES = (MARKER_PREFIX, SHORTHAND_MARKER_PREFIX)


def _parse_source_ids(raw_ids: str) -> list[str]:
    source_ids: list[str] = []
    for part in raw_ids.split(","):
        source_id = part.strip()
        if not is_citation_source_id(source_id):
            continue
        if source_id not in source_ids:
            source_ids.append(source_id)
    return source_ids


def _normalize_complete_marker(
    raw_ids: str,
    registry: CitationRegistry,
) -> tuple[str, list[dict]]:
    resolved = registry.resolve(_parse_source_ids(raw_ids))
    if not resolved:
        return "", []
    ids = [source.id for source in resolved if source.id is not None]
    return (
        f"{MARKER_PREFIX}{','.join(ids)}{MARKER_SUFFIX}",
        [source.to_public_dict() for source in resolved],
    )


def normalize_citation_content(
    content: str,
    registry: CitationRegistry,
) -> CitationParseResult:
    parser = CitationStreamParser(registry)
    result = parser.feed(content)
    parser.discard_buffer()
    return result


def filter_citations(
    content: str,
    sources: list[dict],
    allowed_source_ids: set[str],
) -> CitationParseResult:
    """Filter Citation markers using an application-provided ID allowlist."""
    registry = CitationRegistry()
    for value in sources:
        source_id = value.get("id") if isinstance(value, dict) else None
        source_type = value.get("type") if isinstance(value, dict) else None
        if (
            not isinstance(source_id, str)
            or source_id not in allowed_source_ids
            or not isinstance(source_type, str)
        ):
            continue
        try:
            registry.register(
                CitationSource(
                    id=source_id,
                    type=source_type,
                    source_key=source_id,
                    data={
                        key: item
                        for key, item in value.items()
                        if key not in {"id", "type"}
                    },
                )
            )
        except ValueError:
            continue
    return normalize_citation_content(content, registry)


class CitationStreamParser:
    """Incrementally parse citation markers split across model chunks."""

    def __init__(self, registry: CitationRegistry):
        self._registry = registry
        self._buffer = ""
        self._used_source_ids: set[str] = set()

    def feed(self, chunk: str) -> CitationParseResult:
        data = self._buffer + chunk
        self._buffer = ""
        output: list[str] = []
        sources_by_id: dict[str, dict] = {}

        while data:
            marker_match = self._next_marker(data)
            if marker_match is None:
                hold_length = self._partial_prefix_length(data)
                if hold_length:
                    output.append(data[:-hold_length])
                    self._buffer = data[-hold_length:]
                else:
                    output.append(data)
                break

            marker_index, marker_prefix = marker_match
            output.append(data[:marker_index])
            marker_end = data.find(MARKER_SUFFIX, marker_index + len(marker_prefix))
            if marker_end < 0:
                self._buffer = data[marker_index:]
                break

            raw_ids_start = (
                marker_index + len(MARKER_PREFIX)
                if marker_prefix == MARKER_PREFIX
                else marker_index + len("[[")
            )
            raw_ids = data[raw_ids_start:marker_end]
            marker, sources = _normalize_complete_marker(raw_ids, self._registry)
            output.append(marker)
            for source in sources:
                source_id = source["id"]
                if source_id not in self._used_source_ids:
                    self._used_source_ids.add(source_id)
                    sources_by_id[source_id] = source
            data = data[marker_end + len(MARKER_SUFFIX) :]

        return CitationParseResult(
            content="".join(output), citation_sources=list(sources_by_id.values())
        )

    def discard_buffer(self) -> None:
        self._buffer = ""

    @staticmethod
    def _next_marker(value: str) -> tuple[int, str] | None:
        matches = [
            (index, prefix)
            for prefix in _MARKER_PREFIXES
            if (index := value.find(prefix)) >= 0
        ]
        return min(matches, key=lambda match: match[0]) if matches else None

    @staticmethod
    def _partial_prefix_length(value: str) -> int:
        return max(
            (
                length
                for prefix in _MARKER_PREFIXES
                for length in range(min(len(value), len(prefix) - 1), 0, -1)
                if value.endswith(prefix[:length])
            ),
            default=0,
        )
