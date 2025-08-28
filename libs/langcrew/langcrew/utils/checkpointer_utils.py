"""
Message Merger Tool - Used to merge message history from different namespaces

This tool solves the problem of scattered message storage in LangGraph's nested subgraph architecture.
In LangCrew, the main graph and Agent subgraphs create different checkpoint namespaces,
causing message history to be stored separately. This tool can merge them into a complete conversation history.
"""

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointSaver

logger = logging.getLogger(__name__)


class CheckpointerMessageManager:
    """Merge message history from different namespaces"""

    def __init__(self, checkpointer: BaseCheckpointSaver):
        self.checkpointer = checkpointer

    async def get_all_namespaces(
        self, thread_id: str, filter_root_ns: bool = True
    ) -> list[str]:
        seen = set()
        unique_namespaces = []
        config = {"configurable": {"thread_id": thread_id}}

        try:
            # Iterate through all checkpoints to discover namespaces
            async for checkpoint_tuple in self.checkpointer.alist(config):
                checkpoint_ns = checkpoint_tuple.config.get("configurable", {}).get(
                    "checkpoint_ns", ""
                )
                if checkpoint_tuple.checkpoint:
                    checkpoint_id = checkpoint_tuple.checkpoint["id"]
                    logger.info(
                        f"get_all_namespaces checkpoint_ns: {checkpoint_ns}, checkpoint_id: {checkpoint_id}"
                    )

                if filter_root_ns and not checkpoint_ns:
                    continue
                if checkpoint_ns in seen:
                    continue
                seen.add(checkpoint_ns)
                unique_namespaces.append(checkpoint_ns)
        except Exception as e:
            logger.warning(f"Error listing checkpoints: {e}")

        return unique_namespaces

    async def get_messages_from_namespace(
        self, thread_id: str, namespace: str = ""
    ) -> list[BaseMessage]:
        config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": namespace}}

        try:
            checkpoint_tuple = await self.checkpointer.aget_tuple(config)
            if checkpoint_tuple and checkpoint_tuple.checkpoint:
                logger.info(
                    f"get_messages_from_namespace checkpoint_ns: {namespace}, checkpoint_id: {checkpoint_tuple.checkpoint['id']}"
                )
                channel_values = checkpoint_tuple.checkpoint.get("channel_values", {})
                messages = channel_values.get("messages", [])
                return messages if isinstance(messages, list) else []
        except Exception as e:
            logger.warning(f"Error getting messages from namespace '{namespace}': {e}")

        return []

    async def merge_all_messages(self, thread_id: str) -> list[BaseMessage]:
        all_messages = []
        msg_ids: set[str] = set()

        namespaces = await self.get_all_namespaces(thread_id)
        logger.info(f"Found namespaces for thread {thread_id}: {namespaces}")

        # Collect messages from each namespace
        for namespace in namespaces:
            messages = await self.get_messages_from_namespace(thread_id, namespace)
            logger.info(f"Namespace '{namespace}': {len(messages)} messages")

            # Add source information for each message
            for msg in messages:
                if msg.id in msg_ids:
                    continue
                msg_ids.add(msg.id)
                all_messages.append(msg)

        return all_messages

    async def update_messages_to_root_namespace(
        self, thread_id: str, new_messages: list[BaseMessage]
    ):
        config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
        messages = await self.get_messages_from_namespace(thread_id, "")
        messages.extend(new_messages)
        await self._save_with_proper_checkpoint(config, messages)

    async def save_messages_to_root_namespace(
        self, thread_id: str, messages: list[BaseMessage]
    ):
        """Save messages to root namespace using LangGraph standard checkpoint creation method"""
        base_config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
        await self._save_with_proper_checkpoint(base_config, messages)

    async def _save_with_proper_checkpoint(self, config, messages):
        """Save messages using LangGraph _put_checkpoint logic"""
        try:
            from langgraph.channels.last_value import LastValue
            from langgraph.pregel._checkpoint import (
                copy_checkpoint,
                create_checkpoint,
                empty_checkpoint,
            )
            from langgraph.pregel._utils import get_new_channel_versions
        except ImportError:
            await self._save_with_manual_checkpoint(config, messages)
            return

        # Get existing checkpoint
        checkpoint_tuple = await self.checkpointer.aget_tuple(config)
        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            current_checkpoint = checkpoint_tuple.checkpoint
            metadata = checkpoint_tuple.metadata or {}
            current_step = metadata.get("step", -1)
            # Save current version as previous_versions (simulate _put_checkpoint logic)
            previous_versions = current_checkpoint["channel_versions"].copy()
        else:
            current_checkpoint = empty_checkpoint()
            metadata = {"step": -1}
            current_step = -1
            previous_versions = {}

        # Create mock channels (simulate self.channels)
        # This is key: let create_checkpoint handle versions correctly
        mock_channels = {"messages": LastValue(list, "messages")}

        # Update mock channel state
        mock_channels["messages"].value = messages

        # Simulate apply_writes logic: update checkpoint and versions
        working_checkpoint = copy_checkpoint(current_checkpoint)

        # Get next version number
        if hasattr(self.checkpointer, "get_next_version"):
            try:
                current_version = working_checkpoint["channel_versions"].get("messages")
                next_version = self.checkpointer.get_next_version(current_version, None)
                working_checkpoint["channel_versions"]["messages"] = next_version
            except Exception as e:
                logger.warning(f"Failed to get next version: {e}")
                working_checkpoint["channel_versions"]["messages"] = str(
                    datetime.now(UTC).timestamp()
                )

        # Set updated_channels (simulate self.updated_channels)
        updated_channels = {"messages"}

        # Create new checkpoint using _put_checkpoint logic
        new_checkpoint = create_checkpoint(
            working_checkpoint,
            mock_channels,  # Key: provide channels for correct version handling
            current_step + 1,
            updated_channels=updated_channels,
        )

        # Calculate new_versions (simulate _put_checkpoint version calculation)
        channel_versions = new_checkpoint["channel_versions"].copy()
        new_versions = get_new_channel_versions(previous_versions, channel_versions)

        # Update metadata
        new_metadata = {
            **metadata,
            "source": "message_merger",
            "step": current_step + 1,
        }

        # Save checkpoint (simulate _put_checkpoint save logic)
        await self.checkpointer.aput(
            config=config,
            checkpoint=copy_checkpoint(
                new_checkpoint
            ),  # Use copy to avoid concurrency issues
            metadata=new_metadata,
            new_versions=new_versions,  # Only include actually changed versions
        )

        logger.info(
            f"Saved checkpoint {new_checkpoint['id']} using _put_checkpoint logic, "
            f"new_versions: {new_versions}"
        )

    async def _save_with_manual_checkpoint(self, config, messages):
        """Improved version of manual checkpoint creation (fallback solution)"""
        # Get existing checkpoint or create new one
        checkpoint_tuple = await self.checkpointer.aget_tuple(config)
        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            checkpoint = checkpoint_tuple.checkpoint.copy()
            metadata = checkpoint_tuple.metadata or {}
        else:
            # Use improved manual checkpoint creation
            checkpoint = {
                "v": 4,  # Use correct version number
                "ts": datetime.now(UTC).isoformat(),  # ISO format timestamp
                "id": str(uuid4()),  # Use UUID
                "channel_values": {},
                "channel_versions": {},
                "versions_seen": {},
                "updated_channels": None,
            }
            metadata = {"step": -1}

        # Update messages
        checkpoint["channel_values"]["messages"] = messages

        # Use checkpointer's version management (if available)
        if hasattr(self.checkpointer, "get_next_version"):
            next_version = self.checkpointer.get_next_version()
        else:
            # Fall back to timestamp version
            next_version = str(datetime.now(UTC).timestamp())

        checkpoint["channel_versions"]["messages"] = next_version
        checkpoint["updated_channels"] = ["messages"]

        # Update metadata
        metadata.update({
            "source": "message_merger",
            "step": metadata.get("step", -1) + 1,
        })

        # Save checkpoint
        await self.checkpointer.aput(
            config=config,
            checkpoint=checkpoint,
            metadata=metadata,
            new_versions={"messages": next_version},
        )

    @staticmethod
    def fix_llm_context_messages(
        messages: list[BaseMessage], cancel_reason: str, final_result: Any
    ) -> list[BaseMessage]:
        """
        Fix messages in llm context, ensuring all tool_calls have corresponding ToolMessage

        Args:
            messages: List of messages to fix
            final_result: Final result (may contain cancellation information)

        Returns:
            Fixed message list
        """
        if not messages:
            return messages

        # Create a copy of messages to avoid modifying original data
        fixed_messages = messages.copy()

        # Collect all tool_calls
        all_tool_calls = []
        for message in fixed_messages:
            if isinstance(message, AIMessage) and hasattr(message, "tool_calls"):
                for tool_call in message.tool_calls:
                    all_tool_calls.append(tool_call)

        # Collect all existing tool_call_ids
        tool_call_ids_with_results = set()
        for message in fixed_messages:
            if isinstance(message, ToolMessage) and hasattr(message, "tool_call_id"):
                tool_call_ids_with_results.add(message.tool_call_id)

        # Find tool_calls without corresponding ToolMessage
        tool_calls_without_results = [
            tool_call
            for tool_call in all_tool_calls
            if tool_call.get("id") not in tool_call_ids_with_results
        ]

        # Create ToolMessage for tool_calls without results
        for tool_call in tool_calls_without_results:
            tool_call_id = tool_call.get("id")
            tool_name = tool_call.get("name", "unknown_tool")

            # Create a ToolMessage representing cancellation
            cancel_message = ToolMessage(
                content=f"Tool `{tool_name} ` call was cancelled during execution. reason: {cancel_reason} , current state is {final_result or 'None'}",
                tool_call_id=tool_call_id,
                name=tool_name,
            )

            # Add ToolMessage to the end of message list
            fixed_messages.append(cancel_message)

        logger.info(
            f"Fixed {len(tool_calls_without_results)} tool calls without results"
        )

        return fixed_messages


class CheckpointerSessionStateManager:
    """Async state manager for multi-session state persistence using checkpointer backend.

    This class provides a unified way to manage state across different sessions/threads
    using LangGraph's checkpointer infrastructure for persistence. Each session is
    identified by a session_id (typically thread_id) and maintains its own state space.

    All methods are async to support async checkpointer operations for better performance
    and concurrency. Multiple instances can be created with different checkpointer
    backends for different storage requirements.

    Example:
        async def main():
            checkpointer = InMemorySaver()
            manager = CheckpointerSessionStateManager(checkpointer)

            await manager.set_value("session_123", "key", "value")
            value = await manager.get_value("session_123", "key")
    """

    def __init__(
        self, checkpointer: BaseCheckpointSaver, namespace: str = "session_state"
    ):
        """Initialize CheckpointerStateManager with checkpointer backend.

        Args:
            checkpointer: Checkpointer instance for state persistence
            namespace: Namespace for state storage (default: "session_state")
        """
        self.checkpointer = checkpointer
        self.namespace = namespace

    def _get_config(self, session_id: str) -> RunnableConfig:
        """Create a config for the specified session."""
        return {
            "configurable": {
                "thread_id": session_id,
                "checkpoint_ns": self.namespace,
                "checkpoint_id": self.namespace,
            }
        }

    async def _get_checkpoint_state(self, session_id: str) -> dict[str, Any]:
        """Get current state from checkpointer for specified session."""
        config = self._get_config(session_id)
        checkpoint_tuple = await self.checkpointer.aget_tuple(config)

        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            channel_values = checkpoint_tuple.checkpoint.get("channel_values", {})
            return channel_values.get(self.namespace, {})

        return {}

    async def _save_checkpoint_state(
        self, session_id: str, state: dict[str, Any]
    ) -> None:
        """Save state to checkpointer for specified session."""
        config = self._get_config(session_id)
        checkpoint_tuple = await self.checkpointer.aget_tuple(config)

        # Get existing checkpoint or create new one
        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            checkpoint = checkpoint_tuple.checkpoint.copy()
            channel_values = checkpoint.get("channel_values", {})
        else:
            checkpoint = {
                "v": 1,
                "ts": None,
                "id": self.namespace,
                "channel_values": {},
                "channel_versions": {},
                "versions_seen": {},
            }
            channel_values = checkpoint["channel_values"]

        # Update the state
        channel_values[self.namespace] = state.copy()
        checkpoint["channel_values"] = channel_values

        # Update channel versions
        checkpoint["channel_versions"][self.namespace] = str(
            datetime.now(UTC).timestamp()
        )

        # Save the checkpoint
        await self.checkpointer.aput(
            config=config,
            checkpoint=checkpoint,
            metadata={"source": "checkpointer_state_manager"},
            new_versions=checkpoint["channel_versions"],
        )

    async def get_state(self, session_id: str) -> dict[str, Any]:
        """Get the current state for specified session."""
        state = await self._get_checkpoint_state(session_id)
        return state.copy()

    async def update_state(self, session_id: str, updates: dict[str, Any]) -> None:
        """Update the state with new values for specified session."""
        current_state = await self._get_checkpoint_state(session_id)
        current_state.update(updates)
        await self._save_checkpoint_state(session_id, current_state)

    async def set_state(self, session_id: str, new_state: dict[str, Any]) -> None:
        """Replace the entire state for specified session."""
        await self._save_checkpoint_state(session_id, new_state.copy())

    async def get_value(self, session_id: str, key: str, default: Any = None) -> Any:
        """Get a specific value from state for specified session."""
        state = await self._get_checkpoint_state(session_id)
        return state.get(key, default)

    async def set_value(self, session_id: str, key: str, value: Any) -> None:
        """Set a specific value in state for specified session."""
        current_state = await self._get_checkpoint_state(session_id)
        current_state[key] = value
        await self._save_checkpoint_state(session_id, current_state)

    async def del_key(self, session_id: str, key: str) -> None:
        """Delete a specific key from state for specified session."""
        current_state = await self._get_checkpoint_state(session_id)
        if key in current_state:
            del current_state[key]
            await self._save_checkpoint_state(session_id, current_state)

    async def has_key(self, session_id: str, key: str) -> bool:
        """Check if a key exists in state for specified session."""
        state = await self._get_checkpoint_state(session_id)
        return key in state

    async def clear(self, session_id: str) -> None:
        """Clear all state for specified session."""
        await self._save_checkpoint_state(session_id, {})
