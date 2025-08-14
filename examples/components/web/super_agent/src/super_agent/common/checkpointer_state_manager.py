from datetime import datetime
from typing import Any

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointSaver


class CheckpointerStateManager:
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
            manager = CheckpointerStateManager(checkpointer)

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
        checkpoint["channel_versions"][self.namespace] = str(datetime.now().timestamp())

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
