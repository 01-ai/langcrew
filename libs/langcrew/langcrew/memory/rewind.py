"""Rewind a Crew thread via LangGraph time travel."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.base import CheckpointTuple, create_checkpoint
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import StateSnapshot


class RewindError(RuntimeError):
    """Raised when a checkpoint cannot be rewound safely."""


def _snapshot_messages(snapshot: StateSnapshot) -> list[Any]:
    """Messages from Pregel history, used to find the discarded HumanMessage by id."""
    return list(snapshot.values.get("messages") or [])


def _message_ids(messages: list[Any]) -> set[str]:
    """Stable ids only; rewind matches the latest HumanMessage by id, not content."""
    return {str(message.id) for message in messages if getattr(message, "id", None)}


def _latest_human_message_id(messages: list[Any]) -> str:
    """Id of the last HumanMessage in the live root snapshot."""
    human_messages = [
        message for message in messages if isinstance(message, HumanMessage)
    ]
    if not human_messages:
        raise RewindError("Current checkpoint has no HumanMessage")
    target = human_messages[-1]
    if not target.id:
        raise RewindError("Current HumanMessage has no stable LangChain message ID")
    return str(target.id)


def _has_human_message(messages: list[Any]) -> bool:
    """True once a checkpoint contains a HumanMessage (not empty __start__)."""
    return any(isinstance(message, HumanMessage) for message in messages)


def _prefix_from_snapshots(
    history: list[StateSnapshot], target_id: str
) -> StateSnapshot | None:
    """Finished root snapshot before the discarded HumanMessage, or None to delete the thread.

    History is newest-first. Prefer next==() so the fork is a completed turn, not
    a mid-superstep snapshot. No prior HumanMessage means this is the first turn.
    """
    without_target = []
    for snapshot in history:
        messages = _snapshot_messages(snapshot)
        if target_id not in _message_ids(messages) and _has_human_message(messages):
            without_target.append(snapshot)
    if not without_target:
        return None
    return next(
        (snapshot for snapshot in without_target if snapshot.next == ()),
        without_target[0],
    )


def _prefix_from_tuples(
    checkpoints: list[CheckpointTuple], target_id: str
) -> CheckpointTuple | None:
    """Nested live-head candidate before the discarded HumanMessage.

    alist is newest-first. Prefer a prefix that still has a HumanMessage; if the
    nested run started on the discarded HumanMessage, fork the empty snapshot so
    that namespace is no longer the discarded messages.
    """
    without_target: list[CheckpointTuple] = []
    with_human_message: list[CheckpointTuple] = []
    for checkpoint_tuple in checkpoints:
        messages = list(
            (checkpoint_tuple.checkpoint.get("channel_values") or {}).get("messages")
            or []
        )
        if target_id in _message_ids(messages):
            continue
        without_target.append(checkpoint_tuple)
        if _has_human_message(messages):
            with_human_message.append(checkpoint_tuple)
    if with_human_message:
        return with_human_message[0]
    return without_target[0] if without_target else None


async def rewind_compiled_graph(
    graph: CompiledStateGraph,
    thread_id: str,
) -> None:
    """Fork the compiled graph onto the checkpoint before the latest HumanMessage."""
    checkpointer = graph.checkpointer
    if checkpointer is None or isinstance(checkpointer, bool):
        raise RewindError("Checkpoint-backed memory is required for rewind")

    root_config = {"configurable": {"thread_id": thread_id}}
    root_history = [
        snapshot async for snapshot in graph.aget_state_history(root_config)
    ]
    if not root_history:
        return

    target_id = _latest_human_message_id(_snapshot_messages(root_history[0]))
    root_prefix = _prefix_from_snapshots(root_history, target_id)
    if root_prefix is None:
        await checkpointer.adelete_thread(thread_id)
        return

    nested: dict[str, list[CheckpointTuple]] = {}
    async for checkpoint_tuple in checkpointer.alist(root_config):
        namespace = (
            checkpoint_tuple.config.get("configurable", {}).get("checkpoint_ns") or ""
        )
        if namespace:
            nested.setdefault(namespace, []).append(checkpoint_tuple)

    # Inherited create_agent runs (agent__name:<task-id>) are not on
    # get_subgraphs(), so Pregel aupdate_state cannot fork them. aput works
    # for both those namespaces and registered subgraphs.
    for checkpoints in nested.values():
        prefix = _prefix_from_tuples(checkpoints, target_id)
        if prefix is None:
            continue
        new_checkpoint = create_checkpoint(prefix.checkpoint, None, step=0)
        await checkpointer.aput(
            prefix.config,
            new_checkpoint,
            dict(prefix.metadata or {}),
            new_checkpoint["channel_versions"],
        )

    await graph.aupdate_state(root_prefix.config, values={})


__all__ = ["RewindError", "rewind_compiled_graph"]
