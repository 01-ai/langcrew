"""Tests for the code interpreter tool."""

import asyncio
import base64
import re
from textwrap import dedent

import pytest

from langcrew_tools.code_interpreter.langchain_tools import CodeInterpreterTool


def _decode_code_from_command(command: str) -> str:
    match = re.search(r"base64\.b64decode\('([^']+)'\)", command)
    if not match:
        return ""
    encoded = match.group(1)
    try:
        return base64.b64decode(encoded).decode()
    except Exception:
        return ""


class _MockResult:
    def __init__(self, stdout: str = "", stderr: str = "", exit_code: int = 0):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code


class _MockCommands:
    async def run(self, command: str, timeout: int | None = None, **_: object):
        code = _decode_code_from_command(command)

        # Simulated behaviors based on input code
        if "print('Hello, World!')" in code:
            return _MockResult(stdout="Hello, World!\n")
        if "print(2 + 2)" in code:
            return _MockResult(stdout="4\n")
        if "x = 10" in code and "y = 20" in code and "Sum:" in code:
            return _MockResult(stdout="Sum: 30\n")
        if "print('unclosed string" in code:
            return _MockResult(
                stderr="SyntaxError: EOL while scanning string literal",
                exit_code=1,
            )
        if "1 / 0" in code:
            return _MockResult(
                stderr="ZeroDivisionError: division by zero",
                exit_code=1,
            )
        if "undefined_variable" in code:
            return _MockResult(
                stderr=("NameError: name 'undefined_variable' is not defined"),
                exit_code=1,
            )
        if "import math" in code and "sqrt(16)" in code:
            return _MockResult(stdout="Pi: 3.1416\nSquare root of 16: 4.0\n")
        if "import datetime" in code and "now =" in code:
            return _MockResult(stdout="Current year: 2025\n")
        if "import json" in code and 'data = {"name": "test", "value": 123}' in code:
            return _MockResult(stdout='{"name": "test", "value": 123}\n')
        if "while True:" in code and timeout is not None and timeout <= 1:
            return _MockResult(stderr="timed out", exit_code=1)
        if "for i in range(1000):" in code and "This is a test line" in code:
            # Large output to trigger truncation in tool
            return _MockResult(stdout=("X" * 12000))
        if "for i in range(3):" in code and "Done" in code:
            return _MockResult(stdout="Line 0\nLine 1\nLine 2\nDone\n")

        # Default: no output
        return _MockResult(stdout="")


@pytest.fixture
def sandbox_code_tool() -> CodeInterpreterTool:
    class _MockSandbox:
        def __init__(self):
            self.commands = _MockCommands()

    async def provider():
        return _MockSandbox()

    return CodeInterpreterTool(sandbox_source=provider)


@pytest.mark.asyncio
async def test_code_interpreter_basic(sandbox_code_tool: CodeInterpreterTool) -> None:
    """Test basic code execution."""

    # Test simple code
    result = await sandbox_code_tool._arun("print('Hello, World!')")
    assert "Hello, World!" in result

    # Test math operations
    result = await sandbox_code_tool._arun("print(2 + 2)")
    assert "4" in result

    # Test with variables
    code = dedent(
        """
        x = 10
        y = 20
        print(f"Sum: {x + y}")
        """
    )
    result = await sandbox_code_tool._arun(code)
    assert "Sum: 30" in result


@pytest.mark.asyncio
async def test_code_interpreter_errors(sandbox_code_tool: CodeInterpreterTool) -> None:
    """Test error handling."""

    # Test syntax error
    result = await sandbox_code_tool._arun("print('unclosed string")
    assert "SyntaxError" in result or "Error" in result

    # Test runtime error
    result = await sandbox_code_tool._arun("1 / 0")
    assert "ZeroDivisionError" in result

    # Test undefined variable
    result = await sandbox_code_tool._arun("print(undefined_variable)")
    assert "NameError" in result


@pytest.mark.asyncio
async def test_code_interpreter_safe_modules(sandbox_code_tool: CodeInterpreterTool) -> None:
    """Test allowed modules."""

    # Test math module
    code = dedent(
        """
        import math
        print(f"Pi: {math.pi:.4f}")
        print(f"Square root of 16: {math.sqrt(16)}")
        """
    )
    result = await sandbox_code_tool._arun(code)
    assert "Pi: 3.1416" in result
    assert "Square root of 16: 4.0" in result

    # Test datetime module
    code = dedent(
        """
        import datetime
        now = datetime.datetime.now()
        print(f"Current year: {now.year}")
        """
    )
    result = await sandbox_code_tool._arun(code)
    assert "Current year:" in result

    # Test json module
    code = dedent(
        """
        import json
        data = {"name": "test", "value": 123}
        print(json.dumps(data))
        """
    )
    result = await sandbox_code_tool._arun(code)
    assert '{"name": "test", "value": 123}' in result


@pytest.mark.asyncio
async def test_code_interpreter_timeout(sandbox_code_tool: CodeInterpreterTool) -> None:
    """Test timeout handling."""

    # Test infinite loop with short timeout
    code = dedent(
        """
        while True:
            pass
        """
    )
    result = await sandbox_code_tool._arun(code, timeout=1)
    assert "timed out" in result.lower() or "timeout" in result.lower()


@pytest.mark.asyncio
async def test_code_interpreter_output_truncation(
    sandbox_code_tool: CodeInterpreterTool,
) -> None:
    """Test output truncation."""

    # Generate long output
    code = dedent(
        """
        for i in range(1000):
            print(f"Line {i}: This is a test line with some content")
        """
    )
    result = await sandbox_code_tool._arun(code)
    assert "truncated" in result
    assert len(result) < 10100  # Should be close to max_output_length


@pytest.mark.asyncio
async def test_code_interpreter_multiline_output(
    sandbox_code_tool: CodeInterpreterTool,
) -> None:
    """Test handling of multiline output."""

    code = dedent(
        """
        for i in range(3):
            print(f"Line {i}")
        print("Done")
        """
    )
    result = await sandbox_code_tool._arun(code)
    assert "Line 0" in result
    assert "Line 1" in result
    assert "Line 2" in result
    assert "Done" in result


@pytest.mark.asyncio
async def test_code_interpreter_input_function(
    sandbox_code_tool: CodeInterpreterTool,
) -> None:
    """Test custom input handling."""

    # Get the python executor
    if hasattr(sandbox_code_tool, "_python_executor"):
        code = dedent(
            """
            name = input("Enter name: ")
            age = input("Enter age: ")
            print(f"Hello {name}, you are {age} years old")
            """
        )
        if sandbox_code_tool._python_executor:  # type: ignore
            stdout, stderr, _ = sandbox_code_tool._python_executor.execute_with_input(  # type: ignore
                code, "Alice\n25\n"
            )
            assert "Hello Alice, you are 25 years old" in stdout
