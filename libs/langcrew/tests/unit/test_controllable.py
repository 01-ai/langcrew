"""
Unit tests for Controllable module.

Tests core functionality:
- RunHandle status management
- RunHandle result retrieval
- Controllable stop/status operations
- run_id extraction from config
"""

import asyncio

import pytest

from langcrew.controllable import (
    Controllable,
    ControllableAgent,
    ControllableCrew,
    ControllableTool,
    RunHandle,
    RunStatus,
)


class TestRunHandle:
    """Test RunHandle class"""

    @pytest.mark.asyncio
    async def test_status_completed(self):
        """Test status for completed task"""

        async def dummy_task():
            return "result"

        task = asyncio.create_task(dummy_task())
        handle = RunHandle("test-run", task)

        # Wait for completion
        await task

        # Check status
        assert handle.status == RunStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_status_cancelled(self):
        """Test status for cancelled task"""

        async def long_task():
            await asyncio.sleep(10)

        task = asyncio.create_task(long_task())
        handle = RunHandle("test-run", task)

        # Cancel task
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

        # Check status
        assert handle.status == RunStatus.CANCELLED

    @pytest.mark.asyncio
    async def test_status_failed(self):
        """Test status for failed task"""

        async def failing_task():
            raise ValueError("test error")

        task = asyncio.create_task(failing_task())
        handle = RunHandle("test-run", task)

        # Wait for failure
        try:
            await task
        except ValueError:
            pass

        # Check status
        assert handle.status == RunStatus.FAILED
        assert handle.error is not None

    @pytest.mark.asyncio
    async def test_get_result_completed(self):
        """Test get_result for completed task"""

        async def dummy_task():
            return "success"

        task = asyncio.create_task(dummy_task())
        handle = RunHandle("test-run", task)
        await task

        result = handle.get_result()
        assert result == "success"

    @pytest.mark.asyncio
    async def test_get_result_cancelled(self):
        """Test get_result for cancelled task returns description"""

        async def long_task():
            await asyncio.sleep(10)

        task = asyncio.create_task(long_task())
        handle = RunHandle("test-run", task)

        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

        result = handle.get_result()
        assert result == "Task was cancelled"

    @pytest.mark.asyncio
    async def test_get_result_failed(self):
        """Test get_result for failed task returns error description"""

        async def failing_task():
            raise ValueError("test error")

        task = asyncio.create_task(failing_task())
        handle = RunHandle("test-run", task)

        try:
            await task
        except ValueError:
            pass

        result = handle.get_result()
        assert "Task failed" in result
        assert "ValueError" in result
        assert "test error" in result

    @pytest.mark.asyncio
    async def test_wait_timeout(self):
        """Test wait with timeout"""

        async def long_task():
            await asyncio.sleep(10)

        task = asyncio.create_task(long_task())
        handle = RunHandle("test-run", task)

        # Wait with short timeout
        completed = await handle.wait(timeout=0.1)
        assert completed is False

        # Cleanup
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    @pytest.mark.asyncio
    async def test_wait_success(self):
        """Test wait for successful completion"""

        async def quick_task():
            await asyncio.sleep(0.01)
            return "done"

        task = asyncio.create_task(quick_task())
        handle = RunHandle("test-run", task)

        completed = await handle.wait(timeout=1.0)
        assert completed is True


class TestControllableBase:
    """Test Controllable base class"""

    @pytest.mark.asyncio
    async def test_extract_run_id_from_config_with_run_id(self):
        """Test extracting run_id from config"""

        class DummyControllable(Controllable):
            pass

        controllable = DummyControllable()
        config = {"configurable": {"run_id": "test-123"}}

        run_id = controllable._extract_run_id_from_config(config)
        assert run_id == "test-123"

    @pytest.mark.asyncio
    async def test_extract_run_id_from_config_without_run_id(self):
        """Test auto-generating run_id when not provided"""

        class DummyControllable(Controllable):
            pass

        controllable = DummyControllable()
        config = {}

        run_id = controllable._extract_run_id_from_config(config)
        assert run_id is not None
        assert len(run_id) == 36  # UUID format

    @pytest.mark.asyncio
    async def test_stop_nonexistent_run(self):
        """Test stopping a non-existent run"""

        class DummyControllable(Controllable):
            pass

        controllable = DummyControllable()
        result = await controllable.stop("nonexistent-run")
        assert result is False

    @pytest.mark.asyncio
    async def test_status_nonexistent_run(self):
        """Test querying status of non-existent run"""

        class DummyControllable(Controllable):
            pass

        controllable = DummyControllable()
        status = controllable.status("nonexistent-run")
        assert status is None


class TestControllableAgent:
    """Test ControllableAgent functionality"""

    @pytest.mark.asyncio
    async def test_agent_ainvoke_registration(self):
        """Test that ainvoke automatically registers run"""

        class TestAgent(ControllableAgent):
            async def ainvoke(self, input, config=None, **kwargs):
                # Verify run is registered
                assert self._current_run_id is not None
                assert self._current_run_id in self._runs
                return {"result": "done"}

        agent = TestAgent()
        result = await agent.ainvoke({"test": "input"})
        assert result == {"result": "done"}

        # Verify cleanup happened
        assert agent._current_run_id is None

    @pytest.mark.asyncio
    async def test_agent_stop(self):
        """Test stopping agent execution"""

        class TestAgent(ControllableAgent):
            async def ainvoke(self, input, config=None, **kwargs):
                await asyncio.sleep(5)  # Long task
                return {"result": "done"}

        agent = TestAgent()

        # Start task in background
        task = asyncio.create_task(agent.ainvoke({"test": "input"}))

        # Wait a bit then stop
        await asyncio.sleep(0.1)
        stopped = await agent.stop()
        assert stopped is True

        # Verify task was cancelled
        try:
            await task
        except asyncio.CancelledError:
            pass  # Expected


class TestControllableCrew:
    """Test ControllableCrew functionality"""

    @pytest.mark.asyncio
    async def test_crew_extract_run_id_uses_thread_id(self):
        """Test that Crew uses thread_id as run_id"""

        class TestCrew(ControllableCrew):
            async def astream_events(self, input, config=None, **kwargs):
                yield {"event": "test"}

        crew = TestCrew()
        config = {"configurable": {"thread_id": "thread-123"}}

        run_id = crew._extract_run_id_from_config(config)
        assert run_id == "thread-123"

    @pytest.mark.asyncio
    async def test_crew_astream_events_registration(self):
        """Test that astream_events registers run"""

        class TestCrew(ControllableCrew):
            async def astream_events(self, input, config=None, **kwargs):
                # Verify run is registered
                assert self._current_run_id is not None
                yield {"event": "test", "data": "data1"}
                yield {"event": "test", "data": "data2"}

        crew = TestCrew()
        config = {"configurable": {"thread_id": "thread-123"}}

        events = []
        async for event in crew.astream_events({"test": "input"}, config):
            events.append(event)

        assert len(events) == 2
        # Verify cleanup happened
        assert crew._current_run_id is None

    @pytest.mark.asyncio
    async def test_crew_stop_cancels_stream(self):
        """Test that stop cancels event stream"""

        class TestCrew(ControllableCrew):
            async def astream_events(self, input, config=None, **kwargs):
                for i in range(100):
                    await asyncio.sleep(0.1)
                    yield {"event": "test", "data": i}

        crew = TestCrew()
        config = {"configurable": {"thread_id": "thread-123"}}

        events = []

        async def consume_events():
            try:
                async for event in crew.astream_events({"test": "input"}, config):
                    events.append(event)
            except asyncio.CancelledError:
                pass  # Expected

        task = asyncio.create_task(consume_events())

        # Wait a bit then stop
        await asyncio.sleep(0.3)
        stopped = await crew.stop()
        assert stopped is True

        # Wait for task to finish
        try:
            await task
        except asyncio.CancelledError:
            pass

        # Should have received some events but not all
        assert len(events) < 100


class TestRunIdExtraction:
    """Test run_id extraction from config"""

    def test_base_extract_from_run_id(self):
        """Test base class extracts from run_id field"""

        class DummyControllable(Controllable):
            pass

        controllable = DummyControllable()
        config = {"configurable": {"run_id": "run-123"}}

        run_id = controllable._extract_run_id_from_config(config)
        assert run_id == "run-123"

    def test_crew_extract_from_thread_id(self):
        """Test Crew extracts from thread_id field"""

        class DummyCrew(ControllableCrew):
            async def astream_events(self, input, config=None, **kwargs):
                yield {"event": "test"}

        crew = DummyCrew()
        config = {"configurable": {"thread_id": "thread-456"}}

        run_id = crew._extract_run_id_from_config(config)
        assert run_id == "thread-456"

    def test_auto_generate_when_missing(self):
        """Test auto-generating UUID when no ID in config"""

        class DummyControllable(Controllable):
            pass

        controllable = DummyControllable()
        config = {}

        run_id = controllable._extract_run_id_from_config(config)
        assert run_id is not None
        assert len(run_id) == 36  # UUID format


class TestControllableTool:
    """Test ControllableTool functionality."""

    @pytest.mark.asyncio
    async def test_tool_arun_registers_run(self):
        """Ensure ControllableTool._arun registers and cleans up runs."""
        run_was_registered = []

        class DummyTool(ControllableTool):
            name: str = "dummy_tool"
            description: str = "Dummy tool for testing"

            async def _arun(self, *args, **kwargs):
                run_was_registered.append(bool(self._runs))
                return "result"

        tool = DummyTool()
        result = await tool._arun(config={"configurable": {"run_id": "tool-run"}})
        assert result == "result"
        assert run_was_registered == [True]
        assert not tool._runs  # Cleaned up

    @pytest.mark.asyncio
    async def test_tool_arun_generates_run_id(self):
        """Ensure ControllableTool auto-generates run_id when missing."""
        captured_run_id = []

        class DummyTool(ControllableTool):
            name: str = "dummy_tool"
            description: str = "Dummy tool for testing"

            async def _arun(self, *args, **kwargs):
                run_id = next(iter(self._runs))
                captured_run_id.append(run_id)
                return "result"

        tool = DummyTool()
        result = await tool._arun(config={})
        assert result == "result"
        assert len(captured_run_id) == 1
        assert isinstance(captured_run_id[0], str)
        assert len(captured_run_id[0]) == 36  # UUID format
