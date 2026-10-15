"""
Unit tests for agent-only streaming behavior in Crew.
"""

from unittest.mock import Mock, patch

import pytest

from langcrew import Agent, Crew


def _build_agent(mock_llm) -> Agent:
    return Agent(
        name="stream_agent",
        prompt="You are a streaming specialist.",
        llm=mock_llm,
    )


async def _agen(items):
    for item in items:
        yield item


def test_crew_stream_yields_chunks(mock_llm):
    """stream should proxy chunks from compiled graph."""
    crew = Crew(agent=_build_agent(mock_llm))
    chunks = [{"step": 1}, {"step": 2}]

    mock_graph = Mock()
    mock_graph.stream.return_value = iter(chunks)

    with patch.object(Crew, "_get_compiled_graph", return_value=mock_graph):
        output = list(crew.stream({"messages": []}))

    assert output == chunks
    mock_graph.stream.assert_called_once()


@pytest.mark.asyncio
async def test_crew_astream_yields_chunks(mock_llm):
    """astream should proxy async chunks from compiled graph."""
    crew = Crew(agent=_build_agent(mock_llm))
    chunks = [{"step": 1}, {"step": 2}]

    mock_graph = Mock()
    mock_graph.astream = Mock(return_value=_agen(chunks))

    with patch.object(Crew, "_get_compiled_graph", return_value=mock_graph):
        output = [chunk async for chunk in crew.astream({"messages": []})]

    assert output == chunks
    mock_graph.astream.assert_called_once()


@pytest.mark.asyncio
async def test_crew_astream_events_yields_events(mock_llm):
    """astream_events should proxy async event stream from compiled graph."""
    crew = Crew(agent=_build_agent(mock_llm))
    events = [
        {"event": "on_chain_start", "name": "crew"},
        {"event": "on_chain_end", "name": "crew"},
    ]

    mock_graph = Mock()
    mock_graph.astream_events = Mock(return_value=_agen(events))

    with patch.object(Crew, "_get_compiled_graph", return_value=mock_graph):
        output = [event async for event in crew.astream_events({"messages": []})]

    assert output == events
    mock_graph.astream_events.assert_called_once()
