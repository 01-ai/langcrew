"""Local command backend for dev/eval — no sandbox needed."""

import asyncio
import logging
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)

MAX_OUTPUT_CHARS = 3000


@dataclass
class CommandResult:
    """Mirrors the sandbox command result interface."""

    stdout: str
    stderr: str
    exit_code: int


class LocalCommandBackend:
    """Execute commands locally via asyncio.subprocess.

    Designed for eval and local debugging scenarios where a remote
    sandbox is not available or not desired.
    """

    def __init__(self, cwd: str | None = None):
        self.cwd = cwd or os.getcwd()

    async def run(
        self,
        cmd: str,
        user: str = "user",
        background: bool = False,
        **kwargs,
    ) -> CommandResult:
        """Run a shell command locally.

        Args:
            cmd: Shell command to execute.
            user: Ignored in local mode (kept for interface compatibility).
            background: If True, start the process without waiting for completion.

        Returns:
            CommandResult with stdout, stderr, and exit_code.
        """
        logger.info("LocalCommandBackend: running %r in %s", cmd, self.cwd)

        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.cwd,
        )

        if background:
            return CommandResult(
                stdout="",
                stderr="",
                exit_code=0,
            )

        stdout_bytes, stderr_bytes = await proc.communicate()
        return CommandResult(
            stdout=stdout_bytes.decode("utf-8", errors="replace"),
            stderr=stderr_bytes.decode("utf-8", errors="replace"),
            exit_code=proc.returncode or 0,
        )
