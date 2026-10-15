"""Generic state storage interface for langcrew tools"""

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class StateStorage(Protocol):
    """Interface for tool state persistence

    Tools can implement this protocol to persist state across sessions.
    The state_data structure is defined by each tool's specific needs.
    """

    async def save_state(self, session_id: str, state_data: dict[str, Any]) -> None:
        """Save tool state for a session

        Args:
            session_id: Unique session identifier
            state_data: Tool-specific state dictionary
        """
        ...

    async def load_state(self, session_id: str) -> dict[str, Any] | None:
        """Load tool state for a session

        Args:
            session_id: Unique session identifier

        Returns:
            State dictionary if found, None otherwise
        """
        ...

    async def delete_state(self, session_id: str) -> None:
        """Delete tool state for a session

        Args:
            session_id: Unique session identifier
        """
        ...
