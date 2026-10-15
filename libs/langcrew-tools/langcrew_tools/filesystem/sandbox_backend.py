"""Unified Sandbox Filesystem Backend.

This module provides a unified filesystem backend that wraps AsyncSandbox operations,
designed to support both langcrew-tools and middleware requirements.
"""

from __future__ import annotations

import asyncio
import fnmatch
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

logger = logging.getLogger(__name__)


class SandboxFilesystemBackend(BaseModel):
    """Unified Sandbox filesystem backend supporting langcrew-tools and middleware.

    This backend provides a consistent API for file operations on top of AsyncSandbox,
    with support for:
    - Basic file operations (read/write/exists/remove)
    - Directory operations (list/make_dir/rename)
    - Advanced operations (append/edit)
    - Search operations (grep/glob)

    The backend accepts either:
    - AsyncSandbox instance (for immediate use)
    - Callable that returns AsyncSandbox (for lazy initialization)

    This makes it testable and allows delaying sandbox creation until first use.
    """

    sandbox: Any | Callable[[], Awaitable[Any]] = Field(
        ..., description="AsyncSandbox instance or callable that returns AsyncSandbox"
    )
    model_config = ConfigDict(arbitrary_types_allowed=True)

    # Internal fields for lazy initialization (using PrivateAttr for Pydantic)
    _sandbox_instance: Any = PrivateAttr(default=None)
    _lock: asyncio.Lock = PrivateAttr(default_factory=asyncio.Lock)

    async def _get_sandbox(self) -> Any:
        """Get or initialize sandbox instance.

        This method handles lazy initialization of the sandbox:
        - If sandbox is already initialized, return it
        - If sandbox is a callable, call it and cache the result
        - If sandbox is an instance, cache and return it

        Thread-safe with asyncio.Lock for concurrent access.

        Returns:
            AsyncSandbox instance
        """
        if self._sandbox_instance is not None:
            return await self._sandbox_instance.connect()

        async with self._lock:
            if self._sandbox_instance is None:
                if callable(self.sandbox):
                    logger.info("Lazy initializing sandbox from callable")
                    self._sandbox_instance = await self.sandbox()
                else:
                    self._sandbox_instance = self.sandbox
            return await self._sandbox_instance.connect()

    # ==================== Basic File Operations ====================

    async def write(self, path: str, content: str) -> None:
        """Write content to a file (create or overwrite).

        Args:
            path: Absolute path to the file
            content: Content to write

        Raises:
            Exception: If write operation fails
        """
        sandbox = await self._get_sandbox()
        await sandbox.files.write(path, content)
        logger.info(f"Wrote {len(content)} bytes to {path}")

    async def read(
        self,
        path: str,
        offset: int = 0,
        limit: int | None = None,
        with_line_numbers: bool = False,
    ) -> str:
        """Read file content with optional pagination and line numbers.

        Args:
            path: Absolute path to the file
            offset: Starting line number (0-indexed), default 0
            limit: Number of lines to read, None = all lines
            with_line_numbers: Whether to format with line numbers (cat -n style)

        Returns:
            File content as string

        Raises:
            Exception: If file doesn't exist or read fails
        """
        sandbox = await self._get_sandbox()

        # Optimization: For full file reads (no pagination), read and return directly
        # This is the most common case and avoids unnecessary line splitting
        if offset == 0 and limit is None and not with_line_numbers:
            return await sandbox.files.read(path)

        # For paginated/formatted reads, use efficient line-by-line processing
        content = await sandbox.files.read(path)

        # Use str.splitlines() which is optimized in CPython
        # Only split once and slice the result
        lines = content.splitlines()

        # Early validation: check if offset is beyond file length
        if offset >= len(lines):
            return ""

        # Apply pagination with slice (efficient, no data copying)
        if limit is not None:
            end_idx = min(offset + limit, len(lines))
            lines = lines[offset:end_idx]
        elif offset > 0:
            lines = lines[offset:]

        # Format with line numbers if requested
        if with_line_numbers:
            # Lazy import to avoid circular dependency
            from langcrew.middleware.utils import format_content_with_line_numbers

            return format_content_with_line_numbers(lines, start_line=offset + 1)

        return "\n".join(lines)

    async def read_bytes(self, path: str) -> bytes:
        """Read file content as raw bytes.

        This is useful for binary file detection or when you need the raw file content.

        Args:
            path: Absolute path to the file

        Returns:
            File content as bytes

        Raises:
            Exception: If file doesn't exist or read fails
        """
        sandbox = await self._get_sandbox()
        return await sandbox.files.read(path, format="bytes")

    async def exists(self, path: str) -> bool:
        """Check if file or directory exists.

        Args:
            path: Path to check

        Returns:
            True if exists, False otherwise
        """
        sandbox = await self._get_sandbox()
        return await sandbox.files.exists(path)

    async def remove(self, path: str) -> None:
        """Remove a file or directory.

        Args:
            path: Path to remove

        Raises:
            Exception: If removal fails
        """
        sandbox = await self._get_sandbox()
        await sandbox.files.remove(path)
        logger.info(f"Removed {path}")

    # ==================== Directory Operations ====================

    async def list(self, path: str = "/") -> list[str]:
        """List files and directories in a path.

        Args:
            path: Directory path to list

        Returns:
            List of file/directory names (not full paths)

        Raises:
            Exception: If directory doesn't exist
        """
        sandbox = await self._get_sandbox()
        return await sandbox.files.list(path)

    async def ls_info(self, path: str) -> list[dict[str, Any]]:
        """List files with detailed information.

        Args:
            path: Directory path to list

        Returns:
            List of dicts with keys: path, is_dir, size, modified_at

        Note:
            This is a best-effort implementation. Some fields may be missing
            depending on sandbox capabilities.
        """
        sandbox = await self._get_sandbox()
        files = await sandbox.files.list(path)

        result = []
        for file_name in files:
            full_path = f"{path.rstrip('/')}/{file_name}"
            info: dict[str, Any] = {"path": full_path}

            # Try to determine if it's a directory
            try:
                # Attempt to list - if it succeeds, it's a directory
                await sandbox.files.list(full_path)
                info["is_dir"] = True
            except Exception:
                info["is_dir"] = False

            result.append(info)

        return result

    async def make_dir(self, path: str) -> None:
        """Create a directory.

        Args:
            path: Directory path to create

        Raises:
            Exception: If creation fails
        """
        sandbox = await self._get_sandbox()
        await sandbox.files.make_dir(path)
        logger.info(f"Created directory {path}")

    async def rename(self, old_path: str, new_path: str) -> None:
        """Rename a file or directory.

        Args:
            old_path: Current path
            new_path: New path

        Raises:
            Exception: If rename fails
        """
        sandbox = await self._get_sandbox()
        await sandbox.files.rename(old_path, new_path)
        logger.info(f"Renamed {old_path} to {new_path}")

    # ==================== Advanced File Operations ====================

    async def append(self, path: str, content: str) -> None:
        """Append content to end of file.

        Args:
            path: File path
            content: Content to append

        Raises:
            Exception: If operation fails
        """
        sandbox = await self._get_sandbox()
        # Read existing content if file exists
        if await sandbox.files.exists(path):
            existing_content = await sandbox.files.read(path)
            updated_content = existing_content + content
        else:
            updated_content = content

        await sandbox.files.write(path, updated_content)
        logger.info(f"Appended {len(content)} bytes to {path}")

    async def edit(
        self,
        path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> dict[str, Any]:
        """Replace text in a file.

        Args:
            path: File path
            old_string: String to replace
            new_string: Replacement string
            replace_all: Whether to replace all occurrences

        Returns:
            Dict with keys: occurrences (int), success (bool), error (str, optional)

        Raises:
            Exception: If file doesn't exist or read fails
        """
        sandbox = await self._get_sandbox()
        content = await sandbox.files.read(path)

        occurrences = content.count(old_string)

        if occurrences == 0:
            return {
                "success": False,
                "occurrences": 0,
                "error": f"String not found in file: '{old_string}'",
            }

        if occurrences > 1 and not replace_all:
            return {
                "success": False,
                "occurrences": occurrences,
                "error": f"String '{old_string}' appears {occurrences} times. "
                f"Use replace_all=True to replace all instances.",
            }

        # Perform replacement
        updated_content = content.replace(old_string, new_string)
        await sandbox.files.write(path, updated_content)

        logger.info(f"Replaced {occurrences} occurrence(s) in {path}")

        return {"success": True, "occurrences": occurrences}

    # ==================== Search Operations ====================

    async def grep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
    ) -> list[dict[str, Any]]:
        """Search for text pattern in files.

        Args:
            pattern: Text pattern to search (literal string, not regex)
            path: Directory to search in (default: /workspace)
            glob: Glob pattern to filter files (e.g., "*.py")

        Returns:
            List of dicts with keys: path, line (int), text (str)
        """
        sandbox = await self._get_sandbox()
        search_path = path or "/workspace"

        # Get list of files to search
        files = await self._get_files_recursive(search_path, glob)

        matches = []
        for file_path in files:
            try:
                content = await sandbox.files.read(file_path)
                for line_num, line in enumerate(content.splitlines(), 1):
                    if pattern in line:
                        matches.append({
                            "path": file_path,
                            "line": line_num,
                            "text": line[:1000],  # Truncate long lines
                        })
            except Exception as e:
                # Skip files that can't be read (binary files, etc.)
                logger.info(f"Skipping {file_path}: {e}")
                continue

        return matches

    async def glob(self, pattern: str, path: str = "/") -> list[str]:
        """Find files matching a glob pattern.

        Args:
            pattern: Glob pattern (e.g., "**/*.py", "*.txt")
            path: Base directory to search from

        Returns:
            List of matching file paths
        """
        all_files = await self._get_files_recursive(path)

        # Match against pattern
        matched = []
        for file_path in all_files:
            # Make path relative to search base for matching
            relative_path = file_path.removeprefix(path.rstrip("/") + "/")
            if fnmatch.fnmatch(relative_path, pattern):
                matched.append(file_path)

        return matched

    # ==================== Helper Methods ====================

    async def _get_files_recursive(
        self, path: str, glob_pattern: str | None = None
    ) -> list[str]:
        """Recursively get all files in a directory.

        Args:
            path: Directory to search
            glob_pattern: Optional glob pattern to filter files

        Returns:
            List of absolute file paths
        """
        sandbox = await self._get_sandbox()
        all_files = []

        async def _walk(current_path: str):
            try:
                items = await sandbox.files.list(current_path)
            except Exception:
                return

            for item in items:
                full_path = f"{current_path.rstrip('/')}/{item}"

                # Check if it's a directory
                try:
                    await sandbox.files.list(full_path)
                    # It's a directory, recurse
                    await _walk(full_path)
                except Exception:
                    # It's a file
                    if glob_pattern is None or fnmatch.fnmatch(item, glob_pattern):
                        all_files.append(full_path)

        await _walk(path)
        return all_files
