"""Code interpreter tool for executing Python code safely."""

import asyncio
import base64
import logging
from typing import ClassVar

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..utils.sandbox.base_sandbox import SandboxMixin

logger = logging.getLogger(__name__)


class CodeInterpreterInput(BaseToolInput):
    """Input schema for the code interpreter tool."""

    code: str = Field(..., description="Python code to execute")
    timeout: int | None = Field(
        default=30, description="Maximum execution time in seconds", ge=1, le=300
    )


class CodeInterpreterTool(BaseTool, SandboxMixin):
    """Tool for executing Python code in a safe e2b sandbox environment."""

    name: ClassVar[str] = "python_executor"
    args_schema: type[BaseModel] = CodeInterpreterInput
    description: ClassVar[str] = (
        "Execute Python code safely. Returns the output of the code execution including both stdout and any errors. "
    )

    max_output_length: int = Field(
        default=10000, description="Maximum output length in characters"
    )

    def __init__(self, **kwargs):
        """Initialize the code interpreter tool."""
        super().__init__(**kwargs)

    def _truncate_output(self, output: str) -> str:
        """Truncate output if it exceeds the maximum length."""
        if len(output) > self.max_output_length:
            return (
                f"{output[: self.max_output_length]}\n\n"
                f"... Output truncated (exceeded {self.max_output_length} characters) ..."
            )
        return output

    def _escape_code_for_shell(self, code: str) -> str:
        """Escape Python code for shell execution."""
        # Base64 encode to avoid shell escaping issues
        encoded = base64.b64encode(code.encode()).decode()
        return f"python3 -c \"import base64; exec(base64.b64decode('{encoded}').decode())\""

    def _run(self, code: str, timeout: int = 30, **kwargs) -> str:
        """Execute the provided Python code."""
        return asyncio.run(self._arun(code, timeout, **kwargs))

    async def _arun(self, code: str, timeout: int = 30, **kwargs) -> str:
        """Asynchronously execute the provided Python code."""
        try:
            sandbox = await self.get_sandbox()

            command = self._escape_code_for_shell(code)

            logger.debug(f"Executing Python code in sandbox (timeout={timeout}s)")
            result = await sandbox.commands.run(command, timeout=timeout)

            # Extract results
            stdout = result.stdout if hasattr(result, "stdout") else ""
            stderr = result.stderr if hasattr(result, "stderr") else ""
            exit_code = result.exit_code if hasattr(result, "exit_code") else 0

            logger.debug(f"Execution completed with exit code: {exit_code}")
            output = stdout
            if stderr:
                output += f"\n\nErrors:\n{stderr}"
            if exit_code != 0 and not output and not stderr:
                output = f"Code execution failed with return code {exit_code}"
            return (
                self._truncate_output(output)
                or "Code executed successfully with no output"
            )

        except Exception as e:
            error_msg = f"Code execution failed: {str(e)}"
            logger.error(error_msg)
            return error_msg
