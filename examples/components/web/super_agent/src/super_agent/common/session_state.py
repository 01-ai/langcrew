import asyncio
import inspect
from typing import Any, Callable, Final, Set
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
        for key, value in updates.items():
            self.execute_event_callback(key, value)

    def set_state(self, new_state: dict[str, Any]) -> None:
        """Replace the entire state."""
        self.state = new_state.copy()  # Use copy to avoid external modification

    def get_value(self, key: str, default: Any = None) -> Any:
        """Get a specific value from state."""
        return self.state.get(key, default)

    def set_value(self, key: str, value: Any) -> None:
        """Set a specific value in state."""
        self.state[key] = value
        self.execute_event_callback(key, value)

    def del_key(self, key: str) -> None:
        """Delete a specific key from state."""
        self.state.pop(key, None)

    def has_key(self, key: str) -> bool:
        """Check if a key exists in state."""
        return key in self.state

    def clear(self) -> None:
        """Clear all state."""
        self.state.clear()

    def add_event_callback(self, callback: Callable[[str, Any], None]) -> None:
        """Set a specific value in state."""
        if EVENT_CALLBACK_KEY not in self.state:
            self.state[EVENT_CALLBACK_KEY] = []
        self.state[EVENT_CALLBACK_KEY].append(callback)

    def execute_event_callback(self, key: str, value: Any) -> None:
        """Execute all event callbacks"""
        if key in SET_EVENT_CALLBACK_KEY and self.state.get(EVENT_CALLBACK_KEY):

            async def execute_callback() -> None:
                for callback in self.state[EVENT_CALLBACK_KEY]:
                    if inspect.iscoroutinefunction(callback):
                        await callback(key, value)
                    else:
                        callback(key, value)

            asyncio.create_task(execute_callback())
