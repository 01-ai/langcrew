# Filesystem Tools

Comprehensive filesystem operation tools for E2B sandbox environments with full CRUD support and advanced text manipulation capabilities.

## Overview

The `filesystem` module provides production-ready file and directory management tools specifically designed for multi-agent applications running in E2B sandbox environments. It includes:

- **Complete CRUD Operations**: Create, read, update, and delete files/directories
- **Advanced Text Manipulation**: Replace, append, and modify file contents
- **Binary File Detection**: Smart handling of binary vs text files
- **Directory Management**: Create, list, and manage directory structures
- **Path Validation**: Secure path handling with workspace isolation
- **Error Recovery**: Robust error handling with detailed feedback

## Features

- ✅ **LangChain Compatible**: Implements `BaseTool` interface for seamless integration
- ✅ **E2B Sandbox Integration**: Built specifically for E2B sandbox environments
- ✅ **Binary File Detection**: Automatic detection and handling of binary files
- ✅ **Atomic Operations**: Safe file operations with error rollback
- ✅ **Text Manipulation**: Advanced find-replace and append operations
- ✅ **Directory Management**: Full directory tree operations
- ✅ **Path Security**: Workspace-confined operations for security
- ✅ **UTF-8 Support**: Proper encoding handling for international text

## Installation

This module is part of `langcrew-tools`. Install the parent package:

```bash
pip install langcrew-tools
```

## Tools Overview

### Core File Operations

| Tool | Purpose | Input | Output |
|------|---------|-------|---------|
| `WriteFileTool` | Create/overwrite files | path, content | Success/error message |
| `ReadFileTool` | Read text file contents | path | File content or error |
| `DeleteFileTool` | Remove files/directories | path | Success/error message |
| `FileExistsTool` | Check existence | path | Boolean result |
| `RenameFileTool` | Move/rename files | old_path, new_path | Success/error message |

### Directory Operations

| Tool | Purpose | Input | Output |
|------|---------|-------|---------|
| `CreateDirectoryTool` | Create directories | path | Success/error message |
| `ListFilesTool` | List directory contents | path, depth | File listing |

### Advanced Text Operations

| Tool | Purpose | Input | Output |
|------|---------|-------|---------|
| `FileReplaceTextTool` | Replace text in files | path, old_str, new_str | Before/after content |
| `FileAppendTextTool` | Append to files | path, content | Before/after content |

## Detailed Tool Documentation

### WriteFileTool

Create or completely overwrite a file with new content.

**Parameters:**
- `path` (str): Absolute path in `/workspace` (e.g., `/workspace/report.txt`)
- `content` (str): Content to write to the file
- `brief` (str): Brief explanation of the action

**Example:**
```python
from langcrew_tools.filesystem import WriteFileTool

write_tool = WriteFileTool()

result = await write_tool._arun(
    path="/workspace/config.json",
    content='{"api_key": "secret", "timeout": 30}',
    brief="Create configuration file"
)

print(result)
# Output: {
#   "message": "Successfully wrote to file: /workspace/config.json",
#   "old_file_content": "",
#   "new_file_content": '{"api_key": "secret", "timeout": 30}'
# }
```

### ReadFileTool

Read content from a text file with binary detection.

**Parameters:**
- `path` (str): Absolute path to the file
- `brief` (str): Brief explanation of the action

**Features:**
- Automatic binary file detection
- UTF-8 encoding support
- Error handling for non-existent files

**Example:**
```python
from langcrew_tools.filesystem import ReadFileTool

read_tool = ReadFileTool()

result = await read_tool._arun(
    path="/workspace/data.txt",
    brief="Read data file for processing"
)

if "error" not in result:
    content = result["new_file_content"]
    print(f"File content: {content}")
else:
    print(f"Error: {result['error']}")
```

### FileReplaceTextTool

Replace specific text in a file with precision control.

**Parameters:**
- `path` (str): Absolute path to the file
- `old_str` (str): Text to replace (must appear exactly once)
- `new_str` (str): Replacement text
- `brief` (str): Brief explanation of the action

**Safety Features:**
- Ensures text appears exactly once before replacement
- Provides before/after content for verification
- Atomic operation (all or nothing)

**Example:**
```python
from langcrew_tools.filesystem import FileReplaceTextTool

replace_tool = FileReplaceTextTool()

result = await replace_tool._arun(
    path="/workspace/config.py",
    old_str="DEBUG = False",
    new_str="DEBUG = True",
    brief="Enable debug mode"
)

if "error" not in result:
    print("Replacement successful!")
    print(f"Old content preview: {result['old_file_content'][:100]}...")
    print(f"New content preview: {result['new_file_content'][:100]}...")
```

### FileAppendTextTool

Append content to the end of a file.

**Parameters:**
- `path` (str): Absolute path to the file
- `content` (str): Text content to append
- `append_newline` (bool): Add newline at the end (default: True)
- `brief` (str): Brief explanation of the action

**Features:**
- Creates file if it doesn't exist
- Optional automatic newline addition
- Preserves existing content

**Example:**
```python
from langcrew_tools.filesystem import FileAppendTextTool

append_tool = FileAppendTextTool()

# Append log entry
result = await append_tool._arun(
    path="/workspace/activity.log",
    content="2024-01-15 10:30:00 - User login successful",
    append_newline=True,
    brief="Log user activity"
)

# Append without newline
result = await append_tool._arun(
    path="/workspace/data.csv",
    content=",new_column_data",
    append_newline=False,
    brief="Add column data"
)
```

### ListFilesTool

List contents of a directory with optional depth control.

**Parameters:**
- `path` (str): Directory path (default: "/")
- `depth` (int): Listing depth (default: 1)

**Example:**
```python
from langcrew_tools.filesystem import ListFilesTool

list_tool = ListFilesTool()

# List workspace directory
result = await list_tool._arun(
    path="/workspace",
    depth=1
)

print(result)
# Output: Files in /workspace:
# - config.json
# - data.txt
# - scripts/
# - logs/
```

### CreateDirectoryTool

Create directories with automatic parent creation.

**Parameters:**
- `path` (str): Absolute path for the new directory

**Example:**
```python
from langcrew_tools.filesystem import CreateDirectoryTool

mkdir_tool = CreateDirectoryTool()

result = await mkdir_tool._arun(
    path="/workspace/data/processed/reports"
)

print(result)
# Output: Successfully created directory: /workspace/data/processed/reports
```

### DeleteFileTool

Safely delete files or directories.

**Parameters:**
- `path` (str): Absolute path to delete
- `brief` (str): Brief explanation of the action

**Safety Features:**
- Works on both files and directories
- Recursive directory deletion
- Confirmation in return message

**Example:**
```python
from langcrew_tools.filesystem import DeleteFileTool

delete_tool = DeleteFileTool()

# Delete a file
result = await delete_tool._arun(
    path="/workspace/temp.txt",
    brief="Remove temporary file"
)

# Delete a directory
result = await delete_tool._arun(
    path="/workspace/old_data/",
    brief="Clean up old data directory"
)
```

### FileExistsTool

Check if a file or directory exists.

**Parameters:**
- `path` (str): Path to check

**Example:**
```python
from langcrew_tools.filesystem import FileExistsTool

exists_tool = FileExistsTool()

result = await exists_tool._arun(path="/workspace/config.json")
print(result)
# Output: Path /workspace/config.json exists
```

### RenameFileTool

Rename or move files and directories.

**Parameters:**
- `old_path` (str): Current path
- `new_path` (str): New path

**Example:**
```python
from langcrew_tools.filesystem import RenameFileTool

rename_tool = RenameFileTool()

# Rename a file
result = await rename_tool._arun(
    old_path="/workspace/draft.txt",
    new_path="/workspace/final_report.txt"
)

# Move to different directory
result = await rename_tool._arun(
    old_path="/workspace/temp_data.csv",
    new_path="/workspace/archive/data_2024.csv"
)
```

## Advanced Usage Patterns

### File Processing Pipeline

```python
from langcrew_tools.filesystem import (
    ReadFileTool, FileReplaceTextTool, WriteFileTool
)

async def process_config_file():
    read_tool = ReadFileTool()
    replace_tool = FileReplaceTextTool()
    
    # Read current config
    config = await read_tool._arun(
        path="/workspace/app.config",
        brief="Read current configuration"
    )
    
    if "error" not in config:
        # Update database URL
        result = await replace_tool._arun(
            path="/workspace/app.config",
            old_str="database_url=localhost",
            new_str="database_url=production.db.com",
            brief="Update database URL for production"
        )
        
        if "error" not in result:
            print("Configuration updated successfully!")
            return result["new_file_content"]
```

### Log File Management

```python
from langcrew_tools.filesystem import FileAppendTextTool, ListFilesTool
import datetime

async def log_activity(message: str):
    append_tool = FileAppendTextTool()
    
    timestamp = datetime.datetime.now().isoformat()
    log_entry = f"[{timestamp}] {message}"
    
    result = await append_tool._arun(
        path="/workspace/logs/activity.log",
        content=log_entry,
        append_newline=True,
        brief="Log system activity"
    )
    
    return result
```

### Directory Structure Creation

```python
from langcrew_tools.filesystem import CreateDirectoryTool

async def setup_project_structure():
    mkdir_tool = CreateDirectoryTool()
    
    directories = [
        "/workspace/src",
        "/workspace/tests",
        "/workspace/docs",
        "/workspace/data/raw",
        "/workspace/data/processed",
        "/workspace/logs",
        "/workspace/config"
    ]
    
    results = []
    for directory in directories:
        result = await mkdir_tool._arun(path=directory)
        results.append(result)
        print(result)
    
    return results
```

## Environment Requirements

### E2B Sandbox Setup

The filesystem tools require an active E2B sandbox environment:

```bash
export E2B_API_KEY=your_api_key
export E2B_TEMPLATE=your_template_id
export E2B_DOMAIN=your_domain  # Optional
export E2B_TIMEOUT=300         # Optional, seconds
```

### Workspace Security

All operations are confined to the `/workspace` directory for security:
- Paths must be absolute and start with `/workspace`
- No access to system directories
- Sandbox isolation prevents filesystem escape

## Integration with LangCrew

### Agent Integration

```python
from langcrew import Agent
from langcrew_tools.filesystem import *

# Create file management agent
file_agent = Agent(
    role="File Manager",
    goal="Manage project files and directories efficiently",
    tools=[
        WriteFileTool(),
        ReadFileTool(),
        FileReplaceTextTool(),
        ListFilesTool(),
        CreateDirectoryTool()
    ],
    verbose=True
)

# Agent can now perform file operations
response = file_agent.execute("Create a project structure and configuration file")
```

### LangGraph Workflow Integration

```python
from langgraph import StateGraph
from langcrew_tools.filesystem import WriteFileTool, ReadFileTool

def create_file_workflow():
    graph = StateGraph(dict)
    
    async def write_config(state):
        write_tool = WriteFileTool()
        result = await write_tool._arun(
            path="/workspace/config.json",
            content=state["config_content"],
            brief="Write configuration file"
        )
        return {"file_result": result}
    
    async def read_and_validate(state):
        read_tool = ReadFileTool()
        result = await read_tool._arun(
            path="/workspace/config.json",
            brief="Validate written configuration"
        )
        return {"validation": result}
    
    graph.add_node("write_config", write_config)
    graph.add_node("validate", read_and_validate)
    graph.add_edge("write_config", "validate")
    
    return graph.compile()
```

## Best Practices

### 1. Use Brief Descriptions
Always provide meaningful brief descriptions for better observability:

```python
await write_tool._arun(
    path="/workspace/report.html",
    content=html_content,
    brief="Generate final HTML report for client"
)
```

### 2. Handle Binary Files
Be aware of binary file detection:

```python
result = await read_tool._arun(path="/workspace/image.png")
if "The file is binary" in result.get("error", ""):
    # Handle binary file appropriately
    print("Use file_parser or shell commands for binary files")
```

### 3. Atomic Text Replacement
Ensure text replacement safety:

```python
# Good: Specific text that appears once
result = await replace_tool._arun(
    path="/workspace/config.py",
    old_str="API_VERSION = '1.0'",
    new_str="API_VERSION = '2.0'",
    brief="Update API version"
)

# Check result
if "must appear exactly once" in result.get("error", ""):
    print("Text replacement failed - ambiguous match")
```

### 4. Path Validation
Always use absolute paths within workspace:

```python
# Good: Absolute workspace path
path = "/workspace/data/file.txt"

# Avoid: Relative paths (may not work as expected)
# path = "data/file.txt"
```

### 5. Error Handling
Always check for errors in results:

```python
result = await file_tool._arun(...)

if isinstance(result, dict) and "error" in result:
    print(f"Operation failed: {result['error']}")
    # Handle error appropriately
else:
    # Process successful result
    print("Operation completed successfully")
```

## Troubleshooting

### Common Issues

1. **Path Outside Workspace**
   ```
   Error: Path must be within /workspace directory
   ```
   **Solution**: Use absolute paths starting with `/workspace/`

2. **Binary File Read Error**
   ```
   Error: The file is binary, use file_parser or shell command tool
   ```
   **Solution**: Use appropriate binary handling tools or shell commands

3. **Text Replacement Ambiguity**
   ```
   Error: The string 'config' must appear exactly once in the file
   ```
   **Solution**: Use more specific text patterns for replacement

4. **Permission Denied**
   ```
   Error: Permission denied accessing file
   ```
   **Solution**: Check E2B sandbox permissions and file ownership

### Debug Mode

Enable detailed logging for troubleshooting:

```python
import logging
logging.getLogger("langcrew_tools.filesystem").setLevel(logging.DEBUG)
```

## Performance Considerations

### Large Files
- Read operations load entire file into memory
- Consider streaming for very large files (>100MB)
- Use pagination for large directory listings

### Concurrent Operations
- Tools support async operations
- Be careful with concurrent writes to same file
- Use proper locking for shared resources

## Contributing

We welcome contributions! Please ensure:
- New tools follow the BaseTool interface
- Input validation uses Pydantic models
- Error handling is comprehensive
- Documentation includes usage examples
- Tests cover edge cases and error conditions

## License

MIT License - see main project LICENSE file.