# Re-export FilesystemBackend protocol from langcrew for convenience
from langcrew.middleware.protocols import FilesystemBackend

from .memory_backend import InMemoryFilesystemBackend
from .sandbox_backend import SandboxFilesystemBackend
from .tools import (
    FileEditInput,
    FileEditTool,
    ReadFileInput,
    ReadFileTool,
    WriteFileInput,
    WriteFileTool,
)

# Export simple class-based interface
# E2B Filesystem Module
# E2B Filesystem LangChain Tools
# Provides filesystem operations for e2b sandbox environment
__all__ = [
    # Interface (for extension)
    "FilesystemBackend",
    # Implementation
    "SandboxFilesystemBackend",
    "InMemoryFilesystemBackend",
    # Core tools (aligned with Claude Code: Read, Write, Edit)
    "ReadFileTool",
    "WriteFileTool",
    "FileEditTool",
    # Input schemas
    "ReadFileInput",
    "WriteFileInput",
    "FileEditInput",
]
