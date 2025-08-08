from datetime import datetime
from typing import Any

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointSaver


class ToolStateManager:
    """Manager for tool state using checkpointer backend.

    This class provides a unified way to manage tool state across different
    tools in a crew, using the same checkpointer infrastructure used for
    graph state persistence.
    """

    def __init__(
        self, checkpointer: BaseCheckpointSaver, namespace: str = "tool_state"
    ):
        """Initialize the ToolStateManager.

        Args:
            checkpointer: The checkpointer backend to use for storage
            namespace: The namespace to use for tool state (default: "tool_state")
        """
        self.checkpointer = checkpointer
        self.namespace = namespace

    def _get_config(self, session_id: str) -> RunnableConfig:
        """Create a config for the given session."""
        return {
            "configurable": {
                "thread_id": session_id,
                "checkpoint_ns": self.namespace,
                "checkpoint_id": "tool_state",
            }
        }

    def get(self, key: str, session_id: str, default: Any = None) -> Any:
        """Get a value from the tool state.

        Args:
            key: The key to retrieve
            session_id: The session ID to scope the state to
            default: Default value if key not found

        Returns:
            The value associated with the key, or default if not found
        """
        config = self._get_config(session_id)
        checkpoint_tuple = self.checkpointer.get_tuple(config)

        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            channel_values = checkpoint_tuple.checkpoint.get("channel_values", {})
            tool_state = channel_values.get("tool_state", {})
            return tool_state.get(key, default)

        return default

    def set(self, key: str, value: Any, session_id: str) -> None:
        """Set a value in the tool state.

        Args:
            key: The key to set
            value: The value to store
            session_id: The session ID to scope the state to
        """
        config = self._get_config(session_id)
        checkpoint_tuple = self.checkpointer.get_tuple(config)

        # Get existing checkpoint or create new one
        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            checkpoint = checkpoint_tuple.checkpoint
            channel_values = checkpoint.get("channel_values", {})
            tool_state = channel_values.get("tool_state", {})
        else:
            checkpoint = {
                "v": 1,
                "ts": None,
                "id": "tool_state",
                "channel_values": {"tool_state": {}},
                "channel_versions": {"tool_state": str(datetime.now().timestamp())},
                "versions_seen": {},
            }
            channel_values = checkpoint["channel_values"]
            tool_state = channel_values["tool_state"]

        # Update the tool state
        tool_state[key] = value
        
        # Update channel versions
        checkpoint["channel_versions"]["tool_state"] = str(datetime.now().timestamp())

        # Save the checkpoint
        self.checkpointer.put(
            config=config,
            checkpoint=checkpoint,
            metadata={"source": "tool_state_manager"},
            new_versions=checkpoint["channel_versions"],
        )

    def update(self, data: dict[str, Any], session_id: str) -> None:
        """Update multiple values in the tool state.

        Args:
            data: Dictionary of key-value pairs to update
            session_id: The session ID to scope the state to
        """
        config = self._get_config(session_id)
        checkpoint_tuple = self.checkpointer.get_tuple(config)

        # Get existing checkpoint or create new one
        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            checkpoint = checkpoint_tuple.checkpoint
            channel_values = checkpoint.get("channel_values", {})
            tool_state = channel_values.get("tool_state", {})
        else:
            checkpoint = {
                "v": 1,
                "ts": None,
                "id": "tool_state",
                "channel_values": {"tool_state": {}},
                "channel_versions": {"tool_state": str(datetime.now().timestamp())},
                "versions_seen": {},
            }
            channel_values = checkpoint["channel_values"]
            tool_state = channel_values["tool_state"]

        # Update the tool state
        tool_state.update(data)
        
        # Update channel versions
        checkpoint["channel_versions"]["tool_state"] = str(datetime.now().timestamp())

        # Save the checkpoint
        self.checkpointer.put(
            config=config,
            checkpoint=checkpoint,
            metadata={"source": "tool_state_manager"},
            new_versions=checkpoint["channel_versions"],
        )

    def get_all(self, session_id: str) -> dict[str, Any]:
        """Get all values from the tool state.

        Args:
            session_id: The session ID to scope the state to

        Returns:
            Dictionary containing all tool state
        """
        config = self._get_config(session_id)
        checkpoint_tuple = self.checkpointer.get_tuple(config)

        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            channel_values = checkpoint_tuple.checkpoint.get("channel_values", {})
            return channel_values.get("tool_state", {}).copy()

        return {}

    def clear(self, session_id: str) -> None:
        """Clear all values from the tool state.

        Args:
            session_id: The session ID to scope the state to
        """
        config = self._get_config(session_id)

        # Create an empty checkpoint to overwrite existing state
        checkpoint = {
            "v": 1,
            "ts": None,
            "id": "tool_state",
            "channel_values": {"tool_state": {}},
            "channel_versions": {},
            "versions_seen": {},
        }

        # Update channel versions
        checkpoint["channel_versions"]["tool_state"] = str(datetime.now().timestamp())
        
        # Save the empty checkpoint
        self.checkpointer.put(
            config=config,
            checkpoint=checkpoint,
            metadata={"source": "tool_state_manager", "action": "clear"},
            new_versions=checkpoint["channel_versions"],
        )
