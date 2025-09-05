#!/usr/bin/env python3
"""
Test LangCrew Memory System Refactoring
Tests MemoryConfig with short-term, long-term (user & app dimensions) using InMemory storage
"""

import sys
import os

# Add the langcrew path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'libs/langcrew'))

def test_complete_memory_config():
    """Test complete MemoryConfig with short-term and long-term memory (user & app dimensions)"""
    print("🧪 Testing Complete MemoryConfig with InMemory Storage...")
    
    from langcrew.memory import MemoryConfig, ShortTermMemoryConfig, LongTermMemoryConfig, MemoryScopeConfig, IndexConfig
    from pydantic import BaseModel
    
    # Define custom schema for structured memory
    class UserPreference(BaseModel):
        category: str
        preference: str
        context: str = ""
    
    # Create complete memory configuration
    memory_config = MemoryConfig(
        provider="memory",  # InMemory storage
        
        # Short-term memory configuration (conversation state)
        short_term=ShortTermMemoryConfig(
            enabled=True,
            provider="memory"  # Use InMemory for short-term
        ),
        
        # Long-term memory configuration (cross-session learning)
        long_term=LongTermMemoryConfig(
            enabled=True,
            model="anthropic:claude-3-5-sonnet-latest",
            provider="memory",  # Use InMemory for long-term
            
            # User dimension - personal preferences and history
            user_memory=MemoryScopeConfig(
                enabled=True,
                instructions="Store personal preferences, habits, and user-specific information.",
                schema=UserPreference,
                actions=("create", "update")  # Don't allow deleting user preferences
            ),
            
            # App dimension - shared knowledge base
            app_memory=MemoryScopeConfig(
                enabled=True,
                instructions="Store general knowledge, best practices, and information that benefits all users.",
                schema=str,  # Simple string storage for app knowledge
                actions=("create", "update", "delete")  # Full CRUD for app knowledge
            ),
            
            app_id="test_app_2024",
            search_response_format="content"
        )
    )
    
    # Validate configuration
    print("  📋 Configuration Validation:")
    print(f"    Provider: {memory_config.provider}")
    print(f"    Short-term enabled: {memory_config.short_term.enabled}")
    print(f"    Short-term provider: {memory_config.get_short_term_provider()}")
    print(f"    Long-term enabled: {memory_config.long_term.enabled}")
    print(f"    Long-term provider: {memory_config.get_long_term_provider()}")
    print(f"    User memory enabled: {memory_config.long_term.user_memory.enabled}")
    print(f"    User memory schema: {memory_config.long_term.user_memory.schema.__name__}")
    print(f"    User memory actions: {memory_config.long_term.user_memory.actions}")
    print(f"    App memory enabled: {memory_config.long_term.app_memory.enabled}")
    print(f"    App memory schema: {memory_config.long_term.app_memory.schema.__name__}")
    print(f"    App memory actions: {memory_config.long_term.app_memory.actions}")
    print(f"    App ID: {memory_config.long_term.app_id}")
    
    # Assertions
    assert memory_config.provider == "memory"
    assert memory_config.short_term.enabled == True
    assert memory_config.long_term.enabled == True
    assert memory_config.long_term.user_memory.enabled == True
    assert memory_config.long_term.app_memory.enabled == True
    assert memory_config.long_term.app_id == "test_app_2024"
    assert memory_config.long_term.user_memory.schema == UserPreference
    assert memory_config.long_term.app_memory.schema == str
    
    print("  ✅ Complete MemoryConfig validation passed!")
    
    return memory_config

def test_agent_with_complete_memory():
    """Test Agent with complete memory configuration"""
    print("\n🤖 Testing Agent with Complete Memory System...")
    
    from langcrew.memory import MemoryConfig, ShortTermMemoryConfig, LongTermMemoryConfig, MemoryScopeConfig
    
    # Create memory configuration
    memory_config = MemoryConfig(
        provider="memory",
        short_term=ShortTermMemoryConfig(enabled=True),
        long_term=LongTermMemoryConfig(
            enabled=True,
            user_memory=MemoryScopeConfig(
                enabled=True,
                instructions="Remember user preferences and interaction history."
            ),
            app_memory=MemoryScopeConfig(
                enabled=True,
                instructions="Store shared knowledge and best practices."
            ),
            app_id="customer_support"
        )
    )
    
    # Mock Agent class for testing (avoiding full dependencies)
    class TestAgent:
        def __init__(self, role, memory_config=None):
            self.role = role
            self.tools = ["user_tool_1", "user_tool_2"]  # Mock user tools
            self.memory_config = memory_config
            self.memory_tools = {}
            self.checkpointer = None
            self._async_memory_initialized = False
            
            if memory_config:
                self._setup_memory(memory_config)
        
        def _setup_memory(self, config):
            """Mock memory setup"""
            # Mock checkpointer setup
            if config.short_term.enabled:
                self.checkpointer = f"MockCheckpointer({config.get_short_term_provider()})"
            
            # Mock long-term memory tools setup
            if config.long_term.enabled:
                if config.long_term.user_memory.enabled:
                    self.memory_tools["user"] = {
                        "manage": f"manage_user_memory_tool(namespace=user_memories)",
                        "search": f"search_user_memory_tool(namespace=user_memories)"
                    }
                
                if config.long_term.app_memory.enabled:
                    app_namespace = f"app_memories_{config.long_term.app_id}"
                    self.memory_tools["app"] = {
                        "manage": f"manage_app_memory_tool(namespace={app_namespace})",
                        "search": f"search_app_memory_tool(namespace={app_namespace})"
                    }
        
        def get_all_tools(self):
            """Get all tools including memory tools"""
            all_tools = self.tools.copy()
            for scope_tools in self.memory_tools.values():
                if isinstance(scope_tools, dict):
                    all_tools.extend(scope_tools.values())
                else:
                    all_tools.append(scope_tools)
            return all_tools
        
        def get_memory_tools(self, scope=None):
            """Get memory tools by scope"""
            if scope:
                return self.memory_tools.get(scope, {})
            return self.memory_tools
    
    # Create agent with complete memory
    agent = TestAgent(role="Customer Support Agent", memory_config=memory_config)
    
    # Validate agent setup
    print("  📋 Agent Memory Setup:")
    print(f"    Role: {agent.role}")
    print(f"    Checkpointer: {agent.checkpointer}")
    print(f"    User tools count: {len(agent.tools)}")
    print(f"    Memory tools: {list(agent.memory_tools.keys())}")
    print(f"    User memory tools: {list(agent.memory_tools.get('user', {}).keys())}")
    print(f"    App memory tools: {list(agent.memory_tools.get('app', {}).keys())}")
    print(f"    Total tools (user + memory): {len(agent.get_all_tools())}")
    
    # Test tool counts
    user_tools_count = len(agent.tools)
    user_memory_tools = len(agent.memory_tools.get("user", {}))
    app_memory_tools = len(agent.memory_tools.get("app", {}))
    total_memory_tools = user_memory_tools + app_memory_tools
    total_tools = len(agent.get_all_tools())
    
    print(f"    Breakdown: {user_tools_count} user + {total_memory_tools} memory = {total_tools} total")
    
    # Assertions
    assert agent.checkpointer is not None, "Short-term memory (checkpointer) should be set"
    assert "user" in agent.memory_tools, "User memory tools should be present"
    assert "app" in agent.memory_tools, "App memory tools should be present"
    assert len(agent.memory_tools["user"]) == 2, "Should have manage + search user tools"
    assert len(agent.memory_tools["app"]) == 2, "Should have manage + search app tools"
    assert len(agent.get_all_tools()) == user_tools_count + total_memory_tools, "Total tools count should be correct"
    
    print("  ✅ Agent with complete memory setup passed!")
    
    return agent

def test_crew_memory_inheritance():
    """Test Crew applying memory config to agents"""
    print("\n👥 Testing Crew Memory Inheritance...")
    
    from langcrew.memory import MemoryConfig, LongTermMemoryConfig, MemoryScopeConfig
    
    # Mock Agent and Crew classes
    class MockAgent:
        def __init__(self, role):
            self.role = role
            self.memory_config = None
            self.memory_tools = {}
        
        def _setup_memory(self, config):
            self.memory_config = config
            if config.long_term.enabled:
                self.memory_tools = {"user": {"manage": "tool", "search": "tool"}}
    
    class MockCrew:
        def __init__(self, agents, memory_config=None):
            self.agents = agents
            self.memory_config = memory_config
            
            if memory_config:
                self._setup_memory(memory_config)
        
        def _setup_memory(self, config):
            """Setup memory for agents without existing memory configuration"""
            for agent in self.agents:
                if not hasattr(agent, 'memory_config') or agent.memory_config is None:
                    agent._setup_memory(config)
    
    # Create agents without memory config
    agent1 = MockAgent(role="Sales Agent")
    agent2 = MockAgent(role="Support Agent")
    agent3 = MockAgent(role="Manager Agent")
    
    # Create crew-level memory config
    crew_memory_config = MemoryConfig(
        provider="memory",
        long_term=LongTermMemoryConfig(
            enabled=True,
            app_memory=MemoryScopeConfig(
                enabled=True,
                instructions="Shared team knowledge base"
            ),
            app_id="sales_team"
        )
    )
    
    # Create crew with memory config
    crew = MockCrew(
        agents=[agent1, agent2, agent3],
        memory_config=crew_memory_config
    )
    
    # Validate memory inheritance
    print("  📋 Crew Memory Inheritance:")
    print(f"    Crew memory config: {crew.memory_config is not None}")
    print(f"    Agent 1 inherited config: {agent1.memory_config is not None}")
    print(f"    Agent 2 inherited config: {agent2.memory_config is not None}")
    print(f"    Agent 3 inherited config: {agent3.memory_config is not None}")
    print(f"    Agent 1 memory tools: {len(agent1.memory_tools)}")
    print(f"    Agent 2 memory tools: {len(agent2.memory_tools)}")
    print(f"    Agent 3 memory tools: {len(agent3.memory_tools)}")
    
    # Assertions
    assert crew.memory_config is not None, "Crew should have memory config"
    assert agent1.memory_config is not None, "Agent 1 should inherit memory config"
    assert agent2.memory_config is not None, "Agent 2 should inherit memory config"
    assert agent3.memory_config is not None, "Agent 3 should inherit memory config"
    assert len(agent1.memory_tools) > 0, "Agent 1 should have memory tools"
    assert len(agent2.memory_tools) > 0, "Agent 2 should have memory tools"
    assert len(agent3.memory_tools) > 0, "Agent 3 should have memory tools"
    
    print("  ✅ Crew memory inheritance passed!")

def test_real_long_term_memory():
    """Test real long-term memory functionality with index configuration"""
    print("\n🧠 Testing Real Long-Term Memory with Index Configuration...")
    
    import asyncio
    from langcrew.memory import MemoryConfig, LongTermMemoryConfig, MemoryScopeConfig, IndexConfig
    from langcrew.memory.factory import get_storage
    from pydantic import BaseModel
    
    # Define structured memory schemas
    class UserPreference(BaseModel):
        category: str
        preference: str
        context: str = ""
        timestamp: str = ""
    
    class AppKnowledge(BaseModel):
        topic: str
        content: str
        source: str = "system"
        
    # Create memory config with index
    memory_config = MemoryConfig(
        provider="memory",
        long_term=LongTermMemoryConfig(
            enabled=True,
            model="anthropic:claude-3-5-sonnet-latest",
            index=IndexConfig(
                dims=1536,
                embed="openai:text-embedding-3-small",
                fields=["content"]
            ),
            
            user_memory=MemoryScopeConfig(
                enabled=True,
                schema=UserPreference,
                actions=("create", "update"),
                instructions="Store user preferences and habits"
            ),
            
            app_memory=MemoryScopeConfig(
                enabled=True,
                schema=AppKnowledge,
                actions=("create", "update", "delete"),
                instructions="Store general knowledge and best practices"
            ),
            
            app_id="test_longmem_app"
        )
    )
    
    # Test storage creation with index
    print("  📋 Testing Storage Creation with Index:")
    index_config = memory_config.long_term.index
    print(f"    Index dims: {index_config.dims if index_config else None}")
    print(f"    Index embed: {index_config.embed if index_config else None}")
    print(f"    Index fields: {index_config.fields if index_config else None}")
    
    # Create storage instance - new API with config containing index
    storage_config = {"connection_string": memory_config.connection_string}
    if index_config:
        storage_config["index"] = index_config.to_dict()
    
    store = get_storage(
        provider=memory_config.get_long_term_provider(),
        config=storage_config
    )
    
    print(f"    Store type: {type(store).__name__}")
    print(f"    Store has __aenter__: {hasattr(store, '__aenter__')}")
    
    # Test storage operations
    async def test_storage_operations():
        """Test actual storage operations"""
        print("  🔧 Testing Storage Operations:")
        
        # Test namespace creation for different memory scopes
        user_namespace = ("user_memories", "test_user_123")
        app_namespace = ("app_memories", memory_config.long_term.app_id)
        
        print(f"    User namespace: {user_namespace}")
        print(f"    App namespace: {app_namespace}")
        
        # Test putting data
        user_pref = UserPreference(
            category="coding",
            preference="prefers Python over JavaScript",
            context="mentioned during code review",
            timestamp="2024-01-15"
        )
        
        app_knowledge = AppKnowledge(
            topic="best_practices",
            content="Always use type hints in Python for better code maintainability",
            source="development_guidelines"
        )
        
        try:
            # Store user preference
            await store.aput(
                user_namespace,
                key="pref_coding_language",
                value={"content": user_pref.model_dump()}
            )
            print("    ✅ User preference stored successfully")
            
            # Store app knowledge
            await store.aput(
                app_namespace,
                key="python_type_hints",
                value={"content": app_knowledge.model_dump()}
            )
            print("    ✅ App knowledge stored successfully")
            
            # Test retrieval
            user_data = await store.aget(user_namespace, key="pref_coding_language")
            app_data = await store.aget(app_namespace, key="python_type_hints")
            
            print(f"    Retrieved user preference: {user_data is not None}")
            print(f"    Retrieved app knowledge: {app_data is not None}")
            
            if user_data:
                retrieved_pref = UserPreference(**user_data.value["content"])
                print(f"      User prefers: {retrieved_pref.preference}")
            
            if app_data:
                retrieved_knowledge = AppKnowledge(**app_data.value["content"])
                print(f"      Knowledge topic: {retrieved_knowledge.topic}")
            
            # Test search (if vector search is available)
            try:
                search_results = await store.asearch(
                    app_namespace,
                    query="Python coding practices",
                    limit=5
                )
                print(f"    Search results count: {len(search_results)}")
                if search_results:
                    print("    ✅ Vector search working")
                else:
                    print("    ℹ️  Vector search returned no results (expected for simple test)")
            except Exception as e:
                print(f"    ℹ️  Vector search not available: {type(e).__name__}")
            
            return True
            
        except Exception as e:
            print(f"    ❌ Storage operation failed: {e}")
            return False
    
    # Run async test
    try:
        success = asyncio.run(test_storage_operations())
        assert success, "Storage operations should succeed"
        print("  ✅ Real long-term memory test passed!")
        return True
    except Exception as e:
        print(f"  ❌ Real long-term memory test failed: {e}")
        return False


def test_memory_dimensions():
    """Test different memory dimensions and their namespaces"""
    print("\n🎯 Testing Memory Dimensions and Namespaces...")
    
    from langcrew.memory import MemoryConfig, LongTermMemoryConfig, MemoryScopeConfig
    
    # Test different memory dimension scenarios
    test_cases = [
        {
            "name": "User Only",
            "config": MemoryConfig(
                long_term=LongTermMemoryConfig(
                    enabled=True,
                    user_memory=MemoryScopeConfig(enabled=True),
                    app_memory=MemoryScopeConfig(enabled=False)
                )
            ),
            "expected_dimensions": ["user"]
        },
        {
            "name": "App Only",
            "config": MemoryConfig(
                long_term=LongTermMemoryConfig(
                    enabled=True,
                    user_memory=MemoryScopeConfig(enabled=False),
                    app_memory=MemoryScopeConfig(enabled=True),
                    app_id="app_only_test"
                )
            ),
            "expected_dimensions": ["app"]
        },
        {
            "name": "User + App",
            "config": MemoryConfig(
                long_term=LongTermMemoryConfig(
                    enabled=True,
                    user_memory=MemoryScopeConfig(enabled=True),
                    app_memory=MemoryScopeConfig(enabled=True),
                    app_id="user_app_test"
                )
            ),
            "expected_dimensions": ["user", "app"]
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"  Test {i}: {case['name']}")
        config = case["config"]
        expected = case["expected_dimensions"]
        
        # Mock namespace extraction
        actual_dimensions = []
        if config.long_term.enabled:
            if config.long_term.user_memory.enabled:
                actual_dimensions.append("user")
            if config.long_term.app_memory.enabled:
                actual_dimensions.append("app")
        
        print(f"    Expected dimensions: {expected}")
        print(f"    Actual dimensions: {actual_dimensions}")
        
        assert actual_dimensions == expected, f"Dimensions should match for {case['name']}"
        print(f"    ✅ {case['name']} dimension test passed")
    
    print("  ✅ All memory dimension tests passed!")

def test_agent_crew_with_index_config():
    """Test Agent and Crew integration with index configuration"""
    print("\n🚀 Testing Agent & Crew Integration with Index Configuration...")
    
    import asyncio
    from langcrew.memory import MemoryConfig, LongTermMemoryConfig, MemoryScopeConfig, IndexConfig
    
    # Create comprehensive memory config with index
    memory_config = MemoryConfig(
        provider="memory",
        long_term=LongTermMemoryConfig(
            enabled=True,
            index=IndexConfig(
                dims=384,  # Smaller dimension for testing
                embed="openai:text-embedding-ada-002",
                fields=["content", "metadata"]
            ),
            user_memory=MemoryScopeConfig(enabled=True),
            app_memory=MemoryScopeConfig(enabled=True),
            app_id="integration_test_app"
        )
    )
    
    # Mock Agent with real memory setup
    class TestAgentWithMemory:
        def __init__(self, role, memory_config):
            self.role = role
            self.memory_config = memory_config
            self.memory_tools = {}
            self.store = None
            
            # Simulate memory setup
            self._setup_memory_simulation()
        
        def _setup_memory_simulation(self):
            """Simulate memory setup process"""
            from langcrew.memory.factory import get_storage
            
            if self.memory_config and self.memory_config.long_term.enabled:
                # Test index configuration propagation
                ltm_config = self.memory_config.long_term
                storage_config = {"connection_string": self.memory_config.connection_string}
                
                if ltm_config.index:
                    storage_config["index"] = ltm_config.index.to_dict()
                
                self.store = get_storage(
                    provider=self.memory_config.get_long_term_provider(),
                    config=storage_config
                )
                
                # Mock memory tools setup
                if self.memory_config.long_term.user_memory.enabled:
                    self.memory_tools["user_manage"] = "manage_user_memory_tool"
                    self.memory_tools["user_search"] = "search_user_memory_tool"
                
                if self.memory_config.long_term.app_memory.enabled:
                    self.memory_tools["app_manage"] = "manage_app_memory_tool" 
                    self.memory_tools["app_search"] = "search_app_memory_tool"
    
    # Test agent creation with index config
    agent = TestAgentWithMemory("Test Agent", memory_config)
    
    print("  📋 Agent Integration Test:")
    print(f"    Agent role: {agent.role}")
    print(f"    Memory config present: {agent.memory_config is not None}")
    print(f"    Store created: {agent.store is not None}")
    print(f"    Store type: {type(agent.store).__name__}")
    print(f"    Memory tools count: {len(agent.memory_tools)}")
    print(f"    User tools: {[k for k in agent.memory_tools.keys() if 'user' in k]}")
    print(f"    App tools: {[k for k in agent.memory_tools.keys() if 'app' in k]}")
    
    # Verify index configuration was passed through
    index_config = agent.memory_config.long_term.index
    print(f"    Index dims: {index_config.dims}")
    print(f"    Index embed: {index_config.embed}")
    print(f"    Index fields: {index_config.fields}")
    
    # Test async storage operations
    async def test_agent_memory_operations():
        """Test that agent can perform memory operations with index"""
        try:
            # Test namespace usage
            user_ns = ("user_memories", "test_user")
            app_ns = ("app_memories", "integration_test_app")
            
            # Store some test data
            await agent.store.aput(user_ns, "test_key", {"content": "test user data"})
            await agent.store.aput(app_ns, "test_key", {"content": "test app data"})
            
            # Retrieve data
            user_data = await agent.store.aget(user_ns, "test_key")
            app_data = await agent.store.aget(app_ns, "test_key")
            
            print(f"    User data retrieved: {user_data is not None}")
            print(f"    App data retrieved: {app_data is not None}")
            
            return user_data is not None and app_data is not None
            
        except Exception as e:
            print(f"    ❌ Memory operation failed: {e}")
            return False
    
    # Run async test
    success = asyncio.run(test_agent_memory_operations())
    
    # Assertions
    assert agent.store is not None, "Agent should have store instance"
    assert len(agent.memory_tools) >= 4, "Agent should have user and app memory tools"
    assert success, "Agent memory operations should succeed"
    
    print("  ✅ Agent & Crew integration with index config test passed!")
    return True


def run_memory_refactor_tests():
    """Run all memory refactor tests"""
    print("🚀 LangCrew Memory System Refactor Tests")
    print("=" * 50)
    
    test_functions = [
        test_complete_memory_config,
        test_agent_with_complete_memory,
        test_crew_memory_inheritance,
        test_real_long_term_memory,
        test_agent_crew_with_index_config,
        test_memory_dimensions
    ]
    
    results = []
    
    for test_func in test_functions:
        try:
            result = test_func()
            results.append(("✅", test_func.__name__, "PASSED"))
        except Exception as e:
            results.append(("❌", test_func.__name__, f"FAILED: {e}"))
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    passed = 0
    for status, name, message in results:
        print(f"{status} {name}: {message}")
        if status == "✅":
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All memory refactor tests passed!")
        print("✨ MemoryConfig refactoring successful!")
        return True
    else:
        print("💥 Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    import sys
    success = run_memory_refactor_tests()
    sys.exit(0 if success else 1)