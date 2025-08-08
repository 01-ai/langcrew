"""
Unit tests for basic LangCrew workflow functionality.

This module tests the core workflow components including Agent, Task, and Crew
in isolated scenarios with proper mocking.
"""

from unittest.mock import Mock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from langcrew import Agent, Crew, Task


class TestBasicWorkflow:
    """Test cases for basic LangCrew workflow functionality."""

    def test_agent_initialization_with_basic_config(self) -> None:
        """Test agent initialization with basic configuration."""
        agent = Agent(
            role="Test Assistant",
            goal="Provide helpful responses",
            backstory="A test assistant for unit testing",
            tools=[],
            llm=Mock(),
        )

        assert agent.role == "Test Assistant"
        assert agent.goal == "Provide helpful responses"
        assert agent.backstory and "test assistant" in agent.backstory.lower()
        assert agent.tools == []
        assert agent.llm is not None

    def test_task_initialization_with_agent(self) -> None:
        """Test task initialization with agent assignment."""
        mock_llm = Mock()
        agent = Agent(
            role="Test Agent",
            goal="Test goal",
            backstory="Test backstory",
            llm=mock_llm,
        )

        task = Task(
            description="Test task description",
            expected_output="Test expected output",
            agent=agent,
        )

        assert task.description == "Test task description"
        assert task.expected_output == "Test expected output"
        assert task.agent == agent

    @patch("langcrew.crew.Crew.invoke")
    def test_crew_basic_invocation(self, mock_invoke) -> None:
        """Test basic crew invocation with mocked response."""
        # Setup mock response
        mock_response = {
            "messages": [
                HumanMessage(content="Hello"),
                AIMessage(content="Hi there! How can I help you today?"),
            ]
        }
        mock_invoke.return_value = mock_response

        # Create test components
        mock_llm = Mock()
        agent = Agent(
            role="Helpful Assistant",
            goal="Provide helpful responses",
            backstory="A friendly assistant",
            llm=mock_llm,
        )

        task = Task(
            description="Respond to user greeting",
            expected_output="Friendly greeting response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test invocation
        input_data = {"messages": [HumanMessage(content="Hello")]}
        result = crew.invoke(input_data)

        # Verify results
        assert result is not None
        assert "messages" in result
        assert len(result["messages"]) == 2
        assert result["messages"][0].content == "Hello"
        assert "help" in result["messages"][1].content.lower()

        # Verify mock was called
        mock_invoke.assert_called_once_with(input_data)

    def test_crew_initialization_with_multiple_agents(self) -> None:
        """Test crew initialization with multiple agents."""
        mock_llm = Mock()

        agent1 = Agent(
            role="Researcher",
            goal="Research information",
            backstory="Research specialist",
            llm=mock_llm,
        )

        agent2 = Agent(
            role="Writer",
            goal="Write content",
            backstory="Content writer",
            llm=mock_llm,
        )

        task1 = Task(
            description="Research topic",
            expected_output="Research findings",
            agent=agent1,
        )

        task2 = Task(
            description="Write article", expected_output="Written article", agent=agent2
        )

        crew = Crew(agents=[agent1, agent2], tasks=[task1, task2], verbose=False)

        assert len(crew.agents) == 2
        assert len(crew.tasks) == 2
        assert crew.agents[0].role == "Researcher"
        assert crew.agents[1].role == "Writer"

    def test_agent_with_empty_tools_list(self) -> None:
        """Test agent initialization with empty tools list."""
        mock_llm = Mock()
        agent = Agent(
            role="Simple Agent",
            goal="Simple goal",
            backstory="Simple backstory",
            tools=[],
            llm=mock_llm,
        )

        assert agent.tools == []
        assert len(agent.tools) == 0

    def test_task_requires_agent_assignment(self) -> None:
        """Test task initialization requires agent assignment."""
        mock_llm = Mock()
        agent = Agent(
            role="Test Agent",
            goal="Test goal",
            backstory="Test backstory",
            llm=mock_llm,
        )

        # Task must have an agent
        task = Task(description="Test task", expected_output="Task output", agent=agent)

        assert task.description == "Test task"
        assert task.expected_output == "Task output"
        assert task.agent == agent

    def test_crew_with_verbose_mode(self) -> None:
        """Test crew initialization with verbose mode enabled."""
        mock_llm = Mock()
        agent = Agent(
            role="Test Agent",
            goal="Test goal",
            backstory="Test backstory",
            llm=mock_llm,
        )

        task = Task(description="Test task", expected_output="Test output", agent=agent)

        crew = Crew(agents=[agent], tasks=[task], verbose=True)

        assert crew.verbose is True

    @patch("langcrew.crew.Crew.invoke")
    def test_crew_error_handling(self, mock_invoke) -> None:
        """Test crew error handling during invocation."""
        # Setup mock to raise an exception
        mock_invoke.side_effect = Exception("Test error")

        mock_llm = Mock()
        agent = Agent(
            role="Test Agent",
            goal="Test goal",
            backstory="Test backstory",
            llm=mock_llm,
        )

        task = Task(description="Test task", expected_output="Test output", agent=agent)

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test error handling
        input_data = {"messages": [HumanMessage(content="Test")]}

        with pytest.raises(Exception, match="Test error"):
            crew.invoke(input_data)

    def test_agent_role_validation(self):
        """Test agent role validation."""
        mock_llm = Mock()

        # Test with valid role
        agent = Agent(
            role="Valid Role",
            goal="Valid goal",
            backstory="Valid backstory",
            llm=mock_llm,
        )
        assert agent.role == "Valid Role"

        # Test with custom prompts (role can be None)
        agent_custom = Agent(
            role=None,
            goal=None,
            backstory=None,
            llm=mock_llm,
            prompts={"execute": "Custom execute prompt"},
        )
        assert agent_custom.role is None

    def test_task_description_validation(self) -> None:
        """Test task description validation."""
        mock_llm = Mock()
        agent = Agent(
            role="Test Agent",
            goal="Test goal",
            backstory="Test backstory",
            llm=mock_llm,
        )

        # Test with valid description
        task = Task(
            description="Valid task description",
            expected_output="Valid output",
            agent=agent,
        )
        assert task.description == "Valid task description"

        # Test that empty description raises error
        with pytest.raises(ValueError, match="TaskSpec must have a description"):
            Task(description="", expected_output="Valid output", agent=agent)

    @patch("langcrew.crew.Crew.invoke")
    def test_crew_message_handling(self, mock_invoke) -> None:
        """Test crew message handling and response format."""
        # Setup mock response with proper message format
        mock_response = {
            "messages": [
                HumanMessage(content="Test input"),
                AIMessage(content="Test response from agent"),
            ],
            "task_outputs": ["Task completed successfully"],
        }
        mock_invoke.return_value = mock_response

        mock_llm = Mock()
        agent = Agent(
            role="Message Handler",
            goal="Handle messages properly",
            backstory="Specialized in message handling",
            llm=mock_llm,
        )

        task = Task(
            description="Process user message",
            expected_output="Processed response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test message handling
        input_data = {"messages": [HumanMessage(content="Test input")]}
        result = crew.invoke(input_data)

        # Verify message structure
        assert "messages" in result
        assert "task_outputs" in result
        assert len(result["messages"]) == 2
        assert isinstance(result["messages"][0], HumanMessage)
        assert isinstance(result["messages"][1], AIMessage)
        assert result["messages"][0].content == "Test input"
        assert result["messages"][1].content == "Test response from agent"


class TestWorkflowConfiguration:
    """Test cases for workflow configuration and setup."""

    def test_agent_configuration_parameters(self) -> None:
        """Test various agent configuration parameters."""
        mock_llm = Mock()

        agent = Agent(
            role="Configured Agent",
            goal="Test configuration",
            backstory="Agent with specific configuration",
            tools=[],
            llm=mock_llm,
            verbose=True,
            debug=True,
        )

        assert agent.role == "Configured Agent"
        assert agent.goal == "Test configuration"
        assert agent.verbose is True
        assert agent.debug is True

    def test_task_configuration_parameters(self) -> None:
        """Test various task configuration parameters."""
        mock_llm = Mock()
        agent = Agent(
            role="Task Agent",
            goal="Execute tasks",
            backstory="Task execution specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Configured task",
            expected_output="Configured output",
            agent=agent,
            context=None,
        )

        assert task.description == "Configured task"
        assert task.expected_output == "Configured output"
        assert task.agent == agent
        assert task.context is None

    def test_crew_configuration_parameters(self) -> None:
        """Test various crew configuration parameters."""
        mock_llm = Mock()
        agent = Agent(
            role="Crew Agent",
            goal="Work in crew",
            backstory="Team player",
            llm=mock_llm,
        )

        task = Task(description="Crew task", expected_output="Crew output", agent=agent)

        crew = Crew(agents=[agent], tasks=[task], verbose=True, memory=False)

        assert len(crew.agents) == 1
        assert len(crew.tasks) == 1
        assert crew.verbose is True
        assert crew.memory is False


class TestWorkflowValidation:
    """Test cases for workflow validation and error conditions."""

    def test_crew_with_no_agents(self) -> None:
        """Test crew initialization with no agents."""
        mock_llm = Mock()
        agent = Agent(
            role="Test Agent",
            goal="Test goal",
            backstory="Test backstory",
            llm=mock_llm,
        )

        task = Task(description="Test task", expected_output="Test output", agent=agent)

        crew = Crew(agents=[], tasks=[task], verbose=False)

        assert len(crew.agents) == 0
        assert len(crew.tasks) == 1

    def test_crew_with_no_tasks(self) -> None:
        """Test crew initialization with no tasks."""
        mock_llm = Mock()
        agent = Agent(
            role="Idle Agent",
            goal="Wait for tasks",
            backstory="Patient agent",
            llm=mock_llm,
        )

        crew = Crew(agents=[agent], tasks=[], verbose=False)

        assert len(crew.agents) == 1
        assert len(crew.tasks) == 0

    def test_agent_with_none_llm(self) -> None:
        """Test agent initialization with None LLM."""
        agent = Agent(
            role="No LLM Agent",
            goal="Work without LLM",
            backstory="Self-sufficient agent",
            llm=None,
        )

        assert agent.role == "No LLM Agent"
        assert agent.llm is None

    def test_task_with_none_values(self) -> None:
        """Test task initialization with None values raises error."""
        mock_llm = Mock()
        agent = Agent(
            role="Test Agent",
            goal="Test goal",
            backstory="Test backstory",
            llm=mock_llm,
        )

        # Test that None description raises error
        with pytest.raises(ValueError, match="TaskSpec must have a description"):
            Task(description="", expected_output="Valid output", agent=agent)
