import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import the actual tool classes after mocking dependencies
from langcrew_tools.message import MessageConfig, MessageToUserTool
from langcrew_tools.message.langchain_tools import MessageToUserInput


# Create mock classes for S3 and Sandbox functionality
class MockAsyncS3Client:
    @staticmethod
    async def upload_directory_to_s3(sandbox, dir_path, s3_prefix):
        """Mock S3 upload that returns file metadata based on the test scenario."""
        # This will be overridden by specific test patches
        return []


class MockSandboxMixin:
    """Mock SandboxMixin for testing."""

    def __init__(self, **kwargs):
        self.sandbox_id = "test-sandbox-123"

    async def get_sandbox_and_upload_files(self):
        """Mock method that returns a mock sandbox."""
        mock_sandbox = AsyncMock()
        mock_sandbox.sandbox_id = self.sandbox_id
        mock_sandbox.files.list = AsyncMock(return_value=[])
        mock_sandbox.files.write = AsyncMock()
        return mock_sandbox


# Create mock modules
mock_s3_client = MagicMock()
mock_s3_client.AsyncS3Client = MockAsyncS3Client

mock_sandbox_base = MagicMock()
mock_sandbox_base.SandboxMixin = MockSandboxMixin

# Mock the modules before importing the actual tool
sys.modules["langcrew_tools.utils.s3.client"] = mock_s3_client
sys.modules["langcrew_tools.utils.sandbox.base_sandbox"] = mock_sandbox_base
sys.modules["e2b"] = MagicMock()
sys.modules["aiobotocore.session"] = MagicMock()


class TestMessageToUserInput:
    """Test MessageToUserInput model."""

    def test_input_validation(self):
        """Test input field validation and requirements."""
        from pydantic import ValidationError

        # Test required text field
        with pytest.raises(ValidationError):
            MessageToUserInput()

        # Test valid input
        input_model = MessageToUserInput(text="Hello user!")
        assert input_model.text == "Hello user!"
        assert input_model.attachments is None
        assert input_model.intent_type == "general"

        # Test invalid intent_type
        with pytest.raises(ValidationError):
            MessageToUserInput(text="Hello user!", intent_type="invalid_type")

    def test_attachments_field(self):
        """Test attachments field with different input types."""
        # Test with list
        attachments_list = ["/workspace/file1.txt", "/workspace/file2.png"]
        input_model = MessageToUserInput(text="Test", attachments=attachments_list)
        assert input_model.attachments == attachments_list

        # Test with JSON string (tool will parse this internally)
        attachments_json = '["/workspace/file1.txt", "/workspace/file2.png"]'
        input_model = MessageToUserInput(text="Test", attachments=attachments_json)
        assert input_model.attachments == attachments_json

    def test_intent_types(self):
        """Test all valid intent types."""
        intent_types = ["task_completed", "asking_user", "progress_update", "general"]
        for intent_type in intent_types:
            input_model = MessageToUserInput(text="Test", intent_type=intent_type)
            assert input_model.intent_type == intent_type


class TestMessageToUserTool:
    """Test MessageToUserTool functionality."""

    def test_tool_metadata(self):
        """Test tool metadata properties."""
        assert MessageToUserTool.name == "message_to_user"
        tool = MessageToUserTool()
        assert tool.args_schema == MessageToUserInput
        assert "notification message" in MessageToUserTool.description.lower()
        assert "file attachments" in MessageToUserTool.description.lower()

    def test_config_management(self):
        """Test configuration management and S3 prefix generation."""
        # Test default config
        tool = MessageToUserTool()
        assert tool.config.sandbox_workspace_path == "/workspace"
        assert tool.config.s3_upload_enabled is True

        # Test custom config
        custom_config = MessageConfig(
            sandbox_workspace_path="/custom/workspace",
            s3_upload_enabled=False,
            s3_prefix_template="custom/{sandbox_id}/uploads",
        )
        tool = MessageToUserTool(config=custom_config)
        assert tool.config == custom_config

        # Test S3 prefix generation
        sandbox_id = "test-sandbox-456"
        prefix = custom_config.get_s3_prefix(sandbox_id)
        assert prefix == "custom/test-sandbox-456/uploads"

    @pytest.mark.asyncio
    async def test_basic_functionality(self):
        """Test basic message sending functionality."""
        tool = MessageToUserTool()

        # Test successful basic message
        result = await tool._arun(text="Hello user!")
        assert result["status"] == "success"
        assert result["text"] == "Hello user!"
        assert result["attachments"] == []
        assert result["intent_type"] == "general"

        # Test with different intent types
        result = await tool._arun(text="Task completed", intent_type="task_completed")
        assert result["status"] == "success"
        assert result["intent_type"] == "task_completed"

    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling for various invalid inputs."""
        tool = MessageToUserTool()

        # Test empty text
        result = await tool._arun(text="")
        assert result["status"] == "error"
        assert "cannot be empty" in result["message"]

        # Test whitespace only
        result = await tool._arun(text="   ")
        assert result["status"] == "error"
        assert "cannot be empty" in result["message"]

        # Test invalid JSON attachments
        result = await tool._arun(text="Test", attachments='{"invalid": "json"')
        assert result["status"] == "error"
        assert "Invalid JSON" in result["message"]

        # Test non-list JSON
        result = await tool._arun(text="Test", attachments='{"key": "value"}')
        assert result["status"] == "error"
        assert "must contain an array" in result["message"]

        # Test non-absolute paths
        result = await tool._arun(text="Test", attachments=["relative/path/file.txt"])
        assert result["status"] == "error"
        assert "must be absolute" in result["message"]

    @pytest.mark.asyncio
    async def test_json_attachment_parsing(self):
        """Test JSON string attachment parsing and processing."""
        tool = MessageToUserTool()
        tool.sandbox_id = "test-sandbox-json"

        # Test valid JSON string parsing
        attachments_json = '["/workspace/file1.txt", "/workspace/file2.png"]'

        with patch(
            "langcrew_tools.utils.s3.client.AsyncS3Client.upload_directory_to_s3",
            AsyncMock(
                return_value=[
                    {
                        "url": "https://mock-s3.example.com/user_attachments/test-sandbox-json/file1.txt",
                        "size": 1024,
                        "content_type": "text/plain",
                    },
                ]
            ),
        ):
            result = await tool._arun(text="JSON test", attachments=attachments_json)
            assert result["status"] == "success"
            assert len(result["attachments"]) >= 1

    @pytest.mark.asyncio
    async def test_attachments_processing(self):
        """Test attachment processing with S3 upload."""
        tool = MessageToUserTool()
        tool.sandbox_id = "test-sandbox-attachments"

        attachments = ["/workspace/file1.txt", "/workspace/file2.png"]

        # Mock S3 upload process
        with patch(
            "langcrew_tools.utils.s3.client.AsyncS3Client.upload_directory_to_s3",
            AsyncMock(
                return_value=[
                    {
                        "url": "https://mock-s3.example.com/user_attachments/test-sandbox-attachments/file1.txt",
                        "size": 1024,
                        "content_type": "text/plain",
                    },
                    {
                        "url": "https://mock-s3.example.com/user_attachments/test-sandbox-attachments/file2.png",
                        "size": 2048,
                        "content_type": "image/png",
                    },
                ]
            ),
        ) as mock_s3_upload:
            result = await tool._arun(text="Files attached", attachments=attachments)

            assert result["status"] == "success"
            assert len(result["attachments"]) == 2
            assert "mock-s3.example.com" in result["attachments"][0]["url"]

            # Verify S3 upload was called
            mock_s3_upload.assert_called_once()

    @pytest.mark.asyncio
    async def test_s3_upload_control(self):
        """Test S3 upload enable/disable functionality."""
        # Test S3 upload disabled - should return original attachment info without upload
        config_disabled = MessageConfig(s3_upload_enabled=False)
        tool_disabled = MessageToUserTool(config=config_disabled)

        result = await tool_disabled._arun(
            text="Test", attachments=["/workspace/file.txt"]
        )
        assert result["status"] == "success"
        # Should return original attachment info when S3 is disabled
        assert len(result["attachments"]) == 1
        assert result["attachments"][0]["filename"] == "file.txt"
        assert result["attachments"][0]["path"] == "/workspace/file.txt"
        assert result["attachments"][0]["url"] == ""  # No URL since not uploaded
        assert result["attachments"][0]["show_user"] == 1

        # Test S3 upload enabled
        config_enabled = MessageConfig(s3_upload_enabled=True)
        tool_enabled = MessageToUserTool(config=config_enabled)
        tool_enabled.sandbox_id = "test-sandbox-s3"

        with patch(
            "langcrew_tools.utils.s3.client.AsyncS3Client.upload_directory_to_s3",
            AsyncMock(
                return_value=[
                    {
                        "url": "https://mock-s3.example.com/user_attachments/test-sandbox-s3/file.txt",
                        "size": 1024,
                        "content_type": "text/plain",
                    }
                ]
            ),
        ) as mock_s3_upload:
            result = await tool_enabled._arun(
                text="Test", attachments=["/workspace/file.txt"]
            )

            assert result["status"] == "success"
            assert len(result["attachments"]) == 1
            assert "mock-s3.example.com" in result["attachments"][0]["url"]
            mock_s3_upload.assert_called_once()

    @pytest.mark.asyncio
    async def test_sandbox_s3_integration(self):
        """Test comprehensive sandbox and S3 integration."""
        config = MessageConfig(
            s3_prefix_template="custom/{sandbox_id}/uploads", s3_upload_enabled=True
        )
        tool = MessageToUserTool(config=config)
        tool.sandbox_id = "integration-test-sandbox"

        attachments = ["/workspace/integration_test.txt"]

        # Mock both sandbox and S3 operations
        mock_sandbox = AsyncMock()
        mock_sandbox.sandbox_id = "integration-test-sandbox"

        with (
            patch.object(
                tool,
                "get_sandbox_and_upload_files",
                AsyncMock(return_value=mock_sandbox),
            ),
            patch(
                "langcrew_tools.utils.s3.client.AsyncS3Client.upload_directory_to_s3",
                AsyncMock(
                    return_value=[
                        {
                            "url": "https://mock-s3.example.com/custom/integration-test-sandbox/uploads/integration_test.txt",
                            "size": 2048,
                            "content_type": "text/plain",
                        }
                    ]
                ),
            ) as mock_s3_upload,
        ):
            result = await tool._arun(text="Integration test", attachments=attachments)

            assert result["status"] == "success"
            assert len(result["attachments"]) == 1

            # Verify custom S3 prefix was used
            call_args = mock_s3_upload.call_args
            expected_prefix = "custom/integration-test-sandbox/uploads"
            assert call_args[1]["s3_prefix"] == expected_prefix

            # Verify sandbox method was called
            tool.get_sandbox_and_upload_files.assert_called_once()

    @pytest.mark.asyncio
    async def test_s3_disabled_multiple_attachments(self):
        """Test multiple attachments when S3 is disabled."""
        config_disabled = MessageConfig(s3_upload_enabled=False)
        tool = MessageToUserTool(config=config_disabled)

        attachments = [
            "/workspace/doc.pdf",
            "/workspace/image.png",
            "/workspace/data.csv",
        ]

        result = await tool._arun(text="Multiple files", attachments=attachments)

        assert result["status"] == "success"
        assert len(result["attachments"]) == 3

        # Check all attachments are preserved
        filenames = [att["filename"] for att in result["attachments"]]
        assert "doc.pdf" in filenames
        assert "image.png" in filenames
        assert "data.csv" in filenames

        # Check all have empty URLs and show_user=1
        for attachment in result["attachments"]:
            assert attachment["url"] == ""
            assert attachment["show_user"] == 1
            assert attachment["path"].startswith("/workspace/")

    @pytest.mark.asyncio
    async def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        tool = MessageToUserTool()

        # Test None attachments
        result = await tool._arun(text="Test message", attachments=None)
        assert result["status"] == "success"
        assert result["attachments"] == []

        # Test empty list attachments
        result = await tool._arun(text="Test message", attachments=[])
        assert result["status"] == "success"
        assert result["attachments"] == []
