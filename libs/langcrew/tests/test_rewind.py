from typing import Annotated, TypedDict

import pytest
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.memory.rewind import RewindError, rewind_compiled_graph


class State(TypedDict):
    messages: Annotated[list, add_messages]


def _echo_graph():
    graph = StateGraph(State)
    graph.add_node(
        "model",
        lambda state: {
            "messages": [
                AIMessage(
                    content="answer",
                    id=f"a{len([m for m in state['messages'] if isinstance(m, AIMessage)]) + 1}",
                )
            ]
        },
    )
    graph.add_edge(START, "model")
    graph.add_edge("model", END)
    return graph


def _nested_agent_graph(agent_node):
    agent = StateGraph(State)
    agent.add_node("model", agent_node)
    agent.add_edge(START, "model")
    agent.add_edge("model", END)
    root = StateGraph(State)
    root.add_node("agent", agent.compile(checkpointer=True, name="agent"))
    root.add_edge(START, "agent")
    root.add_edge("agent", END)
    return root


def _contents(messages):
    return [message.content for message in messages]


@pytest.mark.asyncio
async def test_rewind_keeps_previous_turn_then_replacement_invoke():
    saver = InMemorySaver()
    graph = _echo_graph().compile(checkpointer=saver)
    config = {"configurable": {"thread_id": "thread-1"}}
    await graph.ainvoke({"messages": [HumanMessage(content="first", id="u1")]}, config)
    await graph.ainvoke(
        {"messages": [HumanMessage(content="discarded", id="u2")]}, config
    )

    await rewind_compiled_graph(graph, "thread-1")

    state = await graph.aget_state(config)
    assert _contents(state.values["messages"]) == ["first", "answer"]

    await graph.ainvoke(
        {"messages": [HumanMessage(content="replacement", id="u3")]}, config
    )
    state = await graph.aget_state(config)
    assert _contents(state.values["messages"]) == [
        "first",
        "answer",
        "replacement",
        "answer",
    ]


@pytest.mark.asyncio
async def test_rewind_uses_latest_user_turn_without_content_matching():
    saver = InMemorySaver()
    graph = _echo_graph().compile(checkpointer=saver)
    config = {"configurable": {"thread_id": "thread-1"}}
    await graph.ainvoke({"messages": [HumanMessage(content="same", id="u0")]}, config)
    await graph.ainvoke({"messages": [HumanMessage(content="same", id="u1")]}, config)

    await rewind_compiled_graph(graph, "thread-1")

    state = await graph.aget_state(config)
    assert [
        message.id
        for message in state.values["messages"]
        if isinstance(message, HumanMessage)
    ] == ["u0"]


@pytest.mark.asyncio
async def test_first_turn_rewind_deletes_whole_thread():
    saver = InMemorySaver()
    graph = _echo_graph().compile(checkpointer=saver)
    config = {"configurable": {"thread_id": "thread-1"}}
    await graph.ainvoke({"messages": [HumanMessage(content="first", id="u1")]}, config)

    await rewind_compiled_graph(graph, "thread-1")

    state = await graph.aget_state(config)
    assert state.values == {}
    assert state.config["configurable"].get("checkpoint_id") is None


@pytest.mark.asyncio
async def test_first_turn_nested_graph_rewind_deletes_thread():
    saver = InMemorySaver()
    graph = _nested_agent_graph(
        lambda _state: {"messages": [AIMessage(content="agent-answer", id="a1")]}
    ).compile(checkpointer=saver)
    config = {"configurable": {"thread_id": "thread-1"}}
    await graph.ainvoke({"messages": [HumanMessage(content="first", id="u1")]}, config)

    await rewind_compiled_graph(graph, "thread-1")

    state = await graph.aget_state(config)
    assert state.values == {}


@pytest.mark.asyncio
async def test_rewind_updates_nested_agent_namespace():
    seen: list[list[str]] = []

    def agent_node(state):
        seen.append([message.content for message in state["messages"]])
        return {"messages": [AIMessage(content="agent-answer", id=f"a{len(seen)}")]}

    saver = InMemorySaver()
    graph = _nested_agent_graph(agent_node).compile(checkpointer=saver)
    config = {"configurable": {"thread_id": "thread-1"}}
    await graph.ainvoke({"messages": [HumanMessage(content="first", id="u1")]}, config)
    await graph.ainvoke(
        {"messages": [HumanMessage(content="discarded", id="u2")]}, config
    )

    await rewind_compiled_graph(graph, "thread-1")
    await graph.ainvoke(
        {"messages": [HumanMessage(content="replacement", id="u3")]}, config
    )

    assert seen[-1] == ["first", "agent-answer", "replacement"]


def _agent_crew(responses: list[str]) -> Crew:
    return Crew(
        agent=Agent(
            prompt="You are helpful.",
            llm=FakeListChatModel(responses=responses),
            name="assistant",
        ),
        memory=True,
    )


@pytest.mark.asyncio
async def test_crew_agent_rewind_keeps_previous_turn_then_replacement_invoke():
    crew = _agent_crew(["hello-1", "hello-2", "hello-3"])
    config = {"configurable": {"thread_id": "agent-thread"}}
    await crew.ainvoke(
        {"messages": [HumanMessage(content="first", id="u1")]},
        config,
    )
    await crew.ainvoke(
        {"messages": [HumanMessage(content="second", id="u2")]},
        config,
    )

    await crew.rewind_thread("agent-thread")

    async with crew.get_async_compiled_graph() as compiled:
        state = await compiled.aget_state(config)
        assert _contents(state.values["messages"]) == ["first", "hello-1"]
        nested_heads: dict[str, list] = {}
        async for checkpoint_tuple in compiled.checkpointer.alist(config):
            namespace = (
                checkpoint_tuple.config.get("configurable", {}).get("checkpoint_ns")
                or ""
            )
            if not namespace or namespace in nested_heads:
                continue
            nested_heads[namespace] = list(
                (checkpoint_tuple.checkpoint.get("channel_values") or {}).get(
                    "messages"
                )
                or []
            )
        assert nested_heads
        for messages in nested_heads.values():
            assert "u2" not in {
                str(message.id) for message in messages if getattr(message, "id", None)
            }
            assert "second" not in _contents(messages)
            assert "hello-2" not in _contents(messages)

    result = await crew.ainvoke(
        {"messages": [HumanMessage(content="replacement", id="u3")]},
        config,
    )
    assert _contents(result["messages"]) == [
        "first",
        "hello-1",
        "replacement",
        "hello-3",
    ]


@pytest.mark.asyncio
async def test_crew_agent_first_turn_rewind_deletes_thread():
    crew = _agent_crew(["hello-1"])
    config = {"configurable": {"thread_id": "agent-thread"}}
    await crew.ainvoke(
        {"messages": [HumanMessage(content="first", id="u1")]},
        config,
    )

    await crew.rewind_thread("agent-thread")

    async with crew.get_async_compiled_graph() as compiled:
        state = await compiled.aget_state(config)
    assert state.values == {}
    assert state.config["configurable"].get("checkpoint_id") is None


@pytest.mark.asyncio
async def test_crew_rewind_uses_owned_in_memory_checkpointer():
    crew = Crew(graph=_echo_graph(), memory=True)
    config = {"configurable": {"thread_id": "crew-thread"}}
    await crew.ainvoke(
        {"messages": [HumanMessage(content="first", id="u1")]},
        config,
    )
    await crew.ainvoke(
        {"messages": [HumanMessage(content="discarded", id="u2")]},
        config,
    )

    await crew.rewind_thread("crew-thread")

    async with crew.get_async_compiled_graph() as compiled:
        state = await compiled.aget_state(config)
    assert _contents(state.values["messages"]) == ["first", "answer"]


@pytest.mark.asyncio
async def test_rewind_without_checkpointer_raises():
    graph = _echo_graph().compile()
    with pytest.raises(RewindError, match="Checkpoint-backed memory is required"):
        await rewind_compiled_graph(graph, "thread-1")
