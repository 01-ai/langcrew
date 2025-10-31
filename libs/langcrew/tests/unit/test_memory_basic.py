"""Basic tests for LangCrew Memory System"""

import uuid

import pytest

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.memory.config import (
    MemoryConfig,
    ShortTermMemoryConfig,
    LongTermMemoryConfig,
)
from langcrew.memory.factory import get_checkpointer
from langcrew.task import Task


class TestMemoryConfig:
    """Test memory configuration"""

    def test_basic_config(self):
        """Test basic memory configuration"""
        config = MemoryConfig(provider="memory")

        assert config.provider == "memory"
        assert config.short_term.enabled is True
        assert config.long_term.enabled is False

    def test_config_from_dict(self):
        """Test creating config from dictionary"""
        config_dict = {
            "provider": "sqlite",
            "connection_string": "./test.db",
            "short_term": ShortTermMemoryConfig(enabled=True),
        }

        config = MemoryConfig.from_dict(config_dict)
        assert config.provider == "sqlite"
        assert config.connection_string == "./test.db"
        assert config.short_term.enabled is True

class TestCrewMemoryIntegration:
    """Test memory integration with Crew"""

    def test_crew_memory_setup(self):
        """Test crew with memory enabled"""
        agent1 = Agent(
            role="Researcher", goal="Research topics", backstory="Research expert"
        )

        agent2 = Agent(role="Writer", goal="Write content", backstory="Writing expert")

        task = Task(
            description="Research and write about AI",
            expected_output="Article about AI",
            agent=agent1,
        )

        crew = Crew(
            agents=[agent1, agent2],
            tasks=[task],
            memory=MemoryConfig(
                provider="memory",
                short_term=ShortTermMemoryConfig(enabled=True),
                long_term=LongTermMemoryConfig(enabled=True),
            ),
        )

        # Verify memory setup
        assert crew.memory_config is not None


class TestStorageFactory:
    """Test storage and checkpointer factories"""

    def test_get_checkpointer(self):
        """Test checkpointer factory"""
        # Default
        checkpointer = get_checkpointer()
        assert checkpointer is not None

        # Memory provider
        checkpointer = get_checkpointer("memory")
        assert checkpointer is not None

        # Invalid provider
        with pytest.raises(ValueError):
            get_checkpointer("invalid_provider")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])