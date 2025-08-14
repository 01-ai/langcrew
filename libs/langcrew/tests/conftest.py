"""
Global test configuration and fixtures for LangCrew tests.

This file contains pytest fixtures that are available to all tests
in the test suite.
"""

import asyncio
import os
import tempfile
from collections.abc import AsyncGenerator, Generator
from pathlib import Path
from typing import Any
from unittest.mock import Mock, patch

import pytest
from langchain_core.language_models.fake import FakeListLLM
from langchain_core.messages import AIMessage, HumanMessage

# Set test environment variables
os.environ["LANGCREW_ENV"] = "test"
os.environ["LANGCHAIN_TRACING_V2"] = "false"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield Path(tmp_dir)


@pytest.fixture
def mock_llm() -> FakeListLLM:
    """Create a mock LLM for testing."""
    return FakeListLLM(
        responses=[
            "This is a test response from the mock LLM.",
            "Another test response.",
            "Final test response.",
        ]
    )


@pytest.fixture
def sample_messages():
    """Sample messages for testing."""
    return [
        HumanMessage(content="Hello, how are you?"),
        AIMessage(content="I'm doing well, thank you!"),
        HumanMessage(content="What can you help me with?"),
    ]


@pytest.fixture
def mock_config() -> dict[str, Any]:
    """Mock configuration for testing."""
    return {
        "llm": {
            "model": "gpt-3.5-turbo",
            "temperature": 0.7,
            "max_tokens": 1000,
        },
        "agent": {
            "max_iterations": 5,
            "timeout": 30,
        },
        "memory": {
            "type": "buffer",
            "max_token_limit": 2000,
        },
    }


@pytest.fixture
def mock_agent():
    """Create a mock agent for testing."""
    mock = Mock()
    mock.name = "test_agent"
    mock.role = "Test Agent"
    mock.goal = "Perform test operations"
    mock.backstory = "A test agent for unit testing"
    mock.verbose = False
    mock.allow_delegation = False
    return mock


@pytest.fixture
def mock_task():
    """Create a mock task for testing."""
    mock = Mock()
    mock.description = "Test task description"
    mock.expected_output = "Test output"
    mock.agent = None
    mock.tools = []
    return mock


@pytest.fixture
def mock_crew():
    """Create a mock crew for testing."""
    mock = Mock()
    mock.agents = []
    mock.tasks = []
    mock.verbose = False
    mock.process = "sequential"
    return mock


@pytest.fixture
def mock_tool():
    """Create a mock tool for testing."""
    mock = Mock()
    mock.name = "test_tool"
    mock.description = "A test tool for unit testing"
    mock.func = lambda x: f"Tool result for: {x}"
    return mock


@pytest.fixture
async def async_mock_llm():
    """Create an async mock LLM for testing."""
    mock = Mock()
    mock.agenerate = Mock(return_value="Async test response")
    mock.ainvoke = Mock(return_value=AIMessage(content="Async test response"))
    return mock


@pytest.fixture
def mock_memory():
    """Create a mock memory for testing."""
    mock = Mock()
    mock.buffer = []
    mock.add = Mock()
    mock.get = Mock(return_value=[])
    mock.clear = Mock()
    return mock


@pytest.fixture
def mock_context():
    """Create a mock context for testing."""
    return {
        "session_id": "test_session_123",
        "user_id": "test_user_456",
        "timestamp": "2024-01-01T00:00:00Z",
        "metadata": {"test": True},
    }


@pytest.fixture
def mock_database():
    """Create a mock database connection for testing."""
    mock = Mock()
    mock.execute = Mock()
    mock.fetchall = Mock(return_value=[])
    mock.fetchone = Mock(return_value=None)
    mock.commit = Mock()
    mock.rollback = Mock()
    mock.close = Mock()
    return mock


@pytest.fixture
def patch_environment():
    """Patch environment variables for testing."""
    with patch.dict(os.environ, {"LANGCREW_ENV": "test", "DEBUG": "true"}):
        yield


@pytest.fixture
def mock_http_client():
    """Create a mock HTTP client for testing."""
    mock = Mock()
    mock.get = Mock()
    mock.post = Mock()
    mock.put = Mock()
    mock.delete = Mock()
    return mock


@pytest.fixture
def sample_agent_config():
    """Sample agent configuration for testing."""
    return {
        "name": "test_agent",
        "role": "Test Specialist",
        "goal": "Execute test operations efficiently",
        "backstory": "An experienced agent specialized in testing scenarios",
        "verbose": True,
        "allow_delegation": False,
        "max_iter": 5,
        "max_rpm": 10,
        "system_template": "You are a helpful test agent.",
    }


@pytest.fixture
def sample_task_config():
    """Sample task configuration for testing."""
    return {
        "description": "Analyze the test data and provide insights",
        "expected_output": "A detailed analysis report with key findings",
        "agent": "test_agent",
        "tools": ["test_tool"],
        "context": ["previous_task"],
        "output_file": "test_output.txt",
    }


# Async fixtures
@pytest.fixture
async def async_temp_dir() -> AsyncGenerator[Path, None]:
    """Create a temporary directory for async test files."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield Path(tmp_dir)


@pytest.fixture
async def async_mock_crew():
    """Create an async mock crew for testing."""
    mock = Mock()
    mock.agents = []
    mock.tasks = []
    mock.verbose = False
    mock.process = "sequential"
    mock.kickoff = Mock(return_value="Async crew execution result")
    return mock


# Test markers
pytestmark = pytest.mark.anyio
