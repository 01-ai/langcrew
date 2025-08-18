"""Short-term memory implementation using LangGraph's checkpoint system"""

import uuid
from datetime import datetime
from typing import Any

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver

from .config import MemoryConfig


class ShortTermMemory:
    """Short term memory using LangGraph's checkpoint system for session management"""

    def __init__(
        self,
        checkpointer: BaseCheckpointSaver | None = None,
        config: MemoryConfig | None = None,
    ):
        self.checkpointer = checkpointer or InMemorySaver()
        self.config = config or MemoryConfig()
        self._thread_id = None
        self._cache = {}  # Local cache for current execution

    def save(
        self,
        value: Any,
        metadata: dict[str, Any] | None = None,
        agent: str | None = None,
    ) -> None:
        """Save to short-term memory"""
        thread_id = self._get_thread_id(metadata)

        # Build memory item
        memory_item = {
            "value": value,
            "agent": agent,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
        }

        # Save to cache for immediate access
        if thread_id not in self._cache:
            self._cache[thread_id] = []
        self._cache[thread_id].append(memory_item)

        # Save to checkpointer for persistence
        config = {
            "configurable": {"thread_id": thread_id, "checkpoint_ns": "short_term"}
        }

        # Get existing checkpoint
        checkpoint_tuple = self.checkpointer.get_tuple(config)
        if checkpoint_tuple:
            memories = checkpoint_tuple.checkpoint.get("channel_values", {}).get(
                "memories", []
            )
        else:
            memories = []

        # Add new memory and maintain size limit
        memories.append(memory_item)
        max_history = self.config.short_term_max_history
        if len(memories) > max_history:
            memories = memories[-max_history:]

        # Save updated checkpoint
        checkpoint = {
            "id": str(uuid.uuid4()),
            "channel_values": {"memories": memories},
            "channel_versions": {"memories": str(datetime.now().timestamp())},
        }

        # Get parent checkpoint id if exists

        self.checkpointer.put(
            config=config,
            checkpoint=checkpoint,
            metadata={"saved_at": datetime.now().isoformat()},
            new_versions=checkpoint["channel_versions"],
        )

    def get_context(
        self, thread_id: str | None = None, limit: int = 5
    ) -> list[dict[str, Any]]:
        """Get recent context for injection"""
        thread_id = thread_id or self._thread_id
        if not thread_id:
            return []

        # Try cache first
        if thread_id in self._cache:
            return self._cache[thread_id][-limit:]

        # Fall back to checkpointer
        config = {
            "configurable": {"thread_id": thread_id, "checkpoint_ns": "short_term"}
        }

        checkpoint_tuple = self.checkpointer.get_tuple(config)
        if checkpoint_tuple:
            memories = checkpoint_tuple.checkpoint.get("channel_values", {}).get(
                "memories", []
            )
            return memories[-limit:]

        return []

    def search(
        self, query: str, thread_id: str | None = None, limit: int = 3
    ) -> list[dict[str, Any]]:
        """Search through short-term memories"""
        memories = self.get_context(thread_id, limit=100)  # Get more for filtering

        # Simple keyword matching
        results = []
        query_lower = query.lower()
        for memory in reversed(memories):  # Most recent first
            if query_lower in str(memory).lower():
                results.append(memory)
                if len(results) >= limit:
                    break

        return results

    def clear(self, thread_id: str | None = None) -> None:
        """Clear memories for a thread"""
        thread_id = thread_id or self._thread_id
        if not thread_id:
            return

        # Clear cache
        if thread_id in self._cache:
            del self._cache[thread_id]

        # Clear checkpoint
        config = {
            "configurable": {"thread_id": thread_id, "checkpoint_ns": "short_term"}
        }

        # Save empty checkpoint
        checkpoint = {
            "id": str(uuid.uuid4()),
            "channel_values": {"memories": []},
            "channel_versions": {"memories": str(datetime.now().timestamp())},
        }

        self.checkpointer.put(
            config=config,
            checkpoint=checkpoint,
            metadata={"cleared_at": datetime.now().isoformat()},
            new_versions=checkpoint["channel_versions"],
        )

    def _get_thread_id(self, metadata: dict[str, Any] | None = None) -> str:
        """Get thread_id from metadata or use default"""
        if metadata and "thread_id" in metadata:
            return metadata["thread_id"]
        return self._thread_id or "default"

    def set_thread_id(self, thread_id: str) -> None:
        """Set the current thread_id"""
        self._thread_id = thread_id

    def format_as_context(self, memories: list[dict[str, Any]]) -> str:
        """Format memories as context string for prompt injection"""
        if not memories:
            return ""

        context_parts = ["Based on recent interactions:"]
        for memory in memories:
            agent = memory.get("agent", "Unknown")
            value = memory.get("value", "")
            context_parts.append(f"- {agent}: {value}")

        return "\n".join(context_parts)
