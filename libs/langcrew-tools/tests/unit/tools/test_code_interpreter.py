"""Tests for the code interpreter tool."""

from textwrap import dedent

import pytest

from langcrew_tools.code_interpreter import CodeInterpreterTool


@pytest.fixture
def sandbox_code_tool() -> CodeInterpreterTool:
    return CodeInterpreterTool()


def test_code_interpreter_basic(sandbox_code_tool: CodeInterpreterTool) -> None:
    """Test basic code execution."""

    # Test simple code
    result = sandbox_code_tool._run("print('Hello, World!')")
    assert "Hello, World!" in result

    # Test math operations
    result = sandbox_code_tool._run("print(2 + 2)")
    assert "4" in result

    # Test with variables
    code = dedent(
        """
        x = 10
        y = 20
        print(f"Sum: {x + y}")
        """
    )
    result = sandbox_code_tool._run(code)
    assert "Sum: 30" in result


def test_code_interpreter_errors(sandbox_code_tool: CodeInterpreterTool) -> None:
    """Test error handling."""

    # Test syntax error
    result = sandbox_code_tool._run("print('unclosed string")
    assert "SyntaxError" in result or "Error" in result

    # Test runtime error
    result = sandbox_code_tool._run("1 / 0")
    assert "ZeroDivisionError" in result

    # Test undefined variable
    result = sandbox_code_tool._run("print(undefined_variable)")
    assert "NameError" in result


def test_code_interpreter_safe_modules(sandbox_code_tool: CodeInterpreterTool) -> None:
    """Test allowed modules."""

    # Test math module
    code = dedent(
        """
        import math
        print(f"Pi: {math.pi:.4f}")
        print(f"Square root of 16: {math.sqrt(16)}")
        """
    )
    result = sandbox_code_tool._run(code)
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
    result = sandbox_code_tool._run(code)
    assert "Current year:" in result

    # Test json module
    code = dedent(
        """
        import json
        data = {"name": "test", "value": 123}
        print(json.dumps(data))
        """
    )
    result = sandbox_code_tool._run(code)
    assert '{"name": "test", "value": 123}' in result


def test_code_interpreter_timeout(sandbox_code_tool: CodeInterpreterTool) -> None:
    """Test timeout handling."""

    # Test infinite loop with short timeout
    code = dedent(
        """
        while True:
            pass
        """
    )
    result = sandbox_code_tool._run(code, timeout=1)
    assert "timed out" in result.lower() or "timeout" in result.lower()


def test_code_interpreter_output_truncation(
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
    result = sandbox_code_tool._run(code)
    assert "truncated" in result
    assert len(result) < 10100  # Should be close to max_output_length


def test_code_interpreter_multiline_output(
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
    result = sandbox_code_tool._run(code)
    assert "Line 0" in result
    assert "Line 1" in result
    assert "Line 2" in result
    assert "Done" in result


def test_code_interpreter_input_function(
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
