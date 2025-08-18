import logging
from typing import ClassVar

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..utils.sandbox import SandboxMixin
from .terminal_formatter import TerminalFormatter

logger = logging.getLogger(__name__)


class RunCommandInput(BaseToolInput):
    """Input for RunCommandTool."""

    command: str = Field(..., description="Command to execute in the terminal")
    user: str = Field(
        ...,
        description="User to execute the command, default is 'user', you can use 'root' to execute the command as root if necessary",
    )
    background: bool = Field(
        default=True, description="Whether to run the command in the background"
    )


class KillCommandInput(BaseToolInput):
    """Input for KillCommandTool."""

    process_id: str = Field(
        ..., description="Process ID or handle of the background command to kill"
    )


class RunCommandTool(BaseTool, SandboxMixin):
    """Tool for executing terminal commands in the sandbox."""

    name: ClassVar[str] = "run_command"
    args_schema: type[BaseModel] = RunCommandInput
    description: ClassVar[str] = (
        "Execute a terminal command in the sandbox. "
        "Provide the command to run and optionally"
    )

    async def _arun(
        self,
        command: str,
        user: str = "user",
        background: bool = False,
        **kwargs,
    ) -> str:
        """Run command synchronously."""
        try:
            # Prepare options for the command
            options = {}
            if background:
                options["background"] = True

            # Run the command
            async_sandbox = await self.get_sandbox()
            full_command = f"cd /workspace && {command}"
            result = await async_sandbox.commands.run(
                cmd=full_command, user=user, **options
            )

            # Return output based on whether it's a background process or not
            if background:
                return (
                    f"Command started in background: {command}\n"
                    f"Process handle: {str(result)}"
                )
            else:
                # Combine stdout and stderr
                output_parts = []
                if result.stdout:
                    # Truncate stdout if it's too long (max 3000 characters)
                    stdout_content = result.stdout.strip()
                    if len(stdout_content) > 3000:
                        stdout_content = (
                            stdout_content[:3000] + "\n... (output truncated)"
                        )
                    output_parts.append(result.stdout.strip())
                if result.stderr:
                    # Truncate stderr if it's too long (max 3000 characters)
                    stderr_content = result.stderr.strip()
                    if len(stderr_content) > 3000:
                        stderr_content = (
                            stderr_content[:3000] + "\n... (output truncated)"
                        )
                    output_parts.append(result.stderr.strip())

                combined_output = "\n".join(output_parts)

                # Use TerminalFormatter to create terminal-style output
                formatter = TerminalFormatter()
                terminal_output = formatter.create_command_execution(
                    command=command,
                    output=combined_output,
                    success=(result.exit_code == 0),
                )

                return terminal_output

        except Exception as e:
            # Log the exception with stack trace
            import traceback

            error_message = f"Error executing command '{command}': {str(e)}"
            stack_trace = traceback.format_exc()
            logger.error(f"{error_message}\n{stack_trace}")

            # Format error output using TerminalFormatter
            formatter = TerminalFormatter()
            return formatter.create_command_execution(
                command=command, output=f"Error: {str(e)}", success=False
            )

    def _run(
        self,
        command: str,
        user: str = "user",
        background: bool = False,
        **kwargs,
    ) -> str:
        """Perform document parsing synchronously."""
        raise NotImplementedError("run_command only supports async execution.")


class KillCommandTool(BaseTool, SandboxMixin):
    """Tool for killing background processes in the sandbox."""

    name: ClassVar[str] = "kill_command"
    args_schema: type[BaseModel] = KillCommandInput
    description: ClassVar[str] = (
        "Kill a background process in the sandbox. "
        "Provide the process ID or handle returned from a background command."
    )

    async def _arun(self, process_id: str, **kwargs) -> str:
        """Kill command synchronously."""
        try:
            # Note: This is a simplified implementation
            # In practice, you'd need to maintain a registry of background processes
            # or implement a more sophisticated process management system
            return f"Attempted to kill process: {process_id}"
        except Exception as e:
            return f"Failed to kill process '{process_id}': {str(e)}"

    def _run(self, process_id: str, **kwargs) -> str:
        """Perform document parsing synchronously."""
        raise NotImplementedError("kill_command only supports async execution.")
