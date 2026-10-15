import logging
from typing import Any, ClassVar, Literal

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..utils.sandbox import SandboxMixin
from .local_backend import LocalCommandBackend
from .terminal_formatter import TerminalFormatter

logger = logging.getLogger(__name__)

MAX_OUTPUT_CHARS = 20000


class RunCommandInput(BaseToolInput):
    """Input for RunCommandTool."""

    command: str = Field(..., description="Command to execute in the terminal")
    user: str = Field(
        ...,
        description="User to execute the command, default is 'user', you can use 'root' to execute the command as root if necessary",
    )
    background: bool = Field(
        default=False,
        description=(
            "Whether to run the command in the background. "
            "Default is False - use this to get command output and exit code. "
            "Set to True only for long-running processes where you don't need to wait for results."
        ),
    )
    process_lifetime: Literal["request", "session"] | None = Field(
        default=None,
        description=(
            "How long the spawned process should live in the sandbox. "
            "Use 'request' to tie it to the current request, or 'session' to keep it alive for the sandbox session."
        ),
    )


def _truncate(text: str, limit: int = MAX_OUTPUT_CHARS) -> str:
    if len(text) > limit:
        return text[:limit] + "\n... (output truncated)"
    return text


def _format_result(command: str, result: Any, background: bool) -> str:
    """Format a command result (sandbox or local) into terminal-style output."""
    if background:
        return (
            f"Command started in background: {command}\n"
            f"Process handle: {str(result)}"
        )

    output_parts = []
    if result.stdout:
        output_parts.append(_truncate(result.stdout.strip()))
    if result.stderr:
        output_parts.append(_truncate(result.stderr.strip()))

    combined_output = "\n".join(output_parts)

    formatter = TerminalFormatter()
    return formatter.create_command_execution(
        command=command,
        output=combined_output,
        success=(result.exit_code == 0),
    )


class RunCommandTool(BaseTool, SandboxMixin):
    """Tool for executing terminal commands.

    Supports two execution modes (invisible to the LLM):

    * ``local=False`` (default) — runs commands in the remote sandbox
      via SandboxMixin (production path).
    * ``local=True`` — runs commands locally via asyncio.subprocess
      (eval / local-debug path).  Use ``cwd`` to set the working directory.
    """

    name: ClassVar[str] = "run_command"
    args_schema: type[BaseModel] = RunCommandInput
    description: ClassVar[str] = (
        "Execute a terminal command in the sandbox. "
        "Provide the command to run and optionally"
    )

    local: bool = Field(default=False, exclude=True)
    cwd: str | None = Field(default=None, exclude=True)

    _local_backend: LocalCommandBackend | None = None

    def model_post_init(self, __context: Any) -> None:
        super().model_post_init(__context)
        if self.local:
            self._local_backend = LocalCommandBackend(cwd=self.cwd)

    async def _arun(
        self,
        command: str,
        user: str = "user",
        background: bool = False,
        process_lifetime: Literal["request", "session"] | None = None,
        **kwargs,
    ) -> str:
        """Execute a command asynchronously."""
        try:
            if self._local_backend is not None:
                result = await self._local_backend.run(
                    cmd=command, user=user, background=background
                )
                return _format_result(command, result, background)

            options = {}
            if background:
                options["background"] = True
            if process_lifetime is not None:
                options["process_lifetime"] = process_lifetime

            async_sandbox = await self.get_sandbox()
            full_command = f"cd /workspace && {command}"
            result = await async_sandbox.commands.run(
                cmd=full_command, user=user, **options
            )
            return _format_result(command, result, background)

        except Exception as e:
            logger.exception(f"Error executing command: {command}")
            formatter = TerminalFormatter()
            return formatter.create_command_execution(
                command=command, output=f"Error: {str(e)}", success=False
            )

    def _run(
        self,
        command: str,
        user: str = "user",
        background: bool = False,
        process_lifetime: Literal["request", "session"] | None = None,
        **kwargs,
    ) -> str:
        raise NotImplementedError("run_command only supports async execution.")
