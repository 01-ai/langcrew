"""Basic tests for LangCrew Memory System"""

import uuid

import pytest

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.memory import (
    EntityMemory,
    LongTermMemory,
    MemoryConfig,
    ShortTermMemory,
    get_checkpointer,
    get_storage,
)
from langcrew.task import Task


class TestMemoryConfig:
    """Test memory configuration"""
    
    def test_basic_config(self):
        """Test basic memory configuration"""
        config = MemoryConfig(
            enabled=True,
            provider="memory"
        )
        
        assert config.enabled
        assert config.provider == "memory"
        assert config.short_term["enabled"]
        assert config.long_term["enabled"]
        assert config.entity["enabled"]
    
    def test_config_from_dict(self):
        """Test creating config from dictionary"""
        config_dict = {
            "enabled": True,
            "provider": "sqlite",
            "path": "./test.db",
            "short_term": {"max_history": 50}
        }
        
        config = MemoryConfig.from_dict(config_dict)
        assert config.enabled
        assert config.provider == "sqlite"
        assert config.path == "./test.db"
        assert config.short_term["max_history"] == 50


class TestShortTermMemory:
    """Test short-term memory functionality"""
    
    def test_save_and_retrieve(self):
        """Test saving and retrieving from short-term memory"""
        checkpointer = get_checkpointer("memory")
        memory = ShortTermMemory(checkpointer=checkpointer)
        
        # Set thread_id
        thread_id = str(uuid.uuid4())
        memory.set_thread_id(thread_id)
        
        # Save memory
        memory.save(
            value="Test observation from agent",
            metadata={"task": "test_task", "thread_id": thread_id},
            agent="test_agent"
        )
        
        # Retrieve context
        context = memory.get_context(thread_id, limit=5)
        assert len(context) > 0
        assert context[0]["value"] == "Test observation from agent"
        assert context[0]["agent"] == "test_agent"
    
    def test_search(self):
        """Test searching short-term memory"""
        checkpointer = get_checkpointer("memory")
        memory = ShortTermMemory(checkpointer=checkpointer)
        
        thread_id = str(uuid.uuid4())
        memory.set_thread_id(thread_id)
        
        # Save multiple memories
        memory.save("Python is great", {"thread_id": thread_id}, "agent1")
        memory.save("JavaScript is fast", {"thread_id": thread_id}, "agent2")
        memory.save("Python has good libraries", {"thread_id": thread_id}, "agent1")
        
        # Search
        results = memory.search("Python", thread_id, limit=2)
        assert len(results) == 2
        assert all("Python" in str(r) for r in results)
    
    def test_clear(self):
        """Test clearing memories"""
        checkpointer = get_checkpointer("memory")
        memory = ShortTermMemory(checkpointer=checkpointer)
        
        thread_id = str(uuid.uuid4())
        memory.set_thread_id(thread_id)
        
        # Save and clear
        memory.save("Test memory", {"thread_id": thread_id}, "agent")
        memory.clear(thread_id)
        
        # Verify cleared
        context = memory.get_context(thread_id)
        assert len(context) == 0
    
    def test_format_as_context(self):
        """Test formatting memories as context"""
        checkpointer = get_checkpointer("memory")
        memory = ShortTermMemory(checkpointer=checkpointer)
        
        memories = [
            {"agent": "researcher", "value": "Found important data"},
            {"agent": "writer", "value": "Created draft"}
        ]
        
        context = memory.format_as_context(memories)
        assert "Based on recent interactions:" in context
        assert "researcher: Found important data" in context
        assert "writer: Created draft" in context


class TestLongTermMemory:
    """Test long-term memory functionality"""
    
    def test_save_and_search(self):
        """Test saving and searching long-term memory"""
        store = get_storage("memory")
        memory = LongTermMemory(store=store)
        
        # Save knowledge
        memory.save(
            value="Python is a high-level programming language",
            metadata={
                "task": "language_research",
                "quality": 0.95,
                "learnings": ["Python is interpreted", "Python supports OOP"]
            },
            agent="researcher"
        )
        
        # Search
        results = memory.search("Python programming", limit=5)
        assert len(results) > 0
        assert results[0]["content"] == "Python is a high-level programming language"
        assert results[0]["quality"] == 0.95
    
    def test_save_task_result(self):
        """Test saving task execution results"""
        store = get_storage("memory")
        memory = LongTermMemory(store=store)
        
        memory.save_task_result(
            task="Analyze codebase",
            result="Found 10 bugs and 5 security issues",
            quality=0.85,
            learnings=["Always validate input", "Use type hints"],
            agent="analyzer"
        )
        
        # Search for the saved result
        results = memory.search("bugs security", limit=1)
        assert len(results) > 0
        assert "10 bugs" in results[0]["content"]
    
    def test_get_learnings(self):
        """Test getting learnings"""
        store = get_storage("memory")
        memory = LongTermMemory(store=store)
        
        # Save some learnings
        memory.save_task_result(
            task="Code review",
            result="Review complete",
            quality=0.9,
            learnings=["Use linters", "Write tests first"]
        )
        
        learnings = memory.get_learnings(limit=10)
        assert "Use linters" in learnings
        assert "Write tests first" in learnings
    
    def test_format_as_context(self):
        """Test formatting as context"""
        store = get_storage("memory")
        memory = LongTermMemory(store=store)
        
        memories = [{
            "task": "test_task",
            "content": "Test result",
            "quality": 0.9,
            "learnings": ["Learning 1", "Learning 2"]
        }]
        
        context = memory.format_as_context(memories)
        assert "Relevant knowledge from past experiences:" in context
        assert "test_task" in context
        assert "quality: 0.9" in context
        assert "Learning 1" in context


class TestEntityMemory:
    """Test entity memory functionality"""
    
    def test_save_and_get_entity(self):
        """Test saving and retrieving entities"""
        store = get_storage("memory")
        memory = EntityMemory(store=store)
        
        # Save entity
        memory.save(
            value="John Doe is the CEO of TechCorp",
            metadata={
                "entity_name": "John Doe",
                "entity_type": "person",
                "attributes": {"role": "CEO", "company": "TechCorp"}
            },
            agent="researcher"
        )
        
        # Get entity
        entity = memory.get_entity("John Doe", "person")
        assert entity is not None
        assert entity["name"] == "John Doe"
        assert entity["type"] == "person"
        assert entity["attributes"]["role"] == "CEO"
    
    def test_update_entity(self):
        """Test updating entities"""
        store = get_storage("memory")
        memory = EntityMemory(store=store)
        
        # Save initial entity
        memory.save(
            value="TechCorp is a software company",
            metadata={
                "entity_name": "TechCorp",
                "entity_type": "organization",
                "attributes": {"industry": "software"}
            }
        )
        
        # Update entity
        success = memory.update_entity(
            "TechCorp",
            {"attributes": {"employees": 1000, "founded": 2010}},
            "organization"
        )
        
        assert success
        entity = memory.get_entity("TechCorp", "organization")
        assert entity["attributes"]["employees"] == 1000
        assert entity["attributes"]["industry"] == "software"  # Original preserved
    
    def test_relationships(self):
        """Test entity relationships"""
        store = get_storage("memory")
        memory = EntityMemory(store=store)
        
        # Save entities with relationships
        memory.save(
            value="Alice works at TechCorp",
            metadata={
                "entity_name": "Alice",
                "entity_type": "person",
                "relationships": ["TechCorp"]
            }
        )
        
        memory.save(
            value="TechCorp is a company",
            metadata={
                "entity_name": "TechCorp",
                "entity_type": "organization",
                "relationships": ["Alice"]
            }
        )
        
        # Get relationships
        related = memory.get_relationships("Alice")
        assert len(related) > 0
        assert any(e["name"] == "TechCorp" for e in related)
    
    def test_search_entities(self):
        """Test searching entities"""
        store = get_storage("memory")
        memory = EntityMemory(store=store)
        
        # Save multiple entities
        memory.save("Python language", metadata={"entity_name": "Python", "entity_type": "concept"})
        memory.save("Python snake", metadata={"entity_name": "Python Snake", "entity_type": "animal"})
        
        # Search
        results = memory.search("Python", limit=5)
        assert len(results) >= 2
        
        # Search by type
        concepts = memory.get_entities("concept", limit=10)
        assert any(e["name"] == "Python" for e in concepts)


class TestCrewMemoryIntegration:
    """Test memory integration with Crew"""
    
    def test_crew_memory_setup(self):
        """Test crew with memory enabled"""
        agent1 = Agent(
            role="Researcher",
            goal="Research topics",
            backstory="Research expert"
        )
        
        agent2 = Agent(
            role="Writer",
            goal="Write content",
            backstory="Writing expert"
        )
        
        task = Task(
            description="Research and write about AI",
            expected_output="Article about AI",
            agent=agent1
        )
        
        crew = Crew(
            agents=[agent1, agent2],
            tasks=[task],
            memory=True,
            memory_config={
                "provider": "memory",
                "short_term": {"enabled": True},
                "long_term": {"enabled": True}
            }
        )
        
        # Verify memory setup
        assert crew._memory
        assert crew.short_term_memory is not None
        assert crew.long_term_memory is not None
        assert crew.entity_memory is not None
    
    def test_crew_memory_search(self):
        """Test searching crew memories"""
        agent = Agent(
            role="Analyst",
            goal="Analyze data",
            backstory="Data expert"
        )
        
        task = Task(
            description="Analyze sales data",
            expected_output="Sales report",
            agent=agent
        )
        
        crew = Crew(
            agents=[agent],
            tasks=[task],
            memory=True
        )
        
        # Save some test data
        if crew.short_term_memory:
            crew.short_term_memory.save(
                "Sales increased by 20%",
                {"thread_id": "test"},
                "analyst"
            )
        
        # Search
        results = crew.search_memory("sales", memory_type="short_term")
        assert len(results) > 0
        assert results[0]["memory_type"] == "short_term"


class TestStorageFactory:
    """Test storage and checkpointer factories"""
    
    def test_get_storage(self):
        """Test storage factory"""
        # Default
        store = get_storage()
        assert store is not None
        
        # Memory provider
        store = get_storage("memory")
        assert store is not None
        
        # Invalid provider
        with pytest.raises(ValueError):
            get_storage("invalid_provider")
    
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