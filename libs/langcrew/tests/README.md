# LangCrew Testing Guide

This document provides comprehensive guidance on testing in the LangCrew project.

## Overview

LangCrew uses pytest as the primary testing framework, following industry-standard patterns and best practices from leading multi-agent frameworks. The test suite is organized into unit tests, integration tests, and includes comprehensive fixtures and utilities.

## Test Structure

```
tests/
├── __init__.py                 # Test package initialization
├── conftest.py                 # Global fixtures and configuration
├── test_setup.py              # Test environment verification
├── unit/                      # Unit tests - Fast, isolated tests
│   ├── __init__.py
│   ├── test_agent.py         # Agent module tests
│   └── test_utils.py         # Utility function tests
├── integration/               # Integration tests - Real component interactions
│   ├── __init__.py
│   └── test_crew_workflow.py # End-to-end workflow tests
├── fixtures/                  # Test fixtures and data
│   ├── __init__.py
│   ├── sample_configs.json   # Configuration files for tests
│   └── mock_responses.json   # Mock API responses
├── memory/                    # Memory system tests
└── tools/                     # Tool-specific tests
```

## Test Types Guide

### When to Use Each Test Type

#### Unit Tests (`tests/unit/`)
- **Purpose**: Test individual functions/classes in isolation
- **Characteristics**: Fast execution, heavy use of mocks, isolated testing
- **Use when**:
  - Testing single functions or methods
  - Testing data validation logic
  - Testing error handling
  - Testing algorithm logic
  - Can be completely isolated with mocks

#### Integration Tests (`tests/integration/`)
- **Purpose**: Test real interactions between components
- **Characteristics**: Use real objects, longer execution time, test real scenarios
- **Use when**:
  - Testing complete workflows
  - Testing multi-component collaboration
  - Testing external dependency integration
  - Testing end-to-end scenarios

#### Fixtures Directory (`tests/fixtures/`)
- **Purpose**: Store test data and configurations
- **Contents**:
  - Configuration files (JSON, YAML)
  - Mock data (API responses)
  - Sample documents
  - Test resources

### Decision Flow

```
Need to write a test?
├── Testing single function/method?
│   ├── Can be completely isolated? → Unit Test
│   └── Needs real object interaction? → Integration Test
├── Testing multiple components? → Integration Test
├── Testing complete workflow? → Integration Test
└── Need shared test data? → Store in fixtures/
```

## Running Tests

### Quick Start

```bash
# Install dependencies
make install

# Run all tests
make test

# Run with coverage
make coverage
```

### Specific Test Categories

```bash
# Unit tests only
make test-unit

# Integration tests only
make test-integration

# Fast tests (excluding slow ones)
make test-fast

# Slow tests only
make test-slow
```

### Test Discovery and Execution

```bash
# Run specific test file
PYTHONPATH=src uv run pytest tests/unit/test_agent.py -v

# Run specific test function
PYTHONPATH=src uv run pytest tests/unit/test_agent.py::TestAgent::test_agent_initialization -v

# Run tests matching pattern
PYTHONPATH=src uv run pytest -k "agent" -v

# Run tests with specific markers
PYTHONPATH=src uv run pytest -m "unit" -v
PYTHONPATH=src uv run pytest -m "integration" -v
PYTHONPATH=src uv run pytest -m "not slow" -v
```

### Parallel Testing

```bash
# Run tests in parallel
make test-parallel

# Or manually
PYTHONPATH=src uv run pytest -n auto --dist worksteal
```

### Watch Mode

```bash
# Run tests in watch mode (re-runs on file changes)
make test-watch
```

## Test Markers

The project uses several pytest markers to categorize tests:

- `@pytest.mark.unit`: Unit tests
- `@pytest.mark.integration`: Integration tests  
- `@pytest.mark.slow`: Slow tests that can be skipped
- `@pytest.mark.asyncio`: Async tests

## Fixtures

### Global Fixtures (conftest.py)

- `mock_llm`: Mock language model for testing
- `mock_agent`: Mock agent instance
- `mock_task`: Mock task instance
- `mock_crew`: Mock crew instance
- `mock_tool`: Mock tool instance
- `mock_memory`: Mock memory system
- `mock_config`: Mock configuration
- `temp_dir`: Temporary directory for file operations
- `sample_messages`: Sample message data

### Using Fixtures

```python
def test_agent_with_llm(mock_llm):
    """Test agent with mock LLM."""
    agent = Agent(
        name="test_agent",
        role="Tester",
        goal="Test things",
        backstory="Testing agent",
        llm=mock_llm
    )
    assert agent.llm == mock_llm

@pytest.mark.asyncio
async def test_async_functionality(async_mock_llm):
    """Test async functionality."""
    result = await some_async_function(async_mock_llm)
    assert result is not None
```

## Writing Tests

### Unit Test Example

```python
"""
Unit tests focus on testing individual components in isolation.
They use mocks extensively and execute quickly.
"""

import pytest
from unittest.mock import Mock, patch
from langcrew.agent import Agent

class TestAgent:
    """Test cases for the Agent class."""

    def test_agent_initialization(self):
        """Test agent initialization with valid parameters."""
        agent = Agent(
            role="Test Role",
            goal="Test Goal",
            backstory="Test backstory"
        )
        
        assert agent.role == "Test Role"
        assert agent.goal == "Test Goal"

    @patch('langcrew.agent.Agent._execute_task')
    def test_agent_execute_with_mock(self, mock_execute):
        """Test agent execution using mocks."""
        # Setup mock
        mock_execute.return_value = "Task completed"
        
        agent = Agent(role="researcher", goal="research")
        mock_task = Mock()
        mock_task.description = "Research AI trends"
        
        # Execute test
        result = agent.execute(mock_task)
        
        # Verify
        assert result == "Task completed"
        mock_execute.assert_called_once_with(mock_task)

    def test_agent_validation_errors(self):
        """Test agent parameter validation."""
        with pytest.raises(ValueError, match="Role cannot be empty"):
            Agent(role="", goal="test goal")
```

### Integration Test Example

```python
"""
Integration tests focus on testing real interactions between components.
They use real objects and test complete workflows.
"""

import pytest
from langcrew.agent import Agent
from langcrew.task import Task

@pytest.mark.integration
class TestCrewWorkflow:
    """Integration tests for crew execution."""

    def test_agent_task_real_interaction(self):
        """Test real Agent-Task interaction."""
        # Create real objects
        agent = Agent(
            role="Senior Research Analyst",
            goal="Uncover cutting-edge developments in AI",
            backstory="You're a seasoned researcher",
            verbose=False
        )
        
        task = Task(
            description="Write a brief summary about AI trends",
            expected_output="A 2-sentence summary",
            agent=agent
        )
        
        # Test real execution
        result = agent.execute(task)
        
        # Verify real results
        assert result is not None
        assert isinstance(result, str)
        assert len(result.strip()) > 0

    def test_multi_agent_collaboration(self):
        """Test multiple agents working together."""
        # Create researcher agent
        researcher = Agent(
            role="Senior Research Analyst",
            goal="Research AI developments",
            backstory="You're a seasoned researcher"
        )
        
        # Create writer agent
        writer = Agent(
            role="Tech Content Strategist",
            goal="Write compelling content",
            backstory="You're a renowned content strategist"
        )
        
        # Create dependent tasks
        research_task = Task(
            description="Research latest AI trends",
            expected_output="Research findings",
            agent=researcher
        )
        
        writing_task = Task(
            description="Write blog post based on research",
            expected_output="Blog post",
            agent=writer,
            context=[research_task]
        )
        
        # Execute workflow
        research_result = researcher.execute(research_task)
        writing_result = writer.execute(writing_task)
        
        # Verify collaboration
        assert research_result is not None
        assert writing_result is not None
```

### Using Fixtures from files

```python
"""
Example of using fixtures stored in tests/fixtures/
"""

import json
import pytest

@pytest.fixture
def agent_config():
    """Load agent configuration from fixtures."""
    with open('tests/fixtures/sample_configs.json', 'r') as f:
        config = json.load(f)
    return config['agent_configs']['researcher']

@pytest.fixture  
def mock_llm_response():
    """Load mock LLM response from fixtures."""
    with open('tests/fixtures/mock_responses.json', 'r') as f:
        responses = json.load(f)
    return responses['llm_responses']['research_response']

def test_agent_with_config_fixture(agent_config):
    """Test agent creation using configuration fixture."""
    agent = Agent(**agent_config)
    assert agent.role == "Senior Research Analyst"
    assert "seasoned researcher" in agent.backstory.lower()

def test_mock_response_fixture(mock_llm_response):
    """Test using mock response fixture."""
    assert "AI development has accelerated" in mock_llm_response['content']
    assert mock_llm_response['role'] == "assistant"
```

## Coverage

### Running Coverage

```bash
# Generate coverage report
make coverage

# Generate XML coverage (for CI)
make coverage-xml
```

### Coverage Configuration

Coverage is configured in `pyproject.toml`:

```toml
[tool.coverage.run]
source = ["src/langcrew"]
omit = ["tests/*", "src/langcrew/__pycache__/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

## Continuous Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Multiple Python versions (3.11, 3.12)

### CI Commands

```bash
# Run full CI pipeline locally
make ci

# Run fast CI pipeline
make ci-fast
```

## Best Practices

### 1. Test Organization

- **Unit tests**: Test individual components in isolation with mocks
- **Integration tests**: Test real component interactions
- **Use descriptive test names**: `test_agent_initialization_with_valid_config`
- **Group related tests**: Use test classes to organize related functionality

### 2. Choosing Test Type

**Write Unit Tests when:**
- Testing single functions/methods
- Can be completely isolated with mocks
- Testing data validation logic
- Testing error handling
- Need fast execution (< 1 second)

**Write Integration Tests when:**
- Testing multiple components together
- Testing complete workflows
- Testing real object interactions
- Testing external dependencies
- Testing end-to-end scenarios

### 3. Test Data and Fixtures

- **Use fixtures for reusable test data**: Store in `tests/fixtures/`
- **Mock external dependencies**: Use mocks for LLMs, databases, APIs
- **Isolate tests**: Each test should be independent
- **Load test data from files**: Use JSON/YAML files for complex test data

### 4. Assertions and Error Testing

- **Use descriptive assertion messages**: `assert result == expected, f"Expected {expected}, got {result}"`
- **Test both positive and negative cases**: Happy path and error conditions
- **Use pytest.raises for exceptions**: `with pytest.raises(ValueError, match="error message")`
- **Test edge cases and boundary conditions**

### 5. Mock Usage

- **Unit tests**: Use mocks extensively to isolate components
- **Integration tests**: Use real objects, minimal mocking
- **Mock external services**: Always mock LLM calls, API requests, file I/O
- **Verify mock calls**: Use `assert_called_once_with()` to verify interactions

### 6. Performance and Execution

- **Mark slow tests**: Use `@pytest.mark.slow`
- **Use parametrized tests**: Test multiple inputs efficiently
- **Keep unit tests fast**: Target < 1 second per test
- **Run tests in parallel**: Use `pytest-xdist` for faster execution

## Quick Reference

### Test Type Decision Matrix

| Scenario | Test Type | Location | Characteristics |
|----------|-----------|----------|----------------|
| Single function/method | Unit | `tests/unit/` | Fast, isolated, heavy mocking |
| Multiple components | Integration | `tests/integration/` | Real objects, longer execution |
| Complete workflow | Integration | `tests/integration/` | End-to-end, realistic scenarios |
| Shared test data | Fixtures | `tests/fixtures/` | JSON/YAML configuration files |

### Common Commands

```bash
# Run all tests
make test

# Run by type
make test-unit          # Fast unit tests
make test-integration   # Integration tests
make test-parallel      # Parallel execution

# Run specific tests
PYTHONPATH=src uv run pytest tests/unit/test_agent.py -v
PYTHONPATH=src uv run pytest -k "agent" -v
PYTHONPATH=src uv run pytest -m "unit" -v

# Debug tests
PYTHONPATH=src uv run pytest -s --pdb -x
```

### Test Writing Checklist

- [ ] Choose appropriate test type (unit vs integration)
- [ ] Use descriptive test names
- [ ] Add appropriate markers (`@pytest.mark.unit`, `@pytest.mark.integration`)
- [ ] Mock external dependencies in unit tests
- [ ] Use real objects in integration tests
- [ ] Test both success and error cases
- [ ] Add docstrings for complex tests
- [ ] Store reusable data in fixtures/

### Common Patterns

```python
# Unit test pattern
@patch('module.external_dependency')
def test_function_isolated(mock_dependency):
    mock_dependency.return_value = "expected"
    result = function_under_test()
    assert result == "expected"
    mock_dependency.assert_called_once()

# Integration test pattern
@pytest.mark.integration
def test_real_workflow():
    component_a = RealComponentA()
    component_b = RealComponentB()
    result = component_a.process(component_b)
    assert result.is_valid()

# Fixture usage
def test_with_config_fixture(agent_config):
    agent = Agent(**agent_config)
    assert agent.role == "Senior Research Analyst"
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure `PYTHONPATH=src` is set
2. **Fixture Not Found**: Check fixture is defined in `conftest.py`
3. **Async Test Issues**: Use `@pytest.mark.asyncio`
4. **Mock Issues**: Verify patch targets and mock setup

### Getting Help

- Check existing test files for patterns
- See `tests/examples_comparison.py` for detailed examples
- Review `conftest.py` for available fixtures
- Run `make help` for available commands

---

This testing framework follows industry best practices and provides a solid foundation for maintaining code quality in LangCrew.