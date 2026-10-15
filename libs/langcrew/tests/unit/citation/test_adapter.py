from unittest.mock import AsyncMock

import pytest
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)

from langcrew import Agent, Crew
from langcrew.citation import (
    CitationConfig,
    CitationMiddleware,
    CitationSource,
    attach_citation_sources,
    citation_source_id,
)
from langcrew.citation.artifact import CITATION_SOURCES_KEY, attach_sources_to_artifact
from langcrew.middleware.large_tool_result import LargeToolResultMiddleware
from langcrew.web import attach_citation_sources_to_request
from langcrew.web.adapter import LangGraphAdapter
from langcrew.web.protocol import MessageType, UserMessageRequest
from langcrew.workflow.builder import WorkflowBuilder


def _adapter() -> LangGraphAdapter:
    return LangGraphAdapter(
        Crew(
            agent=Agent(llm=FakeListChatModel(responses=["ok"])),
            citation=True,
        )
    )


def test_model_start_builds_run_registry_for_stream_and_result():
    adapter = _adapter()
    source = CitationSource(
        type="web",
        source_key="https://example.com/",
        data={"title": "Example", "url": "https://example.com/"},
    )
    source_id = citation_source_id(source.type, source.source_key)
    missing_id = citation_source_id("web", "missing")
    tool_message = ToolMessage(
        content=f'{{"citation_id":"{source_id}"}}',
        tool_call_id="call-1",
        artifact=attach_sources_to_artifact(None, [source.with_id(source_id)]),
    )
    citation_runs = {}
    adapter._handle_model_start(
        {
            "run_id": "run-1",
            "data": {
                "input": {"messages": [[HumanMessage(content="Q"), tool_message]]}
            },
        },
        citation_runs,
    )

    first = adapter._handle_model_stream(
        {
            "run_id": "run-1",
            "data": {"chunk": AIMessageChunk(content="Claim [[cita")},
        },
        "session-1",
        "response-1",
        citation_runs,
    )
    second = adapter._handle_model_stream(
        {
            "run_id": "run-1",
            "data": {
                "chunk": AIMessageChunk(content=f"tion:{source_id},{missing_id}]]")
            },
        },
        "session-1",
        "response-1",
        citation_runs,
    )
    final = adapter._handle_model_end(
        {
            "run_id": "run-1",
            "data": {
                "output": AIMessage(
                    content=f"Claim [[citation:{source_id},{missing_id}]]"
                )
            },
        },
        "session-1",
        "response-1",
        citation_runs,
    )

    assert first.content == "Claim "
    assert second.content == f"[[citation:{source_id}]]"
    assert second.detail["citation_sources"][0]["id"] == source_id
    assert final[0].type == MessageType.MESSAGE_RESULT
    assert final[0].detail["full_content"] == f"Claim [[citation:{source_id}]]"
    assert final[0].detail["citation_sources"] == [
        source.with_id(source_id).to_public_dict()
    ]
    assert "run-1" not in citation_runs


@pytest.mark.asyncio
async def test_real_event_stream_rebuilds_sources_from_model_input():
    source = CitationSource(
        type="memory",
        source_key="preference",
        data={"content": "Reply concisely"},
    )
    source_id = citation_source_id(source.type, source.source_key)
    agent = Agent(
        llm=FakeListChatModel(responses=[f"Answer [[citation:{source_id}]]"]),
        prompt=attach_citation_sources(SystemMessage(content="Use memory"), [source]),
    )
    adapter = LangGraphAdapter(Crew(agent=agent, citation=True))

    messages = [
        message
        async for message in adapter.stream(
            "Question",
            session_id="session-1",
        )
    ]

    text_messages = [
        message for message in messages if message.type == MessageType.TEXT
    ]
    result = next(
        message for message in messages if message.type == MessageType.MESSAGE_RESULT
    )
    assert any(
        message.detail
        and message.detail.get("citation_sources", [{}])[0].get("id") == source_id
        for message in text_messages
    )
    assert result.detail["full_content"] == f"Answer [[citation:{source_id}]]"
    assert result.detail["citation_sources"] == [
        source.with_id(source_id).to_public_dict()
    ]


def test_model_start_reads_system_and_human_message_sources():
    adapter = _adapter()
    memory = CitationSource(type="memory", source_key="memory-one")
    file = CitationSource(type="file", source_key="file-one")
    messages = [
        attach_citation_sources(SystemMessage(content="Memory"), [memory]),
        attach_citation_sources(HumanMessage(content="File"), [file]),
    ]
    citation_runs = {}

    adapter._handle_model_start(
        {"run_id": "run-1", "data": {"input": {"messages": [messages]}}},
        citation_runs,
    )

    state = citation_runs["run-1"]
    assert len(state.registry.values()) == 2


def test_request_metadata_is_attached_to_the_new_human_message():
    adapter = _adapter()
    source = CitationSource(
        id=citation_source_id("file", "file-one"),
        type="file",
        source_key="file-one",
    )

    value = adapter._prepare_input(
        "Question",
        None,
        {CITATION_SOURCES_KEY: [source.to_artifact_dict()]},
    )

    assert value["messages"][0].additional_kwargs[CITATION_SOURCES_KEY] == [
        source.to_artifact_dict()
    ]


def test_request_helper_hides_private_metadata_contract():
    request = UserMessageRequest(content="Question", metadata={"public": "value"})
    source = CitationSource(type="file", source_key="file-one")

    prepared = attach_citation_sources_to_request(request, [source])

    assert prepared is not request
    assert prepared.metadata["public"] == "value"
    assert prepared.metadata[CITATION_SOURCES_KEY] == [source.to_artifact_dict()]


def test_public_tool_output_hides_private_sources_only():
    source = CitationSource(type="web", source_key="one")
    message = ToolMessage(
        content="result",
        tool_call_id="call-1",
        artifact=attach_sources_to_artifact({"visible": "value"}, [source]),
    )

    public = _adapter()._public_tool_output(message)

    assert public.content == message.content
    assert public.artifact == {"visible": "value"}


def test_crew_injects_one_citation_middleware():
    large_result = LargeToolResultMiddleware(backend=AsyncMock())
    agent = Agent(
        llm=FakeListChatModel(responses=["ok"]),
        middleware=[large_result],
    )
    crew = Crew(agent=agent, citation=CitationConfig(enabled=True))

    assert crew.citation_config.enabled
    assert (
        len([item for item in agent.middleware if isinstance(item, CitationMiddleware)])
        == 1
    )
    assert agent.middleware == (large_result, agent.middleware[-1])
    assert isinstance(agent.middleware[-1], CitationMiddleware)


def test_workflow_builder_propagates_citation_config():
    crew_config = CitationConfig(enabled=True, prompt="Custom rules")
    builder = WorkflowBuilder(
        {
            "name": "citation-workflow",
            "nodes": [
                {
                    "id": "start",
                    "node_type": "builtins.Start",
                    "label": "Start",
                    "config": {},
                },
                {
                    "id": "agent",
                    "node_type": "builtins.Agent",
                    "label": "Agent",
                    "config": {},
                },
            ],
            "edges": [
                {
                    "id": "edge",
                    "source_node_id": "start",
                    "target_node_id": "agent",
                }
            ],
        },
        citation=crew_config,
    )

    builder.build_graph()

    assert builder.nodes["agent"].citation_default is crew_config
