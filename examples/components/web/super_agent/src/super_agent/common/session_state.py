from typing import Any, Final, Set
from langcrew_tools.astream_tool import EventType


EVENT_CALLBACK_KEY: Final[str] = "event_callback"
SET_EVENT_CALLBACK_KEY: Final[Set[str]] = {event.value for event in EventType}


class SessionState:
    def __init__(self, session_id: str):
        self.state = {}
        self.session_id = session_id

    def get_state(self) -> dict[str, Any]:
        """Get the current state."""
        return self.state.copy()  # Return copy to avoid accidental modification

    def update_state(self, updates: dict[str, Any]) -> None:
        """Update the state with new values."""
        self.state.update(updates)

    def set_state(self, new_state: dict[str, Any]) -> None:
        """Replace the entire state."""
        self.state = new_state.copy()  # Use copy to avoid external modification

    def get_value(self, key: str, default: Any = None) -> Any:
        """Get a specific value from state."""
        return self.state.get(key, default)

    def set_value(self, key: str, value: Any) -> None:
        """Set a specific value in state."""
        self.state[key] = value

    def del_key(self, key: str) -> None:
        """Delete a specific key from state."""
        self.state.pop(key, None)

    def has_key(self, key: str) -> bool:
        """Check if a key exists in state."""
        return key in self.state

    def clear(self) -> None:
        """Clear all state."""
        self.state.clear()
