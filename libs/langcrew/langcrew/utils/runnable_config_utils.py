import logging
from typing import Any, ClassVar

from langchain_core.runnables import RunnableConfig

logger = logging.getLogger(__name__)


class RunnableStateManager:
    """Utility class for managing state in RunnableConfig.

    IMPORTANT: This state manager must be initialized at the top-level LangGraph
    before being used in any nested runnables or agents. The state is stored in
    the RunnableConfig metadata and persists throughout the execution chain.
    """

    METADATA_KEY: ClassVar[str] = "metadata"
    RUNNABLE_CONFIG_STATE_KEY: ClassVar[str] = "_langcrew_runnable_config_state_"

    @classmethod
    def init_state(cls, config: RunnableConfig) -> dict[str, Any]:
        """Initialize the state for the specified session.

        MUST be called at the top-level LangGraph before any other state operations.
        This ensures the state container is properly set up in the RunnableConfig metadata.
        """
        assert config is not None, "config is required"
        if cls.METADATA_KEY not in config:
            config[cls.METADATA_KEY] = {}
        if cls.RUNNABLE_CONFIG_STATE_KEY not in config[cls.METADATA_KEY]:
            config[cls.METADATA_KEY][cls.RUNNABLE_CONFIG_STATE_KEY] = {}
        return config[cls.METADATA_KEY][cls.RUNNABLE_CONFIG_STATE_KEY]

    @classmethod
    def _get_internal_state(cls, config: RunnableConfig) -> dict[str, Any]:
        """Get the metadata for specified session."""
        metadata = config.get(cls.METADATA_KEY, {})
        state = metadata.get(cls.RUNNABLE_CONFIG_STATE_KEY, None)
        if state is None:
            logger.warning("State not initialized. Call init_state() first.")
        return state

    @classmethod
    def get_state(cls, config: RunnableConfig) -> dict[str, Any]:
        """Get the current state for specified session."""
        state = cls._get_internal_state(config)
        return state.copy() if state else None

    @classmethod
    def update_state(cls, config: RunnableConfig, updates: dict[str, Any]) -> None:
        """Update the state with new values for specified session."""
        state = cls._get_internal_state(config)
        if state is None:
            return
        state.update(updates)

    @classmethod
    def get_value(cls, config: RunnableConfig, key: str, default: Any = None) -> Any:
        """Get a specific value from state for specified session."""
        state = cls._get_internal_state(config)
        if state is None:
            return None
        return state.get(key, default)

    @classmethod
    def set_value(cls, config: RunnableConfig, key: str, value: Any) -> None:
        """Set a specific value in state for specified session."""
        state = cls._get_internal_state(config)
        if state is None:
            return
        state[key] = value

    @classmethod
    def del_key(cls, config: RunnableConfig, key: str) -> None:
        """Delete a specific key from state for specified session."""
        state = cls._get_internal_state(config)
        if state is None:
            return
        if key in state:
            del state[key]

    @classmethod
    def has_key(cls, config: RunnableConfig, key: str) -> bool:
        """Check if a key exists in state for specified session."""
        state = cls._get_internal_state(config)
        if state is None:
            return False
        return key in state
