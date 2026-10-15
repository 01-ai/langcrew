import os
import tempfile
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from langcrew_tools.commands import RunCommandTool
from langcrew_tools.commands.local_backend import CommandResult, LocalCommandBackend

# ---------------------------------------------------------------------------
# LocalCommandBackend unit tests
# ---------------------------------------------------------------------------


class TestLocalCommandBackend:
    @pytest.mark.asyncio
    async def test_run_simple_command(self):
        backend = LocalCommandBackend()
        result = await backend.run("echo hello")
        assert result.exit_code == 0
        assert "hello" in result.stdout
        assert result.stderr == ""

    @pytest.mark.asyncio
    async def test_run_command_with_cwd(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            backend = LocalCommandBackend(cwd=tmpdir)
            result = await backend.run("pwd")
            assert result.exit_code == 0
            assert os.path.realpath(tmpdir) in os.path.realpath(result.stdout.strip())

    @pytest.mark.asyncio
    async def test_run_command_failure(self):
        backend = LocalCommandBackend()
        result = await backend.run("exit 42")
        assert result.exit_code == 42

    @pytest.mark.asyncio
    async def test_run_command_stderr(self):
        backend = LocalCommandBackend()
        result = await backend.run("echo error_msg >&2")
        assert "error_msg" in result.stderr

    @pytest.mark.asyncio
    async def test_run_command_combined_output(self):
        backend = LocalCommandBackend()
        result = await backend.run("echo out && echo err >&2")
        assert "out" in result.stdout
        assert "err" in result.stderr

    @pytest.mark.asyncio
    async def test_run_command_background(self):
        backend = LocalCommandBackend()
        result = await backend.run("sleep 10", background=True)
        assert result.exit_code == 0
        assert result.stdout == ""
        assert result.stderr == ""

    @pytest.mark.asyncio
    async def test_default_cwd_is_current_dir(self):
        backend = LocalCommandBackend()
        assert backend.cwd == os.getcwd()

    @pytest.mark.asyncio
    async def test_cwd_does_not_exist(self):
        backend = LocalCommandBackend(cwd="/nonexistent_dir_xyz")
        with pytest.raises(Exception):
            await backend.run("echo hello")

    @pytest.mark.asyncio
    async def test_multiline_output(self):
        backend = LocalCommandBackend()
        result = await backend.run("echo line1 && echo line2 && echo line3")
        lines = result.stdout.strip().splitlines()
        assert len(lines) == 3
        assert lines[0] == "line1"
        assert lines[2] == "line3"


# ---------------------------------------------------------------------------
# RunCommandTool with local=True integration tests
# ---------------------------------------------------------------------------


class TestRunCommandToolLocal:
    @pytest.mark.asyncio
    async def test_tool_local_mode(self):
        tool = RunCommandTool(local=True)
        output = await tool._arun(command="echo hello_world")
        assert "hello_world" in output

    @pytest.mark.asyncio
    async def test_tool_local_with_cwd(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = os.path.join(tmpdir, "marker.txt")
            with open(test_file, "w") as f:
                f.write("found")

            tool = RunCommandTool(local=True, cwd=tmpdir)
            output = await tool._arun(command="cat marker.txt")
            assert "found" in output

    @pytest.mark.asyncio
    async def test_tool_local_error_handling(self):
        tool = RunCommandTool(local=True)
        output = await tool._arun(command="ls /nonexistent_path_xyz_123")
        assert output  # should still return formatted output, not raise

    @pytest.mark.asyncio
    async def test_tool_local_output_formatting(self):
        """Output should contain ANSI terminal formatting from TerminalFormatter."""
        tool = RunCommandTool(local=True)
        output = await tool._arun(command="echo formatted")
        assert "\x1b[" in output
        assert "formatted" in output

    @pytest.mark.asyncio
    async def test_tool_local_exit_code_success(self):
        tool = RunCommandTool(local=True)
        output = await tool._arun(command="true")
        assert "\x1b[32m" in output  # green prompt = success

    @pytest.mark.asyncio
    async def test_tool_local_exit_code_failure(self):
        tool = RunCommandTool(local=True)
        output = await tool._arun(command="false")
        assert "\x1b[31m" in output  # red prompt = failure

    @pytest.mark.asyncio
    async def test_tool_local_background(self):
        tool = RunCommandTool(local=True)
        output = await tool._arun(command="sleep 60", background=True)
        assert "background" in output.lower()

    @pytest.mark.asyncio
    async def test_tool_default_is_sandbox_mode(self):
        """When local=False (default), tool should attempt to use sandbox."""
        tool = RunCommandTool()
        assert tool.local is False
        assert tool._local_backend is None

        mock_sandbox = MagicMock()
        mock_result = MagicMock()
        mock_result.stdout = "sandbox_output"
        mock_result.stderr = ""
        mock_result.exit_code = 0
        mock_sandbox.commands.run = AsyncMock(return_value=mock_result)

        with patch(
            "langcrew_tools.commands.tools.SandboxMixin.get_sandbox",
            return_value=mock_sandbox,
        ):
            output = await tool._arun(command="echo test")
            assert "sandbox_output" in output
            mock_sandbox.commands.run.assert_called_once_with(
                cmd="cd /workspace && echo test", user="user"
            )

    @pytest.mark.asyncio
    async def test_tool_passes_process_lifetime_to_sandbox(self):
        tool = RunCommandTool()

        mock_sandbox = MagicMock()
        mock_result = MagicMock()
        mock_result.stdout = "sandbox_output"
        mock_result.stderr = ""
        mock_result.exit_code = 0
        mock_sandbox.commands.run = AsyncMock(return_value=mock_result)

        with patch(
            "langcrew_tools.commands.tools.SandboxMixin.get_sandbox",
            return_value=mock_sandbox,
        ):
            output = await tool._arun(command="echo test", process_lifetime="session")
            assert "sandbox_output" in output
            mock_sandbox.commands.run.assert_called_once_with(
                cmd="cd /workspace && echo test",
                user="user",
                process_lifetime="session",
            )

    @pytest.mark.asyncio
    async def test_tool_local_exception_caught(self):
        """Exceptions during local execution should be caught and formatted."""
        tool = RunCommandTool(local=True, cwd="/nonexistent_dir_xyz")
        output = await tool._arun(command="echo test")
        assert "Error" in output


# ---------------------------------------------------------------------------
# CommandResult data class tests
# ---------------------------------------------------------------------------


class TestCommandResult:
    def test_fields(self):
        r = CommandResult(stdout="out", stderr="err", exit_code=1)
        assert r.stdout == "out"
        assert r.stderr == "err"
        assert r.exit_code == 1

    def test_defaults_not_required(self):
        r = CommandResult(stdout="", stderr="", exit_code=0)
        assert r.exit_code == 0
