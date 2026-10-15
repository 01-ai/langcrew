"""Basic agent-oriented memory tests for LangCrew."""

import pytest

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.memory.config import (
    LongTermMemoryConfig,
    MemoryConfig,
    MemoryScopeConfig,
    ShortTermMemoryConfig,
)


def test_memory_config_defaults():
    """Default MemoryConfig should be in-memory short-term only."""
    config = MemoryConfig()
    assert config.provider == "memory"
    assert config.short_term.enabled is True
    assert config.long_term.enabled is False


def test_memory_scope_config_rejects_invalid_actions():
    """Memory scope should validate allowed action names."""
    with pytest.raises(ValueError, match="Invalid actions_permitted"):
        MemoryScopeConfig(actions_permitted=("create", "invalid_action"))


def test_long_term_memory_rejects_empty_app_id():
    """Long-term config should reject empty app_id values."""
    with pytest.raises(ValueError, match="app_id cannot be empty string"):
        LongTermMemoryConfig(enabled=True, app_id="   ")


def test_crew_applies_memory_config_to_agent(mock_llm):
    """Crew-level memory should be assigned to agents without local memory config."""
    memory_config = MemoryConfig(short_term=ShortTermMemoryConfig(enabled=True))
    agent = Agent(
        prompt="You are a memory specialist.",
        llm=mock_llm,
    )
    assert agent.memory_config is None

    Crew(agent=agent, memory=memory_config)

    assert agent.memory_config is memory_config
