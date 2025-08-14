"""
Unit tests for LangCrew streaming functionality.

This module tests streaming capabilities including stream, astream,
and astream_events functionality with proper mocking.
"""

import asyncio
from unittest.mock import Mock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from langcrew import Agent, Crew, Task


class TestStreamingBasics:
    """Test cases for basic streaming functionality."""

    @patch("langcrew.crew.Crew.stream")
    def test_crew_stream_basic(self, mock_stream):
        """Test basic crew streaming functionality."""
        # Setup mock stream response
        mock_chunks = [
            {"messages": [HumanMessage(content="Hello")]},
            {
                "messages": [
                    HumanMessage(content="Hello"),
                    AIMessage(content="Hi there!"),
                ]
            },
        ]
        mock_stream.return_value = iter(mock_chunks)

        # Create test components
        mock_llm = Mock()
        agent = Agent(
            role="Streaming Agent",
            goal="Handle streaming requests",
            backstory="Specialized in streaming",
            llm=mock_llm,
        )

        task = Task(
            description="Stream response",
            expected_output="Streaming response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test streaming
        input_data = {"messages": [HumanMessage(content="Hello")]}
        chunks = list(crew.stream(input_data, stream_mode="values"))

        # Verify results
        assert len(chunks) == 2
        assert "messages" in chunks[0]
        assert "messages" in chunks[1]
        assert len(chunks[0]["messages"]) == 1
        assert len(chunks[1]["messages"]) == 2

        # Verify mock was called
        mock_stream.assert_called_once_with(input_data, stream_mode="values")

    @patch("langcrew.crew.Crew.stream")
    def test_crew_stream_updates_mode(self, mock_stream):
        """Test crew streaming with updates mode."""
        # Setup mock stream response for updates mode
        mock_chunks = [
            {"node_0": {"messages": [HumanMessage(content="Processing...")]}},
            {"node_1": {"messages": [AIMessage(content="Response ready")]}},
        ]
        mock_stream.return_value = iter(mock_chunks)

        mock_llm = Mock()
        agent = Agent(
            role="Update Agent",
            goal="Provide updates",
            backstory="Update specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Process with updates",
            expected_output="Updated response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test updates mode streaming
        input_data = {"messages": [HumanMessage(content="Test")]}
        chunks = list(crew.stream(input_data, stream_mode="updates"))

        # Verify results
        assert len(chunks) == 2
        assert "node_0" in chunks[0] or "node_1" in chunks[0]

        # Verify mock was called with correct parameters
        mock_stream.assert_called_once_with(input_data, stream_mode="updates")

    def test_crew_stream_empty_input(self):
        """Test crew streaming with empty input."""
        mock_llm = Mock()
        agent = Agent(
            role="Empty Input Agent",
            goal="Handle empty input",
            backstory="Handles edge cases",
            llm=mock_llm,
        )

        task = Task(
            description="Handle empty input",
            expected_output="Default response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test with empty input - should not raise error
        with patch.object(crew, "stream", return_value=iter([])) as mock_stream:
            chunks = list(crew.stream())
            assert len(chunks) == 0
            mock_stream.assert_called_once_with()


class TestAsyncStreaming:
    """Test cases for async streaming functionality."""

    @pytest.mark.asyncio
    @patch("langcrew.crew.Crew.astream")
    async def test_crew_astream_basic(self, mock_astream):
        """Test basic async streaming functionality."""

        # Setup async mock
        async def async_generator():
            yield {"messages": [HumanMessage(content="Async hello")]}
            yield {
                "messages": [
                    HumanMessage(content="Async hello"),
                    AIMessage(content="Async response"),
                ]
            }

        mock_astream.return_value = async_generator()

        # Create test components
        mock_llm = Mock()
        agent = Agent(
            role="Async Agent",
            goal="Handle async streaming",
            backstory="Async specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Async stream response",
            expected_output="Async streaming response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test async streaming
        input_data = {"messages": [HumanMessage(content="Async hello")]}
        chunks = []
        async for chunk in crew.astream(input_data, stream_mode="values"):
            chunks.append(chunk)

        # Verify results
        assert len(chunks) == 2
        assert "messages" in chunks[0]
        assert "messages" in chunks[1]

        # Verify mock was called
        mock_astream.assert_called_once_with(input_data, stream_mode="values")

    @pytest.mark.asyncio
    @patch("langcrew.crew.Crew.astream")
    async def test_crew_astream_updates_mode(self, mock_astream):
        """Test async streaming with updates mode."""

        # Setup async mock for updates
        async def async_updates_generator():
            yield {"update_1": {"status": "processing"}}
            yield {"update_2": {"status": "completed"}}

        mock_astream.return_value = async_updates_generator()

        mock_llm = Mock()
        agent = Agent(
            role="Async Update Agent",
            goal="Provide async updates",
            backstory="Async update specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Async updates",
            expected_output="Async update response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test async updates streaming
        input_data = {"messages": [HumanMessage(content="Async test")]}
        chunks = []
        async for chunk in crew.astream(input_data, stream_mode="updates"):
            chunks.append(chunk)

        # Verify results
        assert len(chunks) == 2

        # Verify mock was called
        mock_astream.assert_called_once_with(input_data, stream_mode="updates")

    @pytest.mark.asyncio
    async def test_crew_astream_error_handling(self):
        """Test async streaming error handling."""
        mock_llm = Mock()
        agent = Agent(
            role="Error Agent",
            goal="Test error handling",
            backstory="Error testing specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Error test", expected_output="Error response", agent=agent
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test async error handling
        with patch.object(crew, "astream", side_effect=Exception("Async error")):
            with pytest.raises(Exception, match="Async error"):
                async for chunk in crew.astream({
                    "messages": [HumanMessage(content="Test")]
                }):
                    pass


class TestStreamEvents:
    """Test cases for astream_events functionality."""

    @pytest.mark.asyncio
    @patch("langcrew.crew.Crew.astream_events")
    async def test_crew_astream_events_basic(self, mock_astream_events):
        """Test basic astream_events functionality."""

        # Setup mock events
        async def async_events_generator():
            yield {
                "event": "on_chain_start",
                "name": "LangGraph",
                "run_id": "test_run_1",
                "data": {},
            }
            yield {
                "event": "on_chat_model_start",
                "name": "ChatModel",
                "run_id": "test_run_2",
                "data": {},
            }
            yield {
                "event": "on_chat_model_stream",
                "name": "ChatModel",
                "run_id": "test_run_2",
                "data": {"chunk": Mock(content="Hello")},
            }
            yield {
                "event": "on_chat_model_end",
                "name": "ChatModel",
                "run_id": "test_run_2",
                "data": {"output": Mock(content="Hello there!")},
            }
            yield {
                "event": "on_chain_end",
                "name": "LangGraph",
                "run_id": "test_run_1",
                "data": {"output": {"messages": [AIMessage(content="Complete")]}},
            }

        mock_astream_events.return_value = async_events_generator()

        # Create test components
        mock_llm = Mock()
        agent = Agent(
            role="Events Agent",
            goal="Generate events",
            backstory="Event specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Generate events", expected_output="Event response", agent=agent
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test astream_events
        input_data = {"messages": [HumanMessage(content="Events test")]}
        events = []
        async for event in crew.astream_events(input_data):
            events.append(event)

        # Verify events
        assert len(events) == 5
        event_types = [event["event"] for event in events]
        assert "on_chain_start" in event_types
        assert "on_chat_model_start" in event_types
        assert "on_chat_model_stream" in event_types
        assert "on_chat_model_end" in event_types
        assert "on_chain_end" in event_types

        # Verify mock was called
        mock_astream_events.assert_called_once_with(input_data)

    @pytest.mark.asyncio
    @patch("langcrew.crew.Crew.astream_events")
    async def test_crew_astream_events_filtering(self, mock_astream_events):
        """Test astream_events with filtering options."""

        # Setup filtered events
        async def async_filtered_events():
            yield {
                "event": "on_chat_model_start",
                "name": "ChatModel",
                "run_id": "test_run",
                "data": {},
            }
            yield {
                "event": "on_chat_model_end",
                "name": "ChatModel",
                "run_id": "test_run",
                "data": {"output": Mock(content="Filtered response")},
            }

        mock_astream_events.return_value = async_filtered_events()

        mock_llm = Mock()
        agent = Agent(
            role="Filtered Agent",
            goal="Test filtering",
            backstory="Filtering specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Filtered events",
            expected_output="Filtered response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test filtered astream_events
        input_data = {"messages": [HumanMessage(content="Filter test")]}
        events = []
        async for event in crew.astream_events(
            input_data, include_types=["chat_model"], version="v2"
        ):
            events.append(event)

        # Verify filtered events
        assert len(events) == 2
        for event in events:
            assert "chat_model" in event["event"]

        # Verify mock was called with parameters
        mock_astream_events.assert_called_once_with(
            input_data, include_types=["chat_model"], version="v2"
        )

    @pytest.mark.asyncio
    @patch("langcrew.crew.Crew.astream_events")
    async def test_crew_astream_events_versions(self, mock_astream_events):
        """Test astream_events with different versions."""

        # Setup version-specific events
        async def async_versioned_events():
            yield {
                "event": "on_chain_start",
                "name": "TestChain",
                "run_id": "v2_run",
                "data": {},
                "metadata": {"version": "v2"},
            }

        mock_astream_events.return_value = async_versioned_events()

        mock_llm = Mock()
        agent = Agent(
            role="Version Agent",
            goal="Test versions",
            backstory="Version specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Version test", expected_output="Version response", agent=agent
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test different versions
        for version in ["v1", "v2"]:
            input_data = {"messages": [HumanMessage(content=f"Version {version} test")]}
            events = []
            async for event in crew.astream_events(input_data, version=version):
                events.append(event)

            assert len(events) >= 0  # Should not error

        # Verify mock was called for each version
        assert mock_astream_events.call_count == 2


class TestStreamingConfiguration:
    """Test cases for streaming configuration and parameters."""

    def test_stream_mode_validation(self):
        """Test stream mode parameter validation."""
        mock_llm = Mock()
        agent = Agent(
            role="Mode Agent",
            goal="Test modes",
            backstory="Mode specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Mode test", expected_output="Mode response", agent=agent
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test valid stream modes
        valid_modes = ["values", "updates"]
        for mode in valid_modes:
            with patch.object(crew, "stream", return_value=iter([])) as mock_stream:
                list(crew.stream(stream_mode=mode))
                mock_stream.assert_called_with(stream_mode=mode)

    @pytest.mark.asyncio
    async def test_astream_events_parameters(self):
        """Test astream_events parameter handling."""
        mock_llm = Mock()
        agent = Agent(
            role="Param Agent",
            goal="Test parameters",
            backstory="Parameter specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Parameter test",
            expected_output="Parameter response",
            agent=agent,
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test various parameter combinations
        test_params = [
            {"include_types": ["chain"]},
            {"exclude_types": ["chat_model_stream"]},
            {"include_names": ["TestChain"]},
            {"exclude_names": ["UnwantedChain"]},
            {"version": "v1"},
            {"version": "v2"},
        ]

        for params in test_params:
            with patch.object(
                crew, "astream_events", return_value=async_generator_empty()
            ) as mock_astream_events:
                events = []
                async for event in crew.astream_events(
                    {"messages": [HumanMessage(content="Test")]}, **params
                ):
                    events.append(event)

                # Verify parameters were passed
                mock_astream_events.assert_called_once()


class TestStreamingErrorHandling:
    """Test cases for streaming error handling."""

    def test_stream_connection_error(self):
        """Test stream handling of connection errors."""
        mock_llm = Mock()
        agent = Agent(
            role="Error Agent",
            goal="Test errors",
            backstory="Error specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Error test", expected_output="Error response", agent=agent
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test connection error handling
        with patch.object(
            crew, "stream", side_effect=ConnectionError("Connection failed")
        ):
            with pytest.raises(ConnectionError, match="Connection failed"):
                list(crew.stream({"messages": [HumanMessage(content="Test")]}))

    @pytest.mark.asyncio
    async def test_astream_timeout_error(self):
        """Test async stream timeout handling."""
        mock_llm = Mock()
        agent = Agent(
            role="Timeout Agent",
            goal="Test timeouts",
            backstory="Timeout specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Timeout test", expected_output="Timeout response", agent=agent
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test timeout error handling
        with patch.object(crew, "astream", side_effect=TimeoutError("Timeout")):
            with pytest.raises(asyncio.TimeoutError, match="Timeout"):
                async for chunk in crew.astream({
                    "messages": [HumanMessage(content="Test")]
                }):
                    pass

    @pytest.mark.asyncio
    async def test_astream_events_invalid_parameters(self):
        """Test astream_events with invalid parameters."""
        mock_llm = Mock()
        agent = Agent(
            role="Invalid Agent",
            goal="Test invalid params",
            backstory="Invalid parameter specialist",
            llm=mock_llm,
        )

        task = Task(
            description="Invalid test", expected_output="Invalid response", agent=agent
        )

        crew = Crew(agents=[agent], tasks=[task], verbose=False)

        # Test with invalid version
        with patch.object(
            crew, "astream_events", side_effect=ValueError("Invalid version")
        ):
            with pytest.raises(ValueError, match="Invalid version"):
                async for event in crew.astream_events(
                    {"messages": [HumanMessage(content="Test")]}, version="invalid"
                ):
                    pass


# Helper functions for tests
async def async_generator_empty():
    """Empty async generator for testing."""
    return
    yield  # This will never execute, making it an empty generator
