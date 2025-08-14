# Code Interpreter Tool

This package provides a robust and safe code interpreter tool designed for executing Python code within a sandboxed environment. It is primarily intended for integration with LangChain agents, allowing them to execute arbitrary Python code and receive the output, including standard output and any errors.

## Features

The `langcrew-tools/code_interpreter` package offers the following key features:

* **Safe Python Code Execution**: Executes Python code in an isolated sandbox environment, preventing unintended side effects on the host system.
* **Standard Output and Error Capture**: Captures both `stdout` and `stderr` from the executed code, providing comprehensive feedback on execution.
* **Configurable Timeout**: Allows setting a maximum execution time for the code, preventing infinite loops or long-running processes from blocking the agent.
* **Output Truncation**: Automatically truncates excessively long outputs to a configurable maximum length, ensuring efficient processing and display.
* **LangChain Integration**: Designed as a `BaseTool` for seamless integration with LangChain agents, enabling agents to leverage code execution capabilities.

## Tool Details

### `CodeInterpreterTool`

* **Name**: `python_executor`
* **Description**: "Execute Python code safely. Returns the output of the code execution including both stdout and any errors."

#### Input Parameters

* `code` (string, **required**): The Python code string to be executed.
* `timeout` (integer, optional): The maximum time in seconds allowed for code execution.
  * Default: `30` seconds
  * Minimum: `1` second
  * Maximum: `300` seconds

#### Output

The tool returns a string containing the `stdout` of the executed code. If `stderr` is present, it will be appended to the output under an "Errors:" section. If the code execution fails with a non-zero exit code and no `stdout` or `stderr` is produced, a generic failure message will be returned. Outputs exceeding 10,000 characters will be truncated.

## Usage

To use the `CodeInterpreterTool` with a LangChain agent, you would typically initialize it and include it in the list of tools provided to your agent.

### Example (Conceptual)

```python
from langcrew_tools.code_interpreter import CodeInterpreterTool

# Initialize the CodeInterpreterTool
code_interpreter_tool = CodeInterpreterTool()
ret = code_interpreter_tool._arun("123+456")
print(ret)
```

## Installation

(Assuming standard Python package installation)

```bash
pip install langcrew-tools
```

## License

This module is part of the LangCrew project and is released under the MIT License.
