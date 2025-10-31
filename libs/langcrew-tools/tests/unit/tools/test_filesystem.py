import pytest
from unittest.mock import AsyncMock, patch

from langcrew_tools.filesystem import WriteFileTool


@pytest.mark.asyncio
async def test_write_file() -> None:
    tool = WriteFileTool()

    # Mock the sandbox and S3 client to avoid needing actual S3 configuration
    mock_sandbox = AsyncMock()
    mock_s3_client = AsyncMock()

    with patch('langcrew_tools.filesystem.langchain_tools.SandboxMixin.get_sandbox', return_value=mock_sandbox), \
         patch('langcrew_tools.filesystem.langchain_tools.S3ClientMixin.get_s3_client', return_value=mock_s3_client), \
         patch('langcrew_tools.filesystem.file_validators.fix_content', return_value="# this is a markdown title") as mock_fix_content:

        ret = await tool._arun(
            path="/workspace/test_markdown.md",
            content="# this is a markdown title",
        )
        assert "message" in ret.keys() and "Successfully" in ret["message"]

        # Verify that the sandbox write method was called
        mock_sandbox.files.write.assert_called_once_with("/workspace/test_markdown.md", "# this is a markdown title")
