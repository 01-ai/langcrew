"""Long-term memory implementation using LangGraph's store for persistent knowledge"""

import uuid
from datetime import datetime
from typing import Any

from langgraph.store.base import BaseStore
from langgraph.store.memory import InMemoryStore

from .config import MemoryConfig


class LongTermMemory:
    """Long term memory using LangGraph's store for persistent knowledge and learning"""

    def __init__(
        self, store: BaseStore | None = None, config: MemoryConfig | None = None
    ):
        self.store = store or InMemoryStore()
        self.config = config or MemoryConfig()
        self._namespace_prefix = ("long_term",)

    def save(
        self,
        value: Any,
        metadata: dict[str, Any] | None = None,
        agent: str | None = None,
    ) -> None:
        """Save important knowledge to long-term memory"""
        metadata = metadata or {}

        # Build knowledge item
        knowledge_item = {
            "content": value,
            "agent": agent,
            "task": metadata.get("task", "unknown"),
            "quality": metadata.get("quality", 0.8),
            "learnings": metadata.get("learnings", []),
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata,
        }

        # Build namespace
        namespace = self._namespace_prefix
        if agent:
            namespace = namespace + (agent,)

        # Generate key
        key = f"{metadata.get('task', 'knowledge')}_{uuid.uuid4()}"

        # Save to store
        self.store.put(namespace=namespace, key=key, value=knowledge_item)

    def search(
        self, query: str, limit: int = 5, min_quality: float = 0.7
    ) -> list[dict[str, Any]]:
        """Search for relevant knowledge"""
        # Search across all namespaces under long_term
        results = self.store.search(
            namespace_prefix=self._namespace_prefix,
            query=query,
            limit=limit * 2,  # Get more for quality filtering
        )

        # Filter by quality and extract values
        knowledge_items = []
        for result in results:
            item = result.value
            if item.get("quality", 0) >= min_quality:
                knowledge_items.append(item)

        # Sort by quality and recency
        knowledge_items.sort(
            key=lambda x: (x.get("quality", 0), x.get("timestamp", "")), reverse=True
        )

        return knowledge_items[:limit]

    def get_by_task(self, task: str, agent: str | None = None) -> list[dict[str, Any]]:
        """Get knowledge related to a specific task"""
        namespace = self._namespace_prefix
        if agent:
            namespace = namespace + (agent,)

        # List all items in namespace
        items = []
        for ns in self.store.list_namespaces(prefix=namespace):
            namespace_items = self.store.list(namespace=ns)
            for _, item in namespace_items:
                if task.lower() in item.get("task", "").lower():
                    items.append(item)

        return items

    def get_learnings(self, limit: int = 10) -> list[str]:
        """Get recent learnings across all tasks"""
        # Search for high-quality items
        results = self.search("", limit=limit, min_quality=0.8)

        learnings = []
        for item in results:
            # Extract learnings from each item
            item_learnings = item.get("learnings", [])
            if item_learnings:
                learnings.extend(item_learnings)
            else:
                # If no explicit learnings, use the content with context
                task = item.get("task", "unknown task")
                content = item.get("content", "")
                if content:
                    learnings.append(f"From {task}: {content}")

        return learnings[:limit]

    def save_task_result(
        self,
        task: str,
        result: str,
        quality: float,
        learnings: list[str] | None = None,
        agent: str | None = None,
    ) -> None:
        """Save task execution result with quality assessment"""
        metadata = {
            "task": task,
            "quality": quality,
            "learnings": learnings or [],
            "result_length": len(result),
        }

        self.save(value=result, metadata=metadata, agent=agent)

    def clear(self, agent: str | None = None) -> None:
        """Clear long-term memories"""
        namespace = self._namespace_prefix
        if agent:
            namespace = namespace + (agent,)

        # Get all items and delete them
        items = self.store.list(namespace=namespace)
        for key, _ in items:
            self.store.delete(namespace=namespace, key=key)

    def export(self) -> list[dict[str, Any]]:
        """Export all long-term memories"""
        all_items = []

        # Get all namespaces under long_term
        for ns in self.store.list_namespaces(prefix=self._namespace_prefix):
            items = self.store.list(namespace=ns)
            for key, item in items:
                export_item = {"namespace": ns, "key": key, "value": item}
                all_items.append(export_item)

        return all_items

    def import_memories(self, memories: list[dict[str, Any]]) -> None:
        """Import memories from export"""
        for memory in memories:
            self.store.put(
                namespace=memory["namespace"], key=memory["key"], value=memory["value"]
            )

    def format_as_context(self, memories: list[dict[str, Any]]) -> str:
        """Format memories as context string for prompt injection"""
        if not memories:
            return ""

        context_parts = ["Relevant knowledge from past experiences:"]
        for memory in memories:
            task = memory.get("task", "previous task")
            content = memory.get("content", "")
            quality = memory.get("quality", 0.8)
            learnings = memory.get("learnings", [])

            context_parts.append(f"\n- From {task} (quality: {quality:.1f}):")
            context_parts.append(f"  Result: {content}")

            if learnings:
                context_parts.append("  Key learnings:")
                for learning in learnings:
                    context_parts.append(f"    • {learning}")

        return "\n".join(context_parts)
