from __future__ import annotations

from dataclasses import dataclass, field

from .ids import citation_source_id, is_citation_source_id
from .types import CitationSource


@dataclass
class CitationRegistry:
    """Model-call-local registry of available Citation sources."""

    _sources_by_id: dict[str, CitationSource] = field(default_factory=dict)
    _ids_by_key: dict[tuple[str, str], str] = field(default_factory=dict)

    def __init__(self, initial_sources: list[CitationSource] | None = None):
        self._sources_by_id = {}
        self._ids_by_key = {}
        self.register_many(initial_sources or [])

    def register(self, source: CitationSource) -> CitationSource:
        key = (source.type, source.source_key)
        existing_id = self._ids_by_key.get(key)
        if existing_id is not None:
            if source.id is not None and source.id != existing_id:
                raise ValueError(
                    f"Citation source {key!r} changed ID from "
                    f"{existing_id} to {source.id}"
                )
            existing = self._sources_by_id[existing_id]
            current_data = {
                name: value
                for name, value in source.data.items()
                if value not in (None, "", [], {})
            }
            updated = CitationSource(
                id=existing_id,
                type=existing.type,
                source_key=existing.source_key,
                data={**existing.data, **current_data},
            )
            self._sources_by_id[existing_id] = updated
            return updated

        source_id = source.id or citation_source_id(source.type, source.source_key)
        if not is_citation_source_id(source_id):
            raise ValueError(f"Invalid citation source ID: {source_id}")
        existing_source = self._sources_by_id.get(source_id)
        if existing_source is not None:
            raise ValueError(
                "Citation source ID collision: "
                f"{source_id} maps to both "
                f"{(existing_source.type, existing_source.source_key)!r} and {key!r}"
            )
        registered = source.with_id(source_id)
        self._sources_by_id[source_id] = registered
        self._ids_by_key[key] = source_id
        return registered

    def register_many(self, sources: list[CitationSource]) -> list[CitationSource]:
        return [self.register(source) for source in sources]

    def resolve(self, source_ids: list[str]) -> list[CitationSource]:
        resolved: list[CitationSource] = []
        seen: set[str] = set()
        for source_id in source_ids:
            if source_id in seen:
                continue
            seen.add(source_id)
            source = self._sources_by_id.get(source_id)
            if source is not None:
                resolved.append(source)
        return resolved

    def values(self) -> list[CitationSource]:
        return list(self._sources_by_id.values())
