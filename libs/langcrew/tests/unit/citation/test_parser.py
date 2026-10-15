import pytest

from langcrew.citation import (
    CitationRegistry,
    CitationSource,
    CitationStreamParser,
    citation_source_id,
    filter_citations,
    normalize_citation_content,
)

ONE_ID = citation_source_id("web", "one")
TWO_ID = citation_source_id("knowledge", "two")
MISSING_ID = citation_source_id("web", "missing")


def _registry() -> CitationRegistry:
    return CitationRegistry([
        CitationSource(type="web", source_key="one"),
        CitationSource(type="knowledge", source_key="two"),
    ])


def test_normalizes_markers_and_removes_unknown_ids():
    result = normalize_citation_content(
        f"Answer [[citation:{ONE_ID},{MISSING_ID},{TWO_ID},{ONE_ID}]]",
        _registry(),
    )

    assert result.content == f"Answer [[citation:{ONE_ID},{TWO_ID}]]"
    assert [source["id"] for source in result.citation_sources] == [ONE_ID, TWO_ID]


def test_normalizes_shorthand_and_removes_malformed_markers():
    result = normalize_citation_content(
        f"Answer [[{ONE_ID},{MISSING_ID}]] [[citation:C_BAD]]",
        _registry(),
    )

    assert result.content == f"Answer [[citation:{ONE_ID}]] "
    assert [source["id"] for source in result.citation_sources] == [ONE_ID]


def test_stream_parser_buffers_split_marker_and_emits_sources_once():
    parser = CitationStreamParser(_registry())

    first = parser.feed("Answer [[cita")
    second = parser.feed(f"tion:{ONE_ID},{TWO_ID}]] next")
    third = parser.feed(f" again [[citation:{ONE_ID}]]")

    assert first.content == "Answer "
    assert second.content == f"[[citation:{ONE_ID},{TWO_ID}]] next"
    assert [source["id"] for source in second.citation_sources] == [ONE_ID, TWO_ID]
    assert third.content == f" again [[citation:{ONE_ID}]]"
    assert third.citation_sources == []


def test_stream_parser_preserves_ordinary_double_brackets():
    parser = CitationStreamParser(_registry())

    first = parser.feed("Use [[")
    second = parser.feed("1]] here")

    assert first.content == "Use "
    assert second.content == "[[1]] here"


def test_registry_merges_non_empty_fields_by_source_identity():
    registry = CitationRegistry()
    first = registry.register(
        CitationSource(type="web", source_key="one", data={"title": "First"})
    )
    second = registry.register(
        CitationSource(
            type="web",
            source_key="one",
            data={"title": "", "url": "https://example.com"},
        )
    )

    assert first.id == second.id == ONE_ID
    assert registry.resolve([ONE_ID])[0].data == {
        "title": "First",
        "url": "https://example.com",
    }


def test_registry_rejects_changed_id_and_collisions():
    registry = CitationRegistry([CitationSource(type="web", source_key="one")])
    with pytest.raises(ValueError, match="changed ID"):
        registry.register(
            CitationSource(
                id=citation_source_id("web", "different"),
                type="web",
                source_key="one",
            )
        )


def test_protocol_fields_cannot_be_overridden_by_source_data():
    source = CitationSource(
        id=ONE_ID,
        type="web",
        source_key="one",
        data={"id": "fake", "type": "memory", "title": "Example"},
    )

    assert source.to_public_dict() == {
        "id": ONE_ID,
        "type": "web",
        "title": "Example",
    }


def test_filter_citations_applies_allowlist_without_execution_state():
    sources = [
        {"id": ONE_ID, "type": "web", "title": "Public"},
        {"id": TWO_ID, "type": "knowledge", "title": "Private"},
    ]

    result = filter_citations(
        f"Answer [[citation:{ONE_ID},{TWO_ID}]]",
        sources,
        {ONE_ID},
    )

    assert result.content == f"Answer [[citation:{ONE_ID}]]"
    assert result.citation_sources == [sources[0]]
