"""
Test cases for SandboxMixin class and related sandbox utilities
"""

from unittest.mock import AsyncMock, patch

import pytest
from agentbox import AsyncSandbox

from langcrew_tools.utils.sandbox.base_sandbox import (
    SANDBOX_ID_KEY,
    SandboxMixin,
    create_sandbox_from_env_config,
    create_sandbox_source_by_session_id,
    none_sandbox,
)
from langcrew_tools.utils.sandbox.s3_integration import SandboxS3Toolkit, sandbox_s3_toolkit


class SandboxManagerForTesting(SandboxMixin):
    """Test implementation of SandboxMixin for testing purposes"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class TestSandboxMixin:
    """Test suite for SandboxMixin class"""

    @pytest.fixture
    def mock_async_sandbox(self):
        """Create a mock AsyncSandbox instance"""
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        mock_sandbox.sandbox_id = "test-sandbox-id"
        return mock_sandbox

    @pytest.fixture
    def sandbox_manager(self):
        """Create a test sandbox manager instance"""
        return SandboxManagerForTesting()

    @pytest.mark.asyncio
    async def test_get_sandbox_with_callable_source(self, mock_async_sandbox):
        """Test get_sandbox method with callable sandbox_source"""

        # Create a callable that returns the mock sandbox
        async def provider():
            return mock_async_sandbox

        # Create manager with callable source
        manager = SandboxManagerForTesting(sandbox_source=provider)

        # Test get_sandbox
        result = await manager.get_sandbox()

        # Assertions
        assert result is mock_async_sandbox
        assert manager._sandbox is mock_async_sandbox

    @pytest.mark.asyncio
    async def test_get_sandbox_with_sandbox_instance(self, mock_async_sandbox):
        """Test get_sandbox method with AsyncSandbox instance as source"""
        # Create manager with AsyncSandbox instance
        manager = SandboxManagerForTesting(sandbox_source=mock_async_sandbox)

        # Test get_sandbox
        result = await manager.get_sandbox()

        # Assertions
        assert result is mock_async_sandbox
        assert manager._sandbox is mock_async_sandbox

    @pytest.mark.asyncio
    async def test_get_sandbox_with_none_source(self, mock_async_sandbox):
        """Test get_sandbox method with None source (uses env config)"""
        with patch(
            "langcrew_tools.utils.sandbox.base_sandbox.create_sandbox_from_env_config",
            return_value=mock_async_sandbox,
        ) as mock_create:
            # Create manager with None source
            manager = SandboxManagerForTesting(sandbox_source=None)

            # Test get_sandbox
            result = await manager.get_sandbox()

            # Assertions
            assert result is mock_async_sandbox
            assert manager._sandbox is mock_async_sandbox
            mock_create.assert_called_once_with()

    @pytest.mark.asyncio
    async def test_get_sandbox_caching_behavior(self, mock_async_sandbox):
        """Test that get_sandbox caches the sandbox instance"""

        # Create a callable that returns the mock sandbox
        async def provider():
            return mock_async_sandbox

        # Create manager with callable source
        manager = SandboxManagerForTesting(sandbox_source=provider)

        # Call get_sandbox multiple times
        result1 = await manager.get_sandbox()
        result2 = await manager.get_sandbox()
        result3 = await manager.get_sandbox()

        # All results should be the same instance
        assert result1 is mock_async_sandbox
        assert result2 is mock_async_sandbox
        assert result3 is mock_async_sandbox
        assert result1 is result2 is result3

        # The provider should only be called once due to caching
        assert manager._sandbox is mock_async_sandbox

    @pytest.mark.asyncio
    async def test_get_sandbox_with_invalid_callable(self):
        """Test get_sandbox method with callable that raises exception"""

        async def failing_provider():
            raise ValueError("Provider failed")

        # Create manager with failing callable source
        manager = SandboxManagerForTesting(sandbox_source=failing_provider)

        # Test that exception is propagated
        with pytest.raises(ValueError, match="Provider failed"):
            await manager.get_sandbox()

    def test_base_sandbox_manager_initialization(self):
        """Test SandboxMixin initialization with different parameters"""
        # Test with no parameters (default None)
        manager1 = SandboxManagerForTesting()
        assert manager1.sandbox_source is None
        assert manager1._sandbox is None

        # Test with callable source
        async def provider():
            return AsyncMock()

        manager2 = SandboxManagerForTesting(sandbox_source=provider)
        assert manager2.sandbox_source is provider
        assert manager2._sandbox is None

        # Test with AsyncSandbox instance
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        manager3 = SandboxManagerForTesting(sandbox_source=mock_sandbox)
        assert manager3.sandbox_source is mock_sandbox
        assert manager3._sandbox is None

    @pytest.mark.asyncio
    async def test_multiple_managers_independent_caching(self, mock_async_sandbox):
        """Test that different manager instances have independent sandbox caching"""
        mock_sandbox2 = AsyncMock(spec=AsyncSandbox)
        mock_sandbox2.sandbox_id = "test-sandbox-id-2"

        # Create two managers with different sources
        async def provider1():
            return mock_async_sandbox

        async def provider2():
            return mock_sandbox2

        manager1 = SandboxManagerForTesting(sandbox_source=provider1)
        manager2 = SandboxManagerForTesting(sandbox_source=provider2)

        # Get sandboxes from both managers
        result1 = await manager1.get_sandbox()
        result2 = await manager2.get_sandbox()

        # Each manager should have its own cached sandbox
        assert result1 is mock_async_sandbox
        assert result2 is mock_sandbox2
        assert result1 is not result2
        assert manager1._sandbox is mock_async_sandbox
        assert manager2._sandbox is mock_sandbox2


class TestSandboxUtilities:
    """Test suite for sandbox utility functions"""

    @pytest.mark.asyncio
    async def test_create_sandbox_from_env_config_create_new(self):
        """Test create_sandbox_from_env_config creates new sandbox when no sandbox_id"""
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        mock_sandbox.sandbox_id = "new-sandbox-id"

        with patch("langcrew_tools.utils.sandbox.base_sandbox.AsyncSandbox.create", return_value=mock_sandbox) as mock_create:
            with patch("langcrew_tools.utils.sandbox.base_sandbox.E2B_CONFIG", {"api_key": "test-key", "template": "test-template", "timeout": "300", "domain": None}):
                result = await create_sandbox_from_env_config()

                assert result is mock_sandbox
                mock_create.assert_called_once_with(
                    api_key="test-key",
                    template="test-template",
                    timeout=300,
                    domain=None,
                )

    @pytest.mark.asyncio
    async def test_create_sandbox_from_env_config_resume_existing(self):
        """Test create_sandbox_from_env_config resumes existing sandbox when sandbox_id provided"""
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        mock_sandbox.sandbox_id = "existing-sandbox-id"

        with patch("langcrew_tools.utils.sandbox.base_sandbox.AsyncSandbox.list", return_value=[]) as mock_list:
            with patch("langcrew_tools.utils.sandbox.base_sandbox.AsyncSandbox.resume", return_value=mock_sandbox) as mock_resume:
                with patch("langcrew_tools.utils.sandbox.base_sandbox.E2B_CONFIG", {"api_key": "test-key", "template": "test-template", "timeout": "300", "domain": None}):
                    result = await create_sandbox_from_env_config("existing-sandbox-id")

                    assert result is mock_sandbox
                    mock_list.assert_called_once_with(api_key="test-key", domain=None)
                    mock_resume.assert_called_once_with(
                        api_key="test-key",
                        sandbox_id="existing-sandbox-id",
                        timeout=300,
                        domain=None,
                    )

    @pytest.mark.asyncio
    async def test_create_sandbox_source_by_session_id_new_session(self):
        """Test create_sandbox_source_by_session_id creates new sandbox for new session"""
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        mock_sandbox.sandbox_id = "new-sandbox-id"
        mock_state_manager = AsyncMock()
        mock_state_manager.get_value.return_value = None

        with patch("langcrew_tools.utils.sandbox.base_sandbox.create_sandbox_from_env_config", return_value=mock_sandbox):
            provider = create_sandbox_source_by_session_id(
                session_id="test-session",
                create_callback=None,
                checkpointer_state_manager=mock_state_manager,
            )

            result = await provider()

            assert result is mock_sandbox
            mock_state_manager.get_value.assert_called_once_with("test-session", SANDBOX_ID_KEY)
            mock_state_manager.set_value.assert_called_once_with("test-session", SANDBOX_ID_KEY, "new-sandbox-id")

    @pytest.mark.asyncio
    async def test_create_sandbox_source_by_session_id_existing_session(self):
        """Test create_sandbox_source_by_session_id resumes existing sandbox for existing session"""
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        mock_sandbox.sandbox_id = "existing-sandbox-id"
        mock_state_manager = AsyncMock()
        mock_state_manager.get_value.return_value = "existing-sandbox-id"

        with patch("langcrew_tools.utils.sandbox.base_sandbox.create_sandbox_from_env_config", return_value=mock_sandbox):
            provider = create_sandbox_source_by_session_id(
                session_id="test-session",
                create_callback=None,
                checkpointer_state_manager=mock_state_manager,
            )

            result = await provider()

            assert result is mock_sandbox
            mock_state_manager.get_value.assert_called_once_with("test-session", SANDBOX_ID_KEY)
            mock_state_manager.set_value.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_sandbox_source_by_session_id_with_callback(self):
        """Test create_sandbox_source_by_session_id calls create_callback"""
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        mock_sandbox.sandbox_id = "new-sandbox-id"
        mock_state_manager = AsyncMock()
        mock_state_manager.get_value.return_value = None
        mock_callback = AsyncMock()

        with patch("langcrew_tools.utils.sandbox.base_sandbox.create_sandbox_from_env_config", return_value=mock_sandbox):
            provider = create_sandbox_source_by_session_id(
                session_id="test-session",
                create_callback=mock_callback,
                checkpointer_state_manager=mock_state_manager,
            )

            result = await provider()

            assert result is mock_sandbox
            mock_callback.assert_called_once_with(mock_sandbox)

    def test_SANDBOX_ID_KEY_constant(self):
        """Test SANDBOX_ID_KEY constant"""
        assert SANDBOX_ID_KEY == "sandbox_id"

    @pytest.mark.asyncio
    async def test_none_sandbox_function(self):
        """Test none_sandbox function (placeholder)"""
        # This function is just a placeholder and should pass without doing anything
        result = await none_sandbox()
        assert result is None


class TestS3Integration:
    """Test suite for S3 integration functionality"""

    @pytest.fixture
    def mock_sandbox(self):
        """Create a mock AsyncSandbox instance"""
        mock_sandbox = AsyncMock(spec=AsyncSandbox)
        mock_sandbox.sandbox_id = "test-sandbox-id"
        return mock_sandbox

    @pytest.fixture
    def mock_s3_client(self):
        """Create a mock AsyncS3Client instance"""
        return AsyncMock()

    def test_sandbox_s3_toolkit_alias(self):
        """Test that sandbox_s3_toolkit is an alias for SandboxS3Toolkit"""
        assert sandbox_s3_toolkit is SandboxS3Toolkit

    def test_get_s3_path(self, mock_sandbox):
        """Test _get_s3_path method"""
        result = SandboxS3Toolkit._get_s3_path(mock_sandbox, "test/path.txt")
        expected = "sandbox/test-sandbox-id/test/path.txt"
        assert result == expected

    def test_get_s3_path_no_path(self, mock_sandbox):
        """Test _get_s3_path method with None path raises ValueError"""
        with pytest.raises(ValueError, match="s3_path is required"):
            SandboxS3Toolkit._get_s3_path(mock_sandbox, None)

    @pytest.mark.asyncio
    async def test_upload_base64_image_new_image(self, mock_s3_client):
        """Test upload_base64_image with new image"""
        test_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        expected_url = "https://test-bucket.s3.amazonaws.com/sandbox/test-sandbox-id/images/test.png"

        mock_s3_client.object_exists.return_value = False
        mock_s3_client.put_object.return_value = expected_url

        with patch("langcrew_tools.utils.sandbox.s3_integration.base64.b64decode") as mock_decode:
            mock_decode.return_value = b"test_image_data"

            result = await SandboxS3Toolkit.upload_base64_image(mock_s3_client, test_base64, "test-sandbox-id")

            assert result == expected_url
            mock_s3_client.object_exists.assert_called_once()
            mock_s3_client.put_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_base64_image_existing_image(self, mock_s3_client):
        """Test upload_base64_image with existing image returns existing URL"""
        test_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        expected_url = "https://test-bucket.s3.amazonaws.com/sandbox/test-sandbox-id/images/existing.png"

        mock_s3_client.object_exists.return_value = True
        mock_s3_client.generate_object_url.return_value = expected_url

        result = await SandboxS3Toolkit.upload_base64_image(mock_s3_client, test_base64, "test-sandbox-id")

        assert result == expected_url
        mock_s3_client.object_exists.assert_called_once()
        mock_s3_client.generate_object_url.assert_called_once()
        mock_s3_client.put_object.assert_not_called()

    @pytest.mark.asyncio
    async def test_upload_file_to_s3_success(self, mock_sandbox, mock_s3_client):
        """Test upload_file_to_s3 success"""
        with patch.object(SandboxS3Toolkit, "_internal_upload_file_to_s3") as mock_internal_upload:
            mock_internal_upload.return_value = {
                "url": "https://test-bucket.s3.amazonaws.com/test/url",
                "size": 1024,
                "content_type": "text/plain"
            }

            result = await SandboxS3Toolkit.upload_file_to_s3(
                sandbox=mock_sandbox,
                async_s3_client=mock_s3_client,
                file_path="/test/file.txt",
                s3_path="uploads/file.txt",
            )

            assert result == "https://test-bucket.s3.amazonaws.com/test/url"
            mock_internal_upload.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_file_to_s3_file_not_found(self, mock_sandbox, mock_s3_client):
        """Test upload_file_to_s3 when file doesn't exist"""
        mock_sandbox.files.exists.return_value = False

        result = await SandboxS3Toolkit.upload_file_to_s3(
            sandbox=mock_sandbox,
            async_s3_client=mock_s3_client,
            file_path="/test/file.txt",
            s3_path="uploads/file.txt",
        )

        assert result is None
        mock_sandbox.files.exists.assert_called_once_with("/test/file.txt")
        mock_s3_client.put_object.assert_not_called()

    @pytest.mark.asyncio
    async def test_upload_file_to_s3_missing_parameters(self, mock_sandbox, mock_s3_client):
        """Test upload_file_to_s3 with missing required parameters"""
        with pytest.raises(ValueError, match="file_path is required"):
            await SandboxS3Toolkit.upload_file_to_s3(
                sandbox=mock_sandbox,
                async_s3_client=mock_s3_client,
                file_path=None,
                s3_path="uploads/file.txt",
            )

        with pytest.raises(ValueError, match="s3_path is required"):
            await SandboxS3Toolkit.upload_file_to_s3(
                sandbox=mock_sandbox,
                async_s3_client=mock_s3_client,
                file_path="/test/file.txt",
                s3_path=None,
            )

    @pytest.mark.asyncio
    async def test_upload_directory_to_s3_success(self, mock_sandbox, mock_s3_client):
        """Test upload_directory_to_s3 success"""
        mock_sandbox.commands.run = AsyncMock(return_value=AsyncMock(
            stdout="/test/dir/file1.txt\n/test/dir/file2.txt",
            exit_code=0,
        ))

        with patch.object(SandboxS3Toolkit, "_internal_upload_file_to_s3") as mock_upload:
            mock_upload.side_effect = [
                {"url": "https://test-bucket.s3.amazonaws.com/file1.txt", "size": 100, "content_type": "text/plain"},
                {"url": "https://test-bucket.s3.amazonaws.com/file2.txt", "size": 200, "content_type": "text/plain"},
            ]

            result = await SandboxS3Toolkit.upload_directory_to_s3(
                async_sandbox=mock_sandbox,
                dir_path="/test/dir",
                s3_prefix="uploads",
                async_s3_client=mock_s3_client,
            )

            assert len(result) == 2
            assert result[0]["url"] == "https://test-bucket.s3.amazonaws.com/file1.txt"
            assert result[1]["url"] == "https://test-bucket.s3.amazonaws.com/file2.txt"

    @pytest.mark.asyncio
    async def test_upload_directory_to_s3_missing_parameters(self, mock_sandbox, mock_s3_client):
        """Test upload_directory_to_s3 with missing required parameters"""
        with pytest.raises(ValueError, match="dir_path is required"):
            await SandboxS3Toolkit.upload_directory_to_s3(
                async_sandbox=mock_sandbox,
                dir_path=None,
                s3_prefix="uploads",
                async_s3_client=mock_s3_client,
            )

        with pytest.raises(ValueError, match="s3_prefix is required"):
            await SandboxS3Toolkit.upload_directory_to_s3(
                async_sandbox=mock_sandbox,
                dir_path="/test/dir",
                s3_prefix=None,
                async_s3_client=mock_s3_client,
            )

    @pytest.mark.asyncio
    async def test_upload_s3_files_to_sandbox_success(self, mock_sandbox, mock_s3_client):
        """Test upload_s3_files_to_sandbox success"""
        files = [{"file_md5": "abc123"}, {"file_md5": "def456"}]

        mock_s3_client.object_exists.return_value = True
        mock_s3_client.read_object_bytes.side_effect = [b"file1 content", b"file2 content"]
        mock_sandbox.files.exists.return_value = True

        await SandboxS3Toolkit.upload_s3_files_to_sandbox(
            async_sandbox=mock_sandbox,
            files=files,
            client=mock_s3_client,
            dir_path="/workspace/upload",
        )

        # Verify both files were processed
        assert mock_s3_client.read_object_bytes.call_count == 2
        assert mock_sandbox.files.write.call_count == 2

    @pytest.mark.asyncio
    async def test_upload_s3_files_to_sandbox_missing_file(self, mock_sandbox, mock_s3_client):
        """Test upload_s3_files_to_sandbox with missing S3 object"""
        files = [{"file_md5": "missing123"}]

        mock_s3_client.object_exists.return_value = False

        await SandboxS3Toolkit.upload_s3_files_to_sandbox(
            async_sandbox=mock_sandbox,
            files=files,
            client=mock_s3_client,
            dir_path="/workspace/upload",
        )

        # Verify missing file was skipped
        mock_s3_client.read_object_bytes.assert_not_called()
        mock_sandbox.files.write.assert_not_called()
