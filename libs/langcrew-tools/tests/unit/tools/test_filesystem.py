import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from langcrew_tools.filesystem import WriteFileTool, ReadFileTool, FileEditTool


def create_mock_sandbox():
    """Create a properly mocked sandbox."""
    sandbox = MagicMock()
    sandbox.files = MagicMock()
    sandbox.files.write = AsyncMock()
    sandbox.files.read = AsyncMock(return_value="test content")
    sandbox.files.exists = AsyncMock(return_value=True)
    sandbox.files.list = AsyncMock(return_value=["file1.txt"])
    return sandbox


def create_mock_backend(mock_sandbox):
    """Create a mock backend with initialized sandbox."""
    backend = AsyncMock()
    backend.write = AsyncMock()
    backend.read = AsyncMock(return_value="test content")
    backend.read_bytes = AsyncMock(return_value=b"test content")
    backend.exists = AsyncMock(return_value=True)
    backend._sandbox_instance = mock_sandbox
    async def get_sandbox():
        return mock_sandbox
    backend._get_sandbox = get_sandbox
    return backend


@pytest.mark.asyncio
async def test_write_file() -> None:
    """Test WriteFileTool with SandboxFilesystemBackend."""
    tool = WriteFileTool()

    mock_sandbox = create_mock_sandbox()
    mock_backend = create_mock_backend(mock_sandbox)
    mock_s3_client = AsyncMock()

    with patch('langcrew_tools.filesystem.tools.SandboxMixin.get_sandbox', return_value=mock_sandbox), \
         patch('langcrew_tools.filesystem.tools.S3ClientMixin.get_s3_client', return_value=mock_s3_client), \
         patch('langcrew_tools.filesystem.file_validators.fix_content', return_value="# markdown title"), \
         patch('langcrew_tools.filesystem.tools.SandboxFilesystemBackend', return_value=mock_backend):

        # Tool returns tuple (content, artifact) due to content_and_artifact response_format
        message, artifact = await tool._arun(
            path="/workspace/test.md",
            content="# markdown title",
        )
        
        assert "Successfully" in message
        assert "new_file_content" in artifact
        # Backend write is called
        mock_backend.write.assert_called_once()


@pytest.mark.asyncio
async def test_read_file_text() -> None:
    """Test ReadFileTool with text content."""
    tool = ReadFileTool()

    mock_sandbox = create_mock_sandbox()
    mock_backend = create_mock_backend(mock_sandbox)
    # Return valid UTF-8 text
    mock_backend.read_bytes = AsyncMock(return_value=b"text content here")

    with patch('langcrew_tools.filesystem.tools.SandboxMixin.get_sandbox', return_value=mock_sandbox), \
         patch('langcrew_tools.filesystem.tools.SandboxFilesystemBackend', return_value=mock_backend):

        # Tool returns tuple (content, artifact) due to content_and_artifact response_format
        content, artifact = await tool._arun(path="/workspace/test.txt")
        
        assert content == "text content here"
        assert "new_file_content" in artifact


@pytest.mark.asyncio
async def test_read_binary_file() -> None:
    """Test ReadFileTool detects binary files."""
    tool = ReadFileTool()

    mock_sandbox = create_mock_sandbox()
    mock_backend = create_mock_backend(mock_sandbox)
    # Return binary data with null bytes
    mock_backend.read_bytes = AsyncMock(return_value=b"\x00\x01\x02\x03binary")

    with patch('langcrew_tools.filesystem.tools.SandboxMixin.get_sandbox', return_value=mock_sandbox), \
         patch('langcrew_tools.filesystem.tools.SandboxFilesystemBackend', return_value=mock_backend):

        # Tool returns tuple (content, artifact) - error case returns error in artifact
        message, artifact = await tool._arun(path="/workspace/test.bin")
        
        assert "binary" in message.lower()
        assert "error" in artifact


@pytest.mark.asyncio
async def test_file_edit_success() -> None:
    """Test FileEditTool replaces text successfully."""
    tool = FileEditTool()

    mock_sandbox = create_mock_sandbox()
    mock_backend = create_mock_backend(mock_sandbox)
    mock_backend.read = AsyncMock(return_value="hello world hello")
    mock_s3_client = AsyncMock()

    with patch('langcrew_tools.filesystem.tools.SandboxMixin.get_sandbox', return_value=mock_sandbox), \
         patch('langcrew_tools.filesystem.tools.S3ClientMixin.get_s3_client', return_value=mock_s3_client), \
         patch('langcrew_tools.filesystem.file_validators.fix_content', side_effect=lambda s, s3, p, c: c), \
         patch('langcrew_tools.filesystem.tools.SandboxFilesystemBackend', return_value=mock_backend):

        # Tool returns tuple (content, artifact) due to content_and_artifact response_format
        message, artifact = await tool._arun(
            path="/workspace/test.txt",
            old_str="hello",
            new_str="hi",
        )
        
        # Should indicate success
        assert "occurrence" in message.lower() or "replaced" in message.lower()
        assert "new_file_content" in artifact


@pytest.mark.asyncio
async def test_file_edit_not_found() -> None:
    """Test FileEditTool when string not found."""
    tool = FileEditTool()

    mock_sandbox = create_mock_sandbox()
    mock_backend = create_mock_backend(mock_sandbox)
    mock_backend.read = AsyncMock(return_value="hello world")
    mock_s3_client = AsyncMock()

    with patch('langcrew_tools.filesystem.tools.SandboxMixin.get_sandbox', return_value=mock_sandbox), \
         patch('langcrew_tools.filesystem.tools.S3ClientMixin.get_s3_client', return_value=mock_s3_client), \
         patch('langcrew_tools.filesystem.file_validators.fix_content', side_effect=lambda s, s3, p, c: c), \
         patch('langcrew_tools.filesystem.tools.SandboxFilesystemBackend', return_value=mock_backend):

        # Tool returns tuple (content, artifact) due to content_and_artifact response_format
        message, artifact = await tool._arun(
            path="/workspace/test.txt",
            old_str="missing",
            new_str="new",
        )
        
        # Should indicate no changes or not found
        msg_lower = message.lower()
        assert "no occurrence" in msg_lower or "0" in message


@pytest.mark.asyncio
async def test_write_file_append_mode() -> None:
    """Test WriteFileTool with mode='append'."""
    tool = WriteFileTool()

    mock_sandbox = create_mock_sandbox()
    mock_backend = create_mock_backend(mock_sandbox)
    mock_backend.exists = AsyncMock(return_value=True)
    mock_backend.read = AsyncMock(return_value="existing content")
    mock_s3_client = AsyncMock()

    with patch('langcrew_tools.filesystem.tools.SandboxMixin.get_sandbox', return_value=mock_sandbox), \
         patch('langcrew_tools.filesystem.tools.S3ClientMixin.get_s3_client', return_value=mock_s3_client), \
         patch('langcrew_tools.filesystem.file_validators.fix_content', side_effect=lambda s, s3, p, c: c), \
         patch('langcrew_tools.filesystem.tools.SandboxFilesystemBackend', return_value=mock_backend):

        # Tool returns tuple (content, artifact) due to content_and_artifact response_format
        message, artifact = await tool._arun(
            path="/workspace/test.txt",
            content="new content",
            mode="append",
        )
        
        assert "Successfully" in message or "appended" in message.lower()
        
        # Verify write was called with combined content
        mock_backend.write.assert_called_once()
        call_args = mock_backend.write.call_args
        written_content = call_args[0][1]
        assert "existing content" in written_content
        assert "new content" in written_content
