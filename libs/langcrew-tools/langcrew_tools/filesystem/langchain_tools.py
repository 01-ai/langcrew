import asyncio
from typing import ClassVar

from langchain_core.tools import BaseTool
from langcrew.utils.file_detect import is_binary_file
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..utils.sandbox import SandboxMixin


class WriteFileInput(BaseToolInput):
    """Input for WriteFileTool."""

    path: str = Field(
        ...,
        description="Path to the file to write, absolute path /workspace (e.g.'/workspace/report.txt')",
    )
    content: str = Field(..., description="Content to write to the file")


class WriteMultipleFilesInput(BaseToolInput):
    """Input for WriteMultipleFilesTool."""

    files: list[dict[str, str]] = Field(
        ...,
        description="List of files to write. Each item should have 'path' and 'data' keys",
    )


class ReadFileInput(BaseToolInput):
    """Input for ReadFileTool."""

    path: str = Field(
        ..., description="Path to the file to read, absolute path /workspace"
    )


class ListFilesInput(BaseToolInput):
    """Input for ListFilesTool."""

    path: str = Field(default="/", description="Path to the directory to list")
    depth: int = Field(default=1, description="Depth of the directory to list")


class DeleteFileInput(BaseToolInput):
    """Input for DeleteFileTool."""

    path: str = Field(
        ...,
        description="Path to the file or directory to delete, absolute path /workspace",
    )


class CreateDirectoryInput(BaseToolInput):
    """Input for CreateDirectoryTool."""

    path: str = Field(
        ...,
        description="Path to the directory to create, absolute path /workspace (e.g.'/workspace/report.txt')",
    )


class FileExistsInput(BaseToolInput):
    """Input for FileExistsTool."""

    path: str = Field(..., description="Path to check if it exists")


class RenameFileInput(BaseToolInput):
    """Input for RenameFileTool."""

    old_path: str = Field(..., description="Current path of the file or directory")
    new_path: str = Field(..., description="New path for the file or directory")


class WatchDirectoryInput(BaseToolInput):
    """Input for WatchDirectoryTool."""

    path: str = Field(..., description="Path to the directory to watch")
    recursive: bool = Field(
        default=False, description="Whether to watch subdirectories recursively"
    )


class FileReplaceTextInput(BaseToolInput):
    """Input for FileReplaceTextTool."""

    path: str = Field(..., description="path to the file, absolute path /workspace")
    old_str: str = Field(
        ..., description="text to replace (must appear exactly once in the file)"
    )
    new_str: str = Field(..., description="New text")


class FileAppendTextInput(BaseToolInput):
    """Input for FileAppendTextTool."""

    path: str = Field(
        ..., description="Path to the file to append content, absolute path /workspace"
    )
    content: str = Field(..., description="Text content to append to the file")
    append_newline: bool = Field(default=True, description="Add newline at the end")


class WriteFileTool(BaseTool, SandboxMixin):
    """Tool for writing content to a file in the sandbox."""

    name: ClassVar[str] = "write_file"
    args_schema: type[BaseModel] = WriteFileInput
    description: ClassVar[str] = (
        "Write content to a file in the sandbox. "
        "Provide the file path and content to write."
    )

    async def _arun(self, path: str, content: str, **kwargs) -> dict:
        """Write content to a file synchronously."""
        try:
            async_sandbox = await self.get_sandbox()
            await async_sandbox.files.write(path, content)
            return {
                "message": f"Successfully wrote to file: {path}",
                "old_file_content": "",
                "new_file_content": content,
            }
        except Exception as e:
            return {"error": f"Failed to write to file: {str(e)}"}

    def _run(self, path: str, content: str, **kwargs) -> dict:
        raise NotImplementedError("write_file only supports async execution.")


class ReadFileTool(BaseTool, SandboxMixin):
    """Tool for reading content from a file in the sandbox."""

    name: ClassVar[str] = "read_file"
    args_schema: type[BaseModel] = ReadFileInput
    description: ClassVar[str] = (
        "Read only text content from a file in the sandbox. Provide the file path."
    )

    async def _arun(self, path: str, **kwargs) -> dict:
        """Read file content asynchronously."""
        try:
            async_sandbox = await self.get_sandbox()
            content = await async_sandbox.files.read(path, format="bytes")
            if is_binary_file(content):
                return {
                    "error": "The file is binary, use file_parser or shell command tool to handle it."
                }
            return {
                "message": content.decode("utf-8"),
                "old_file_content": "",
                "new_file_content": content.decode("utf-8"),
            }
        except Exception as e:
            return {"error": f"Failed to read file: {str(e)}"}

    def _run(self, path: str, **kwargs) -> dict:
        raise NotImplementedError("write_file only supports async execution.")


class ListFilesTool(BaseTool, SandboxMixin):
    """Tool for listing files in a directory in the sandbox."""

    name: ClassVar[str] = "list_files"
    args_schema: type[BaseModel] = ListFilesInput
    description: ClassVar[str] = (
        "List files in a directory in the sandbox. "
        "Provide the directory path and optionally the depth to list."
    )

    async def _arun(self, path: str = "/", depth: int = 1, **kwargs) -> str:
        """List files asynchronously."""
        try:
            async_sandbox = await self.get_sandbox()
            files = await async_sandbox.files.list(path)
            file_list = "\n".join([f"- {file}" for file in files])
            return f"Files in {path}:\n{file_list}"
        except Exception as e:
            return f"Failed to list files: {str(e)}"

    def _run(self, path: str, depth: int = 1, **kwargs) -> str:
        raise NotImplementedError("write_file only supports async execution.")


class DeleteFileTool(BaseTool, SandboxMixin):
    """Tool for deleting a file or directory in the sandbox."""

    name: ClassVar[str] = "delete_file"
    args_schema: type[BaseModel] = DeleteFileInput
    description: ClassVar[str] = (
        "Delete a file or directory in the sandbox. "
        "Provide the path to the file or directory to delete."
    )

    async def _arun(self, path: str, **kwargs) -> str:
        """Delete file asynchronously."""
        try:
            async_sandbox = await self.get_sandbox()
            await async_sandbox.files.remove(path)
            return f"Successfully deleted: {path}"
        except Exception as e:
            return f"Failed to delete file: {str(e)}"

    def _run(self, path: str, **kwargs) -> str:
        raise NotImplementedError("delete_file only supports async execution.")


class FileReplaceTextTool(BaseTool, SandboxMixin):
    """Tool for replacing a specific text in a file in the sandbox."""

    name: ClassVar[str] = "file_replace_text"
    args_schema: type[BaseModel] = FileReplaceTextInput
    description: ClassVar[str] = (
        "Replace a specific text in a file in the sandbox. "
        "Provide the absolute path to the file /workspace (e.g.'/workspace/report.txt')"
    )

    async def _arun(self, path: str, old_str: str, new_str: str, **kwargs) -> dict:
        """Replace text synchronously."""
        try:
            async_sandbox = await self.get_sandbox()
            file_content = await async_sandbox.files.read(path)

            if file_content.count(old_str) != 1:
                return {
                    "error": f"The string '{old_str}' must appear exactly once in the file."
                }

            updated_content = file_content.replace(old_str, new_str)
            await async_sandbox.files.write(path, updated_content)

            return {
                "message": f"Successfully replaced '{old_str}' with '{new_str}' in {path}",
                "old_file_content": file_content,
                "new_file_content": updated_content,
            }
        except Exception as e:
            return {"error": f"Failed to replace text in file '{path}': {str(e)}"}

    def _run(self, path: str, old_str: str, new_str: str, **kwargs) -> dict:
        raise NotImplementedError("file_replace_text only supports async execution.")


class FileAppendTextTool(BaseTool, SandboxMixin):
    """Tool for appending text content to a file in the sandbox."""

    name: ClassVar[str] = "file_append_text"
    args_schema: type[BaseModel] = FileAppendTextInput
    description: ClassVar[str] = (
        "Append text to file end. Used for logs, document building, data collection etc."
    )

    async def _arun(
        self, path: str, content: str, append_newline: bool = True, **kwargs
    ) -> dict:
        """Append text to file asynchronously."""
        try:
            async_sandbox = await self.get_sandbox()

            # Add newline if requested
            final_content, existing_content = content, ""
            if append_newline and not content.endswith("\n"):
                final_content += "\n"

            # Check if file exists
            if await async_sandbox.files.exists(path):
                # Read existing content and append
                existing_content = await async_sandbox.files.read(path)
                updated_content = existing_content + final_content
            else:
                # Create new file with the content
                updated_content = final_content

            # Write the updated content
            await async_sandbox.files.write(path, updated_content)

            return {
                "message": f"Successfully appended content to {path}",
                "old_file_content": existing_content,
                "new_file_content": updated_content,
            }
        except Exception as e:
            return {"error": f"Failed to append to file '{path}': {str(e)}"}

    def _run(
        self, path: str, content: str, append_newline: bool = True, **kwargs
    ) -> dict:
        """Append text to file synchronously."""
        raise NotImplementedError("file_append_text only supports async execution.")


class CreateDirectoryTool(BaseTool, SandboxMixin):
    """Tool for creating a directory in the sandbox."""

    name: ClassVar[str] = "create_directory"
    args_schema: type[BaseModel] = CreateDirectoryInput
    description: ClassVar[str] = (
        "Create a directory in the sandbox. "
        "Provide the path to the directory to create."
    )

    async def _arun(self, path: str, **kwargs) -> str:
        """Create directory asynchronously."""
        try:
            async_sandbox = await self.get_sandbox()
            await async_sandbox.files.make_dir(path)
            return f"Successfully created directory: {path}"
        except Exception as e:
            return f"Failed to create directory: {str(e)}"

    def _run(self, path: str, **kwargs) -> str:
        raise NotImplementedError("create_directory only supports async execution.")


class FileExistsTool(BaseTool, SandboxMixin):
    """Tool for checking if a file or directory exists in the sandbox."""

    name: ClassVar[str] = "file_exists"
    args_schema: type[BaseModel] = FileExistsInput
    description: ClassVar[str] = (
        "Check if a file or directory exists in the sandbox. Provide the path to check."
    )

    async def _arun(self, path: str, **kwargs) -> str:
        """Check file existence asynchronously."""
        try:
            async_sandbox = await self.get_sandbox()
            exists = await async_sandbox.files.exists(path)
            return f"Path {path} {'exists' if exists else 'does not exist'}"
        except Exception as e:
            return f"Failed to check path: {str(e)}"

    def _run(self, path: str, **kwargs) -> str:
        raise NotImplementedError("file_exists only supports async execution.")


class RenameFileTool(BaseTool, SandboxMixin):
    """Tool for renaming a file or directory in the sandbox."""

    name: ClassVar[str] = "rename_file"
    args_schema: type[BaseModel] = RenameFileInput
    description: ClassVar[str] = (
        "Rename a file or directory in the sandbox. "
        "Provide the current path and the new path."
    )

    async def _arun(self, old_path: str, new_path: str, **kwargs) -> str:
        """Rename file asynchronously."""
        try:
            async_sandbox = await self.get_sandbox()
            await async_sandbox.files.rename(old_path, new_path)
            return f"Successfully renamed {old_path} to {new_path}"
        except Exception as e:
            return f"Failed to rename: {str(e)}"

    def _run(self, old_path: str, new_path: str, **kwargs) -> str:
        raise NotImplementedError("rename_file only supports async execution.")
