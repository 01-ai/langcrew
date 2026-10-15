"""Protocol definitions for middleware components.

This module defines abstract interfaces (Protocols) that middleware components
and tools depend on, enabling dependency inversion and loose coupling between layers.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class FilesystemBackend(Protocol):
    """Protocol for complete filesystem backend operations.
    
    This protocol defines a complete filesystem interface that any backend must
    implement to be compatible with langcrew tools and middleware components.
    
    The protocol follows Python's structural subtyping (PEP 544) - any class that
    implements these methods is automatically compatible, without explicit inheritance.
    
    Implementations:
        - SandboxFilesystemBackend: Sandbox-based filesystem for isolated environments
        - Future: LocalFilesystemBackend, MemoryFilesystemBackend, etc.
    
    Used by:
        - All filesystem tools in langchain_tools.py
        - LargeToolResultMiddleware for storing large tool results
    """

    # ==================== Basic File Operations ====================

    async def write(self, path: str, content: str) -> None:
        """Write content to a file (create or overwrite).
        
        Args:
            path: Absolute path to the file
            content: Content to write
            
        Raises:
            Exception: If write operation fails
        """
        ...

    async def read(
        self,
        path: str,
        offset: int = 0,
        limit: int | None = None,
        with_line_numbers: bool = False,
    ) -> str:
        """Read file content as text, optionally paginated by line.
        
        Args:
            path: Absolute path to the file
            offset: Starting line number (0-indexed)
            limit: Number of lines to read, or None to read to the end
            with_line_numbers: Whether to include formatted line numbers
            
        Returns:
            File content as string
            
        Raises:
            Exception: If file doesn't exist or read fails
        """
        ...

    async def read_bytes(self, path: str) -> bytes:
        """Read file content as raw bytes.
        
        Useful for binary file detection or when raw content is needed.
        
        Args:
            path: Absolute path to the file
            
        Returns:
            File content as bytes
            
        Raises:
            Exception: If file doesn't exist or read fails
        """
        ...

    async def exists(self, path: str) -> bool:
        """Check if file or directory exists.
        
        Args:
            path: Path to check
            
        Returns:
            True if exists, False otherwise
        """
        ...

    async def remove(self, path: str) -> None:
        """Remove a file or directory.
        
        Args:
            path: Path to remove
            
        Raises:
            Exception: If removal fails
        """
        ...

    # ==================== Directory Operations ====================

    async def list(self, path: str = "/") -> list[str]:
        """List files and directories in a path.
        
        Args:
            path: Directory path to list (default: "/")
            
        Returns:
            List of file/directory names (not full paths)
            
        Raises:
            Exception: If directory doesn't exist
        """
        ...

    async def make_dir(self, path: str) -> None:
        """Create a directory.
        
        Args:
            path: Directory path to create
            
        Raises:
            Exception: If creation fails
        """
        ...

    # ==================== Advanced Operations ====================

    async def rename(self, old_path: str, new_path: str) -> None:
        """Rename a file or directory.
        
        Args:
            old_path: Current path
            new_path: New path
            
        Raises:
            Exception: If rename fails
        """
        ...
