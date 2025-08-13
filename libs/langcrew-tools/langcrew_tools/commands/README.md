# Command Execution Tools

Terminal command execution tools for E2B sandbox environments with advanced terminal formatting and session management.

## Overview

The `commands` module provides production-ready terminal command execution capabilities specifically designed for multi-agent applications running in E2B sandbox environments. It includes:

- **Safe Command Execution**: Execute terminal commands with proper isolation
- **Background Process Management**: Run long-running commands in the background
- **Advanced Terminal Formatting**: Realistic terminal output with colors and prompts
- **Session Management**: Track working directory changes and command history
- **Error Handling**: Robust error handling with detailed output formatting

## Features

- ✅ **LangChain Compatible**: Implements `BaseTool` interface for seamless integration
- ✅ **E2B Sandbox Integration**: Built specifically for E2B sandbox environments
- ✅ **Terminal Simulation**: Realistic terminal output with ANSI colors and prompts
- ✅ **Background Execution**: Support for long-running background processes
- ✅ **Path Tracking**: Automatic working directory change detection
- ✅ **Output Management**: Smart truncation for large outputs (3000 char limit)
- ✅ **User Context**: Support for different user contexts (user/root)

## Installation

This module is part of `langcrew-tools`. Install the parent package:

```bash
pip install langcrew-tools
```

## Tools

### RunCommandTool

Execute terminal commands in the E2B sandbox environment.

**Parameters:**
- `command` (str): Command to execute in the terminal
- `user` (str): User to execute as ('user' or 'root')
- `brief` (str): Brief explanation of the action
- `background` (bool): Whether to run in background (default: True)

**Example:**
```python
from langcrew_tools.commands import RunCommandTool

# Create tool instance
run_cmd = RunCommandTool()

# Execute a simple command
result = await run_cmd._arun(
    command="ls -la",
    user="user",
    background=False,
    brief="List files in current directory"
)
print(result)
```

**Output Example:**
```bash
user@sandbox:~ $ ls -la
total 12
drwxr-xr-x 3 user user 4096 Jan 15 10:30 .
drwxr-xr-x 3 root root 4096 Jan 15 10:29 ..
-rw-r--r-- 1 user user  220 Jan 15 10:29 .bashrc
user@sandbox:~ $
```

### KillCommandTool

Kill background processes in the sandbox.

**Parameters:**
- `process_id` (str): Process ID or handle of the background command to kill

**Example:**
```python
from langcrew_tools.commands import KillCommandTool

# Create tool instance
kill_cmd = KillCommandTool()

# Kill a background process
result = await kill_cmd._arun(process_id="bg_process_123")
print(result)
```

## Terminal Formatting

The module includes a sophisticated `TerminalFormatter` class that provides:

### Features
- **ANSI Color Support**: Proper terminal colors for success/error states
- **Path Tracking**: Automatic detection of directory changes
- **Realistic Prompts**: Terminal prompts with user@hostname format
- **Command History**: Session-style command execution display

### Usage Examples

```python
from langcrew_tools.commands.terminal_formatter import TerminalFormatter

# Create formatter
formatter = TerminalFormatter(username="user", hostname="sandbox")

# Format a single command execution
output = formatter.create_command_execution(
    command="cd /workspace && ls",
    current_path="~",
    output="file1.txt\nfile2.py\nREADME.md",
    success=True
)

# Create a full terminal session
commands = [
    {
        "command": "pwd",
        "output": "/home/user",
        "success": True
    },
    {
        "command": "cd /workspace",
        "success": True
    },
    {
        "command": "ls -la",
        "output": "total 8\ndrwxr-xr-x 2 user user 4096 Jan 15 10:30 .",
        "success": True
    }
]

session = formatter.create_terminal_session(commands)
print(session)
```

## Advanced Usage

### Background Process Management

```python
# Start a long-running process in background
result = await run_cmd._arun(
    command="python long_running_script.py",
    background=True,
    brief="Start data processing job"
)
# Returns: "Command started in background: python long_running_script.py\nProcess handle: bg_123"

# Later, kill the process
await kill_cmd._arun(process_id="bg_123")
```

### Working with Different Users

```python
# Execute as regular user
await run_cmd._arun(command="whoami", user="user")

# Execute with root privileges
await run_cmd._arun(
    command="apt-get update", 
    user="root",
    brief="Update package lists"
)
```

### Error Handling

The tools provide comprehensive error handling:

```python
# Command that fails
result = await run_cmd._arun(
    command="nonexistent-command",
    user="user",
    brief="Test error handling"
)
# Returns formatted error output with red prompt indicating failure
```

## Environment Requirements

### E2B Sandbox Setup

The command tools require an active E2B sandbox environment:

```bash
export E2B_API_KEY=your_api_key
export E2B_TEMPLATE=your_template_id
export E2B_DOMAIN=your_domain  # Optional
export E2B_TIMEOUT=300         # Optional, seconds
```

### Dependencies

Core dependencies (installed with langcrew-tools):
- `langchain-core`: For BaseTool interface
- `pydantic`: For input validation
- `e2b`: For sandbox management

## Integration with LangCrew

### Agent Integration

```python
from langcrew import Agent
from langcrew_tools.commands import RunCommandTool, KillCommandTool

# Create agent with command tools
agent = Agent(
    role="System Administrator",
    goal="Manage system tasks efficiently",
    tools=[RunCommandTool(), KillCommandTool()],
    verbose=True
)

# Agent can now execute terminal commands
response = agent.execute("List all Python files in the current directory")
```

### LangGraph Integration

```python
from langgraph import StateGraph
from langcrew_tools.commands import RunCommandTool

# Add to your graph state
def command_node(state):
    run_cmd = RunCommandTool()
    result = await run_cmd._arun(
        command=state["command"],
        brief=state["brief"]
    )
    return {"output": result}
```

## Best Practices

### 1. Use Brief Descriptions
Always provide meaningful brief descriptions for better observability:

```python
await run_cmd._arun(
    command="pip install requests",
    brief="Install requests library for API calls"
)
```

### 2. Handle Long-Running Processes
Use background execution for long-running tasks:

```python
# Good: Use background for long tasks
await run_cmd._arun(
    command="python train_model.py",
    background=True,
    brief="Start model training"
)

# Avoid: Blocking execution for long tasks
# This will timeout after default limit
await run_cmd._arun(
    command="python train_model.py", 
    background=False  # Don't do this for long tasks
)
```

### 3. User Context Selection
Choose appropriate user context:

```python
# System operations
await run_cmd._arun(command="systemctl restart nginx", user="root")

# User operations
await run_cmd._arun(command="git clone repo.git", user="user")
```

### 4. Path Management
Be explicit about working directories:

```python
# Combine directory change with command
await run_cmd._arun(
    command="cd /workspace && python script.py",
    brief="Run script in workspace directory"
)
```

## Troubleshooting

### Common Issues

1. **Sandbox Connection Failed**
   ```
   Error: Failed to connect to E2B sandbox
   ```
   **Solution**: Check E2B_API_KEY and template configuration

2. **Command Timeout**
   ```
   Error: Command execution timed out
   ```
   **Solution**: Use background execution for long-running commands

3. **Permission Denied**
   ```
   Error: Permission denied
   ```
   **Solution**: Use `user="root"` for system operations

### Debug Mode

Enable detailed logging:

```python
import logging
logging.getLogger("langcrew_tools.commands").setLevel(logging.DEBUG)
```

## Contributing

We welcome contributions! Please ensure:
- New commands follow the BaseTool interface
- Terminal formatting maintains consistency
- Tests cover both success and failure cases
- Documentation includes usage examples

## License

MIT License - see main project LICENSE file.