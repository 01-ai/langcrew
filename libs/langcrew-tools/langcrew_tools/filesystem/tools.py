import logging
from typing import ClassVar, Literal

from langchain_core.tools import BaseTool
from langcrew.middleware.protocols import FilesystemBackend
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..utils.errors import error_response
from ..utils.s3 import S3ClientMixin
from ..utils.sandbox import SandboxMixin
from .file_validators import fix_content, is_binary_file, is_forbidden_binary_file
from .sandbox_backend import SandboxFilesystemBackend

logger = logging.getLogger(__name__)


class ReadFileInput(BaseToolInput):
    """Input schema for ReadFileTool."""

    path: str = Field(
        ..., description="Path to the file to read, absolute path /workspace"
    )
    offset: int = Field(
        default=0,
        description="Starting line number (0-indexed) for pagination. Default 0 reads from the beginning.",
    )
    limit: int | None = Field(
        default=None,
        description="Number of lines to read. None (default) reads all lines from offset to end. "
        "Use this to read large files in chunks, e.g., limit=100 reads 100 lines.",
    )


class WriteFileInput(BaseToolInput):
    """Input schema for WriteFileTool with write/append modes."""

    path: str = Field(
        ...,
        description="Path to the file to write, absolute path /workspace (e.g.'/workspace/report.txt')",
    )
    content: str = Field(..., description="Content to write to the file")
    mode: Literal["write", "append"] = Field(
        default="write",
        description="Write mode: 'write' to overwrite/create file, 'append' to add content to end of file",
    )


class FileEditInput(BaseToolInput):
    """Input schema for FileEditTool."""

    path: str = Field(..., description="Path to the file, absolute path /workspace")
    old_str: str = Field(
        ..., description="Text to replace (must appear exactly once in the file)"
    )
    new_str: str = Field(..., description="New text to replace with")


class ReadFileTool(BaseTool, SandboxMixin):
    """Tool for reading content from a file in the sandbox."""

    name: ClassVar[str] = "read_file"
    args_schema: type[BaseModel] = ReadFileInput
    backend: FilesystemBackend | None = None
    response_format: Literal["content_and_artifact"] = "content_and_artifact"
    description: ClassVar[
        str
    ] = """Read text content from a file in the sandbox with optional pagination.

**Basic usage:**
- Provide the file path to read the entire file

**Pagination for large files:**
- Use 'offset' (line number, 0-indexed) to start reading from a specific line
- Use 'limit' (number of lines) to read only a portion of the file
- Example: offset=0, limit=100 reads the first 100 lines
- Example: offset=100, limit=100 reads lines 100-199

**Important:**
- This tool is for text files only and will return an error for binary files
- For large files, always use pagination to avoid context overflow
"""

    async def _arun(
        self,
        path: str,
        offset: int = 0,
        limit: int | None = None,
        **kwargs,
    ) -> tuple[str, dict]:
        """Read file content asynchronously with pagination support."""
        try:
            # Get or use injected backend
            if self.backend is not None:
                backend = self.backend
            else:
                sandbox = await self.get_sandbox()
                backend = SandboxFilesystemBackend(sandbox=sandbox)

            # For binary detection, we need to read bytes first
            # But only if we're reading from the beginning (offset=0)
            if offset == 0:
                # Read as bytes to detect binary files
                content_bytes = await backend.read_bytes(path)

                # Check if binary
                if is_binary_file(content_bytes):
                    return error_response(
                        "The file is binary, use file_parser or shell command tool to handle it."
                    )

                # Decode and apply pagination if needed
                full_content = content_bytes.decode("utf-8")

                if limit is not None:
                    lines = full_content.splitlines()
                    lines = lines[:limit]
                    content_str = "\n".join(lines)
                else:
                    content_str = full_content
            else:
                # For offset > 0, use the optimized read with pagination
                # Skip binary check since we're reading from middle of file
                content_str = await backend.read(path, offset=offset, limit=limit)

            # Return (content for agent, artifact for frontend)
            return (
                content_str,
                {"old_file_content": "", "new_file_content": content_str},
            )
        except Exception as e:
            logger.exception(f"Failed to read file: {path}")
            return error_response(f"Failed to read file: {str(e)}")

    def _run(
        self, path: str, offset: int = 0, limit: int | None = None, **kwargs
    ) -> dict:
        raise NotImplementedError("read_file only supports async execution.")


class WriteFileTool(BaseTool, SandboxMixin, S3ClientMixin):
    """Tool for writing content to a file in the sandbox with write/append modes."""

    name: ClassVar[str] = "write_file"
    args_schema: type[BaseModel] = WriteFileInput
    backend: FilesystemBackend | None = None
    response_format: Literal["content_and_artifact"] = "content_and_artifact"
    description: ClassVar[
        str
    ] = """Write or append text content to a file in the sandbox.

**Modes:**
- mode='write' (default): Create a new file or completely replace existing content
- mode='append': Add content to the end of an existing file (creates file if not exists)

**When to use mode='write':**
- Creating new files with small to moderate content
- Completely replacing existing file content
- Writing configuration files, scripts, or code files

**When to use mode='append':**
- Writing large amounts of text/tokens to avoid token limits
- Building documents section by section or chapter by chapter
- Collecting data progressively (e.g., search results, API responses)
- Appending logs, results, or outputs continuously

**Note:**
- Provide the absolute file path (e.g., '/workspace/report.txt')
- If you have a file URL, using shell command 'wget -O file_path url' is preferred
- Direct writing to binary files (e.g., .docx, .pdf, etc.) is prohibited via
  `write_file`. Please write to a Markdown file first and then use the `pandoc`
  command-line tool to convert it to the target format.
"""

    async def _arun(
        self,
        path: str,
        content: str,
        mode: Literal["write", "append"] = "write",
        **kwargs,
    ) -> tuple[str, dict]:
        """Write or append content to a file asynchronously."""
        try:
            if is_forbidden_binary_file(path):
                error_msg = (
                    f"Writing directly to binary files (like {path}) is not allowed "
                    "via write_file. Please write to a markdown file first and "
                    "use pandoc to convert it."
                )
                return error_response(error_msg)

            # Get or use injected backend
            # When backend is injected, skip sandbox/S3 entirely
            if self.backend is not None:
                backend = self.backend
                if mode == "append":
                    existing_content = (
                        await backend.read(path) if await backend.exists(path) else ""
                    )
                    final_content = content if content.endswith("\n") else content + "\n"
                    updated_content = existing_content + final_content
                    await backend.write(path, updated_content)
                    return (
                        f"Successfully appended content to {path}",
                        {
                            "old_file_content": existing_content,
                            "new_file_content": updated_content,
                        },
                    )
                else:
                    await backend.write(path, content)
                    return (
                        f"Successfully wrote to file: {path}",
                        {"old_file_content": "", "new_file_content": content},
                    )

            # Production path: requires sandbox and S3
            sandbox = await self.get_sandbox()
            s3 = await self.get_s3_client()
            backend = SandboxFilesystemBackend(sandbox=sandbox)

            if mode == "append":
                # Append mode: read existing content and concatenate
                existing_content = ""
                if await backend.exists(path):
                    existing_content = await backend.read(path)

                # Prepare content to append (ensure newline)
                final_content = content
                if not content.endswith("\n"):
                    final_content += "\n"

                # Concatenate in memory
                updated_content = existing_content + final_content

                # Apply S3 content fixes if needed
                updated_content = await fix_content(sandbox, s3, path, updated_content)

                # Write once
                await backend.write(path, updated_content)

                return (
                    f"Successfully appended content to {path}",
                    {
                        "old_file_content": existing_content,
                        "new_file_content": updated_content,
                    },
                )
            else:
                # Write mode: overwrite/create file
                # Apply S3 content fixes if needed (for images in HTML/MD)
                content = await fix_content(sandbox, s3, path, content)

                # Write using backend
                await backend.write(path, content)

                return (
                    f"Successfully wrote to file: {path}",
                    {"old_file_content": "", "new_file_content": content},
                )
        except Exception as e:
            logger.exception(f"Failed to write to file: {path}")
            return error_response(f"Failed to write to file: {str(e)}")

    def _run(
        self,
        path: str,
        content: str,
        mode: Literal["write", "append"] = "write",
        **kwargs,
    ) -> dict:
        raise NotImplementedError("write_file only supports async execution.")


class FileEditTool(BaseTool, SandboxMixin, S3ClientMixin):
    """Tool for editing a file by replacing text."""

    name: ClassVar[str] = "file_edit"
    args_schema: type[BaseModel] = FileEditInput
    backend: FilesystemBackend | None = None
    response_format: Literal["content_and_artifact"] = "content_and_artifact"
    description: ClassVar[
        str
    ] = """Edit a file by replacing specific text with new text (search-replace).

**Usage:**
- Provide 'old_str': the exact text to find in the file
- Provide 'new_str': the replacement text

**Important:**
- The old_str must exist in the file, otherwise no changes will be made
- All occurrences of old_str will be replaced
- Use this for targeted edits instead of rewriting the entire file

**Best practice:**
- First use read_file to view the current content
- Then use file_edit to make precise changes
"""

    async def _arun(
        self, path: str, old_str: str, new_str: str, **kwargs
    ) -> tuple[str, dict]:
        """Replace text in file asynchronously."""
        try:
            # When backend is injected, skip sandbox/S3 entirely
            if self.backend is not None:
                backend = self.backend
                file_content = await backend.read(path)
                occurrence_count = file_content.count(old_str)
                if occurrence_count == 0:
                    message = f"No occurrences of '{old_str}' found in {path}. No changes made."
                    return (
                        message,
                        {"old_file_content": file_content, "new_file_content": file_content},
                    )
                updated_content = file_content.replace(old_str, new_str)
                await backend.write(path, updated_content)
                message = f"Successfully replaced {occurrence_count} occurrence(s) of '{old_str}' with '{new_str}' in {path}"
                return (
                    message,
                    {"old_file_content": file_content, "new_file_content": updated_content},
                )

            # Production path: requires sandbox and S3
            sandbox = await self.get_sandbox()
            s3 = await self.get_s3_client()
            backend = SandboxFilesystemBackend(sandbox=sandbox)

            # Read original content
            file_content = await backend.read(path)

            # Check occurrence count
            occurrence_count = file_content.count(old_str)
            if occurrence_count == 0:
                message = (
                    f"No occurrences of '{old_str}' found in {path}. No changes made."
                )
                return (
                    message,
                    {
                        "old_file_content": file_content,
                        "new_file_content": file_content,
                    },
                )

            # Replace text (replaces all occurrences)
            updated_content = file_content.replace(old_str, new_str)

            # Apply S3 content fixes if needed
            updated_content = await fix_content(sandbox, s3, path, updated_content)

            # Write back
            await backend.write(path, updated_content)

            message = f"Successfully replaced {occurrence_count} occurrence(s) of '{old_str}' with '{new_str}' in {path}"

            # Return (content for agent, artifact for frontend)
            return (
                message,
                {"old_file_content": file_content, "new_file_content": updated_content},
            )
        except Exception as e:
            logger.exception(f"Failed to edit file: {path}")
            return error_response(f"Failed to edit file '{path}': {str(e)}")

    def _run(self, path: str, old_str: str, new_str: str, **kwargs) -> dict:
        raise NotImplementedError("file_edit only supports async execution.")
