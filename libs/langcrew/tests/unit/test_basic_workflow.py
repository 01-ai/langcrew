"""
Unit tests for basic agent-only LangCrew workflow behavior.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from langcrew import Agent, Crew


def _build_agent(mock_llm) -> Agent:
    return Agent(
        name="basic_agent",
        prompt="You are a workflow specialist focused on {topic}.",
        llm=mock_llm,
    )


def test_crew_requires_execution_source():
    """Crew must be initialized with agent/workflow/graph."""
    with pytest.raises(ValueError, match="Must provide at least one of"):
        Crew()


def test_crew_invoke_executes_graph(mock_llm):
    """invoke should execute the compiled graph."""
    agent = _build_agent(mock_llm)
    crew = Crew(agent=agent)

    mock_graph = Mock()
    mock_graph.invoke.return_value = {"status": "ok"}

    with patch.object(Crew, "_get_compiled_graph", return_value=mock_graph):
        result = crew.invoke({"messages": []})

    assert result == {"status": "ok"}
    mock_graph.invoke.assert_called_once()


@pytest.mark.asyncio
async def test_crew_ainvoke_uses_compiled_graph(mock_llm):
    """ainvoke should call the compiled async graph."""
    agent = _build_agent(mock_llm)
    crew = Crew(agent=agent)

    mock_graph = Mock()
    mock_graph.ainvoke = AsyncMock(return_value={"status": "async_ok"})

    with patch.object(Crew, "_get_compiled_graph", return_value=mock_graph):
        result = await crew.ainvoke({"messages": []})

    assert result == {"status": "async_ok"}
    mock_graph.ainvoke.assert_awaited_once()


def test_get_agent_by_name_returns_agent(mock_llm):
    """Crew should resolve agents by configured name."""
    agent = _build_agent(mock_llm)
    crew = Crew(agent=agent)

    resolved = crew.get_agent_by_name("basic_agent")
    assert resolved is agent


def test_get_compiled_graph_uses_sequential_builder(mock_llm):
    """Crew graph selection should use sequential builder for single agent."""
    agent = _build_agent(mock_llm)
    crew = Crew(agent=agent)

    sentinel_graph = object()
    with patch.object(
        Crew, "_build_agent_sequential_graph", return_value=sentinel_graph
    ) as mock_sequential:
        result = crew._get_compiled_graph()

    assert result is sentinel_graph
    mock_sequential.assert_called_once_with(None, None, is_async=False)
