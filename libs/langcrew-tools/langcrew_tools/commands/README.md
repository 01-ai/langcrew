# Commands Tool

This package provides tools for executing and managing terminal commands within a sandboxed environment. It is designed for integration with LangChain agents, enabling them to interact with the underlying system via shell commands.

## Features

The `langcrew-tools/commands` package offers the following key features:

* **Terminal Command Execution**: Execute arbitrary shell commands in a sandboxed environment.
* **Background Process Management**: Start commands in the background and obtain a process handle for later management (e.g., killing the process).
* **User Context**: Execute commands as a regular user (`user`) or as the superuser (`root`).
* **Formatted Output**: Command outputs are formatted to resemble a real terminal session, including prompts and clear separation of command and output.
* **Output Truncation**: Automatically truncates excessively long outputs to prevent overwhelming the agent or display.
* **LangChain Integration**: Designed as `BaseTool` for seamless integration with LangChain agents.

## Tool Details

### `RunCommandTool`

* **Name**: `run_command`
* **Description**: "Execute a terminal command in the sandbox. Provide the command to run, the user to execute as, and optionally specify if it should run in the background."

### `KillCommandTool`

* **Name**: `kill_command`
* **Description**: "Kill a background process in the sandbox. Provide the process ID or handle returned from a background command."

## Usage

To use the `Commands` tools with a LangChain agent, you would typically initialize them and include them in the list of tools provided to your agent.

### Example (Conceptual)

```python
from langcrew_tools.commands import RunCommandTool, KillCommandTool

# Initialize the command tools
run_command_tool = RunCommandTool()
kill_command_tool = KillCommandTool()

ret = run_command_tool._arun("ls")
print(ret)
```

## Installation

(Assuming standard Python package installation)

```bash
pip install langcrew-tools
```

## License

This module is part of the LangCrew project and is released under the MIT License.
