# Filesystem Tools

This package provides a set of tools for interacting with the filesystem within a sandboxed environment. These tools enable LangChain agents to perform common file and directory operations, such as reading, writing, listing, deleting, and managing files and directories.

## Features

The `langcrew-tools/filesystem` package offers the following key features:

* **File Operations**:
  * **Read File**: Read the content of text files.
  * **Write File**: Write content to a file, overwriting existing content.
  * **Append Text to File**: Add content to the end of an existing file.
  * **Replace Text in File**: Replace a specific string within a file.
  * **Delete File**: Remove files or directories.
  * **Rename File**: Change the name or location of files and directories.
* **Directory Operations**:
  * **List Files**: List the contents of a directory.
  * **Create Directory**: Create new directories.
* **Existence Check**: Verify if a file or directory exists.
* **Sandbox Integration**: All operations are performed within a secure sandboxed environment.
* **LangChain Integration**: Designed as `BaseTool` for seamless integration with LangChain agents.

## Tool Details

### `WriteFileTool`

* **Name**: `write_file`
* **Description**: "Write content to a file in the sandbox. Provide the file path and content to write."
* **Input**:
  * `path` (string, **required**): Absolute path to the file (e.g., `/workspace/report.txt`).
  * `content` (string, **required**): The content to write to the file.
* **Output**: A dictionary indicating success or failure.

### `ReadFileTool`

* **Name**: `read_file`
* **Description**: "Read only text content from a file in the sandbox. Provide the file path."
* **Input**:
  * `path` (string, **required**): Absolute path to the file.
* **Output**: A dictionary containing the file's text content or an error message if the file is binary or cannot be read.

### `ListFilesTool`

* **Name**: `list_files`
* **Description**: "List files in a directory in the sandbox. Provide the directory path and optionally the depth to list."
* **Input**:
  * `path` (string, optional): Path to the directory to list (default: `/`).
  * `depth` (integer, optional): Depth of the directory to list (default: `1`).
* **Output**: A string listing the files in the specified directory or an error message.

### `DeleteFileTool`

* **Name**: `delete_file`
* **Description**: "Delete a file or directory in the sandbox. Provide the path to the file or directory to delete."
* **Input**:
  * `path` (string, **required**): Absolute path to the file or directory to delete.
* **Output**: A string indicating success or failure.

### `FileReplaceTextTool`

* **Name**: `file_replace_text`
* **Description**: "Replace a specific text in a file in the sandbox. Provide the absolute path to the file /workspace (e.g.,'/workspace/report.txt')"
* **Input**:
  * `path` (string, **required**): Absolute path to the file.
  * `old_str` (string, **required**): The exact text to be replaced. This string must appear exactly once in the file.
  * `new_str` (string, **required**): The new text to replace `old_str` with.
* **Output**: A dictionary indicating success, along with the old and new file content, or an error message.

### `FileAppendTextTool`

* **Name**: `file_append_text`
* **Description**: "Append text to file end. Used for logs, document building, data collection etc."
* **Input**:
  * `path` (string, **required**): Absolute path to the file to append content to.
  * `content` (string, **required**): The text content to append.
  * `append_newline` (boolean, optional): If `True` (default), a newline character will be added at the end of the appended content.
* **Output**: A dictionary indicating success, along with the old and new file content, or an error message.

### `CreateDirectoryTool`

* **Name**: `create_directory`
* **Description**: "Create a directory in the sandbox. Provide the path to the directory to create."
* **Input**:
  * `path` (string, **required**): Absolute path to the directory to create.
* **Output**: A string indicating success or failure.

### `FileExistsTool`

* **Name**: `file_exists`
* **Description**: "Check if a file or directory exists in the sandbox. Provide the path to check."
* **Input**:
  * `path` (string, **required**): Path to check for existence.
* **Output**: A string indicating whether the path exists or not, or an error message.

### `RenameFileTool`

* **Name**: `rename_file`
* **Description**: "Rename a file or directory in the sandbox. Provide the current path and the new path."
* **Input**:
  * `old_path` (string, **required**): Current path of the file or directory.
  * `new_path` (string, **required**): New path for the file or directory.
* **Output**: A string indicating success or failure.

## Usage

To use the `Filesystem` tools with a LangChain agent, you would typically initialize them and include them in the list of tools provided to your agent.

### Example (Conceptual)

```python
from langcrew_tools.filesystem import (
    WriteFileTool,
    ReadFileTool,
    ListFilesTool,
    DeleteFileTool,
    CreateDirectoryTool,
    FileExistsTool,
    RenameFileTool,
    FileReplaceTextTool,
    FileAppendTextTool,
)

write = WriteFileTool()
read = ReadFileTool()

write._arun("/workspace/hello.txt", "hello!")
ret = read._arun("/workspace/hello.txt")
print(ret)
```

## Installation

(Assuming standard Python package installation)

```bash
pip install langcrew-tools
```

## License

This module is part of the LangCrew project and is released under the MIT License.
