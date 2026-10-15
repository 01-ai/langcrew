import asyncio

import pytest
from langchain.agents import create_agent
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.graph.state import CompiledStateGraph

from langcrew.controllable import StopReason
from langcrew.web import create_langgraph_server
from langcrew.web.adapter import LangGraphAdapter
from langcrew.web.protocol import MessageType, StopRequest, TaskExecutionStatus
from langcrew.web.server import AdapterServer


def _model_graph(response: str = "hello") -> CompiledStateGraph:
    model = FakeListChatModel(responses=[response])

    async def call_model(state: MessagesState):
        return {"messages": [await model.ainvoke(state["messages"])]}

    builder = StateGraph(MessagesState)
    builder.add_node("model", call_model)
    builder.add_edge(START, "model")
    builder.add_edge("model", END)
    return builder.compile()


@pytest.mark.asyncio
async def test_langchain_create_agent_streams_through_compiled_graph_adapter():
    graph = create_agent(model=FakeListChatModel(responses=["hello"]))
    adapter = LangGraphAdapter(compiled_graph=graph)

    messages = [
        message
        async for message in adapter.stream(content="hi", session_id="session-1")
    ]

    assert isinstance(graph, CompiledStateGraph)
    assert (
        "".join(
            message.content
            for message in messages
            if message.type == MessageType.TEXT
            and message.detail
            and message.detail.get("streaming")
        )
        == "hello"
    )
    assert messages[-2].type == MessageType.MESSAGE_RESULT
    assert messages[-2].detail["full_content"] == "hello"
    assert messages[-1].type == MessageType.FINISH_REASON
    assert messages[-1].detail["status"] == TaskExecutionStatus.COMPLETED


@pytest.mark.asyncio
async def test_native_langgraph_streams_standard_model_events():
    adapter = LangGraphAdapter(compiled_graph=_model_graph("native"))

    messages = [
        message
        async for message in adapter.stream(content="hi", session_id="session-1")
    ]

    assert (
        "".join(
            message.content
            for message in messages
            if message.type == MessageType.TEXT
            and message.detail
            and message.detail.get("streaming")
        )
        == "native"
    )
    assert messages[-1].type == MessageType.FINISH_REASON


@pytest.mark.asyncio
async def test_compiled_graph_reuses_session_id_as_checkpointer_thread_id():
    message_counts: list[int] = []

    async def reply(state: MessagesState):
        message_counts.append(len(state["messages"]))
        return {"messages": [AIMessage(content="ok")]}

    builder = StateGraph(MessagesState)
    builder.add_node("reply", reply)
    builder.add_edge(START, "reply")
    builder.add_edge("reply", END)
    graph = builder.compile(checkpointer=InMemorySaver())
    adapter = LangGraphAdapter(compiled_graph=graph)

    async for _ in adapter.stream("first", session_id="shared-session"):
        pass
    async for _ in adapter.stream("second", session_id="shared-session"):
        pass

    assert message_counts == [1, 3]


@pytest.mark.asyncio
async def test_existing_stop_api_cancels_compiled_graph_by_session_id():
    started = asyncio.Event()

    async def slow_node(state: MessagesState):
        started.set()
        await asyncio.Event().wait()

    builder = StateGraph(MessagesState)
    builder.add_node("slow", slow_node)
    builder.add_edge(START, "slow")
    builder.add_edge("slow", END)
    server = AdapterServer(compiled_graph=builder.compile())

    async def consume():
        return [
            message
            async for message in server.adapter.stream(
                content="wait",
                session_id="session-to-stop",
            )
        ]

    consumer = asyncio.create_task(consume())
    await asyncio.wait_for(started.wait(), timeout=1)

    assert await server.stop("session-to-stop", reason=StopReason.USER_CANCEL) is True
    messages = await asyncio.wait_for(consumer, timeout=1)

    assert messages[-1].type == MessageType.FINISH_REASON
    assert messages[-1].detail["status"] == TaskExecutionStatus.CANCELLED
    assert await server.stop("missing-session") is False


def test_create_langgraph_server_accepts_only_compiled_graphs():
    server = create_langgraph_server(_model_graph())

    assert {route.path for route in server.app.routes} >= {
        "/api/v1/stream",
        "/api/v1/stop",
    }

    with pytest.raises(TypeError, match="CompiledStateGraph"):
        create_langgraph_server(StateGraph(MessagesState))


def test_existing_positional_stream_reasoning_argument_remains_compatible():
    crew = object()

    adapter = LangGraphAdapter(crew, False)
    server = AdapterServer(crew, False)

    assert adapter.crew is crew
    assert adapter.stream_reasoning is False
    assert server.crew is crew
    assert server.adapter.stream_reasoning is False


@pytest.mark.parametrize("reason", list(StopReason))
def test_stop_request_parses_canonical_reasons(reason: StopReason):
    request = StopRequest(session_id="session-1", reason=reason.value)

    assert request.reason is reason


@pytest.mark.parametrize(
    "payload",
    [
        {"session_id": "session-1"},
        {"session_id": "session-1", "reason": None},
        {"session_id": "session-1", "reason": ""},
        {"session_id": "session-1", "reason": "User stopped"},
    ],
)
def test_stop_request_normalizes_legacy_user_cancel_reason(payload: dict):
    request = StopRequest.model_validate(payload)

    assert request.reason is StopReason.USER_CANCEL


def test_stop_request_rejects_unknown_reason():
    with pytest.raises(ValueError, match="Input should be"):
        StopRequest(session_id="session-1", reason="unknown")


@pytest.mark.asyncio
async def test_adapter_server_stop_returns_false_when_adapter_fails(monkeypatch):
    server = AdapterServer(object())

    async def fail_to_stop(session_id: str, reason: StopReason) -> bool:
        raise RuntimeError("stop failed")

    monkeypatch.setattr(server.adapter, "stop", fail_to_stop)

    assert await server.stop("session-1") is False
