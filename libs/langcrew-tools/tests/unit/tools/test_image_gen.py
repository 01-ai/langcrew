import base64
import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

# Now import the tool with mocked dependencies
from langcrew_tools.image_gen.langchain_tools import (
    ImageGenerationInput,
    ImageGenerationTool,
)


# Mock all langcrew.utils modules before importing the tool
def mock_detect_chinese(text):
    """Simple mock function that detects Chinese characters."""
    if not text:
        return False

    # Simple language detection based on character patterns
    chinese_chars = sum(1 for char in text if "\u4e00" <= char <= "\u9fff")
    total_chars = len(text.strip())

    if total_chars == 0:
        return False

    chinese_ratio = chinese_chars / total_chars
    # If more than 30% Chinese characters, consider it Chinese
    return chinese_ratio >= 0.3


class MockSandboxToolkit:
    @staticmethod
    async def create_async_sandbox(config_dict):
        mock_sandbox = AsyncMock()
        mock_sandbox.sandbox_id = "mock-sandbox-id"
        mock_sandbox.files.list = AsyncMock(return_value=[])
        mock_sandbox.files.write = AsyncMock()
        mock_sandbox.commands.run = AsyncMock()
        return mock_sandbox

    @staticmethod
    async def connect_or_resume_async_sandbox(config_dict):
        mock_sandbox = AsyncMock()
        mock_sandbox.sandbox_id = config_dict.get("sandbox_id", "existing-sandbox-id")
        mock_sandbox.files.list = AsyncMock(return_value=[])
        mock_sandbox.files.write = AsyncMock()
        mock_sandbox.commands.run = AsyncMock()
        return mock_sandbox


class MockSandboxS3Toolkit:
    @staticmethod
    async def upload_base64_image(base64_data, sandbox_id):
        return f"https://mock-s3.example.com/sandbox/{sandbox_id}/image.png"


class MockSandboxCreateConfig:
    def __init__(self, **kwargs):
        self.data = kwargs

    def to_dict(self):
        return {k: v for k, v in self.data.items() if v is not None}


# Create mock modules
mock_language = MagicMock()
mock_language.detect_chinese = mock_detect_chinese

mock_sandbox = MagicMock()
mock_sandbox.SandboxToolkit = MockSandboxToolkit

mock_s3_integration = MagicMock()
mock_s3_integration.SandboxS3Toolkit = MockSandboxS3Toolkit

mock_sandbox_create_config = MagicMock()
mock_sandbox_create_config.SandboxCreateConfig = MockSandboxCreateConfig

# Mock the utils modules before import
sys.modules["langcrew.utils"] = MagicMock()
sys.modules["langcrew.utils.language"] = mock_language
sys.modules["langcrew.utils.sandbox"] = mock_sandbox
sys.modules["langcrew.utils.s3"] = MagicMock()
sys.modules["langcrew.utils.s3.sandbox_integration"] = mock_s3_integration
sys.modules["langcrew.utils.sandbox.sandbox_create_config"] = mock_sandbox_create_config

# Also mock the direct function access
mock_language.detect_chinese = mock_detect_chinese




class TestImageGenerationInput:
    """Test ImageGenerationInput model."""

    def test_required_fields(self):
        """Test required fields for ImageGenerationInput."""
        input_model = ImageGenerationInput(prompt="a beautiful sunset")
        assert input_model.prompt == "a beautiful sunset"
        assert input_model.path is None

    def test_optional_path(self):
        """Test optional path field."""
        input_model = ImageGenerationInput(prompt="a cat", path="images/cat.png")
        assert input_model.prompt == "a cat"
        assert input_model.path == "images/cat.png"


class TestImageGenerationTool:
    """Test ImageGenerationTool basic functionality."""

    def test_init_with_constructor_params(self):
        """Test initialization with constructor parameters."""
        tool = ImageGenerationTool(
            api_key="test-api-key",
            base_url="https://custom.api.com/v1/",
            proxy_url="http://proxy.example.com:8080",
            default_size="512x512",
            default_quality="high",
            default_n=2,
            enable_sandbox=True,
        )
        assert tool.api_key == "test-api-key"
        assert tool.base_url == "https://custom.api.com/v1/"
        assert tool.proxy_url == "http://proxy.example.com:8080"
        assert tool.default_size == "512x512"
        assert tool.default_quality == "high"
        assert tool.default_n == 2
        assert tool.enable_sandbox is True

    def test_init_with_env_vars(self, monkeypatch):
        """Test initialization with environment variables."""
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_API_KEY", "env-api-key")
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_BASE_URL", "https://env.api.com/")
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_PROXY_URL", "http://env-proxy:8080")
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_DEFAULT_SIZE", "256x256")
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_DEFAULT_QUALITY", "standard")
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_DEFAULT_N", "3")
        tool = ImageGenerationTool()
        assert tool.api_key == "env-api-key"
        assert tool.base_url == "https://env.api.com/"
        assert tool.proxy_url == "http://env-proxy:8080"
        assert tool.default_size == "256x256"
        assert tool.default_quality == "standard"
        assert tool.default_n == 3

    def test_init_with_sandbox_config(self):
        """Test initialization with sandbox configuration."""
        config = {"template": "python", "debug": True}
        tool = ImageGenerationTool(
            api_key="test-key", enable_sandbox=True, async_sandbox_provider=config
        )
        assert tool.enable_sandbox is True
        assert tool.sandbox_source == config

    def test_priority_order(self, monkeypatch):
        """Test configuration priority: constructor > env vars > defaults."""
        # Set environment variables
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_API_KEY", "env-key")
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_BASE_URL", "https://env.com/")
        monkeypatch.setenv("LANGCREW_IMAGE_GEN_DEFAULT_SIZE", "768x768")
        # Constructor params should override env vars
        tool = ImageGenerationTool(
            api_key="constructor-key",
            base_url="https://constructor.com/",
            default_size="1536x1536",
        )

        assert tool.api_key == "constructor-key"
        assert tool.base_url == "https://constructor.com/"
        assert tool.default_size == "1536x1536"

    def test_tool_metadata(self):
        """Test tool metadata properties."""
        assert ImageGenerationTool.name == "image_generation"
        # Create an instance to test args_schema
        tool = ImageGenerationTool(api_key="test-key")
        assert tool.args_schema == ImageGenerationInput
        assert "generate images" in ImageGenerationTool.description.lower()
        assert "sandbox" in ImageGenerationTool.description.lower()

    @pytest.mark.asyncio
    async def test_input_validation_empty_prompt(self):
        """Test that empty prompt is rejected."""
        tool = ImageGenerationTool(api_key="test-key")
        result = await tool._arun(prompt="")
        assert "[ERROR] Empty prompt provided" in result

    @pytest.mark.asyncio
    async def test_input_validation_prompt_too_long(self):
        """Test that overly long prompt is rejected."""
        tool = ImageGenerationTool(api_key="test-key")
        long_prompt = "a" * 4001
        result = await tool._arun(prompt=long_prompt)
        assert "[ERROR] Prompt too long" in result

    @pytest.mark.asyncio
    async def test_input_validation_chinese_detection(self):
        """Test that Chinese characters in prompt are rejected."""
        tool = ImageGenerationTool(api_key="test-key")

        # The _detect_chinese method is now internal to the tool
        result = await tool._arun(prompt="生成一张猫的图片")
        assert "[ERROR] Chinese characters detected" in result


class TestImageGenerationLocalMode:
    """Test ImageGenerationTool in local mode (enable_sandbox=False)."""

    @pytest.mark.asyncio
    async def test_local_mode_without_path(self):
        """Test local mode without file path - should return base64."""
        tool = ImageGenerationTool(api_key="test-key", enable_sandbox=False)

        # Mock OpenAI response
        fake_image_data = b"fake-image-data-for-testing"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")
        mock_response = Mock()
        mock_response.data = [Mock(b64_json=b64_data)]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(return_value=mock_response)

        with patch("openai.AsyncOpenAI", return_value=mock_openai_client):
            result = await tool._arun(prompt="a beautiful sunset")
            result_data = json.loads(result)

            assert "image_b64" in result_data
            assert result_data["image_b64"] == b64_data
            assert "message" in result_data
            assert "base64 data" in result_data["message"]

    @pytest.mark.asyncio
    async def test_local_mode_with_path(self):
        """Test local mode with file path - should save locally."""
        tool = ImageGenerationTool(api_key="test-key", enable_sandbox=False)

        # Mock OpenAI response
        fake_image_data = b"fake-image-data-for-testing"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")
        mock_response = Mock()
        mock_response.data = [Mock(b64_json=b64_data)]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(return_value=mock_response)

        with (
            patch("openai.AsyncOpenAI", return_value=mock_openai_client),
            patch.object(
                tool, "_save_to_local", return_value="/tmp/test_image.png"
            ) as mock_save,
        ):
            result = await tool._arun(prompt="a sunset", path="test_image.png")
            result_data = json.loads(result)

            mock_save.assert_called_once_with(b64_data, "test_image.png")
            assert "local_path" in result_data
            assert result_data["local_path"] == "/tmp/test_image.png"
            assert "saved locally" in result_data["message"]

    def test_save_to_local_method(self, tmp_path):
        """Test the _save_to_local method."""
        tool = ImageGenerationTool(api_key="test-key")

        # Test data
        fake_image_data = b"fake-image-data-for-testing"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")

        # Test file path
        test_file = tmp_path / "test_image.png"

        result_path = tool._save_to_local(b64_data, str(test_file))

        assert result_path == str(test_file)
        assert test_file.exists()
        assert test_file.read_bytes() == fake_image_data

    def test_save_to_local_auto_extension(self, tmp_path):
        """Test that _save_to_local adds .png extension if missing."""
        tool = ImageGenerationTool(api_key="test-key")

        fake_image_data = b"test-data"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")

        test_file_without_ext = tmp_path / "test_image"

        result_path = tool._save_to_local(b64_data, str(test_file_without_ext))

        expected_path = str(test_file_without_ext) + ".png"
        assert result_path == expected_path
        assert os.path.exists(expected_path)


class TestImageGenerationSandboxIntegration:
    """Test ImageGenerationTool with sandbox integration."""

    @pytest.mark.asyncio
    async def test_sandbox_mode_create_new_sandbox(self):
        """Test sandbox mode creating new sandbox (sandbox_id=None)."""
        config = {"template": "python", "debug": True}
        tool = ImageGenerationTool(
            api_key="test-key",
            enable_sandbox=True,
            async_sandbox_provider=config,
        )

        # Mock OpenAI response
        fake_image_data = b"fake-image-data-for-testing"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")
        mock_response = Mock()
        mock_response.data = [Mock(b64_json=b64_data)]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(return_value=mock_response)

        # Mock sandbox operations
        mock_sandbox = AsyncMock()
        mock_sandbox.sandbox_id = "newly-created-sandbox-id"
        mock_sandbox.files.list = AsyncMock(return_value=[])
        mock_sandbox.files.write = AsyncMock()
        mock_sandbox.commands.run = AsyncMock()

        with (
            patch("openai.AsyncOpenAI", return_value=mock_openai_client),
            patch(
                "langcrew_tools.utils.sandbox.toolkit.SandboxToolkit.create_async_sandbox",
                AsyncMock(return_value=mock_sandbox),
            ) as mock_create,
            patch(
                "langcrew_tools.utils.sandbox.s3_integration.SandboxS3Toolkit.upload_base64_image",
                AsyncMock(return_value="https://s3.example.com/new-sandbox.png"),
            ),
        ):
            result = await tool._arun(prompt="a sunset", path="test.png")
            result_data = json.loads(result)

            # Should have called create_async_sandbox with config
            mock_create.assert_called_once_with(config)

            # Should return S3 URL and sandbox path
            assert result_data["image_url"] == "https://s3.example.com/new-sandbox.png"
            assert "sandbox_path" in result_data
            assert "successfully saved to the sandbox" in result_data["message"]

    @pytest.mark.asyncio
    async def test_sandbox_mode_connect_existing_sandbox(self):
        """Test sandbox mode connecting to existing sandbox."""
        config = {"sandbox_id": "existing-sandbox-123"}
        tool = ImageGenerationTool(
            api_key="test-key", enable_sandbox=True, async_sandbox_provider=config
        )

        # Mock OpenAI response
        fake_image_data = b"fake-image-data-for-testing"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")
        mock_response = Mock()
        mock_response.data = [Mock(b64_json=b64_data)]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(return_value=mock_response)

        # Mock sandbox operations
        mock_sandbox = AsyncMock()
        mock_sandbox.sandbox_id = "existing-sandbox-123"
        mock_sandbox.files.list = AsyncMock(return_value=[])
        mock_sandbox.files.write = AsyncMock()
        mock_sandbox.commands.run = AsyncMock()

        with (
            patch("openai.AsyncOpenAI", return_value=mock_openai_client),
            patch(
                "langcrew_tools.utils.sandbox.toolkit.SandboxToolkit.connect_or_resume_async_sandbox",
                AsyncMock(return_value=mock_sandbox),
            ) as mock_connect,
            patch(
                "langcrew_tools.utils.sandbox.toolkit.SandboxToolkit.create_async_sandbox"
            ) as mock_create,
            patch(
                "langcrew_tools.utils.sandbox.s3_integration.SandboxS3Toolkit.upload_base64_image",
                AsyncMock(return_value="https://s3.example.com/existing.png"),
            ),
        ):
            result = await tool._arun(prompt="a sunset", path="test.png")
            result_data = json.loads(result)

            # Should connect to existing sandbox, not create new
            expected_config = {"sandbox_id": "existing-sandbox-123"}
            mock_connect.assert_called_once_with(expected_config)
            mock_create.assert_not_called()

            assert result_data["image_url"] == "https://s3.example.com/existing.png"
            assert "sandbox_path" in result_data

    @pytest.mark.asyncio
    async def test_sandbox_mode_with_additional_config(self):
        """Test sandbox mode with additional config when connecting to existing sandbox."""
        config = {"sandbox_id": "existing-sandbox-456", "api_key": "test-api", "domain": "test.domain"}
        tool = ImageGenerationTool(
            api_key="test-key",
            enable_sandbox=True,
            async_sandbox_provider=config,
        )

        # Mock OpenAI response
        fake_image_data = b"fake-image-data"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")
        mock_response = Mock()
        mock_response.data = [Mock(b64_json=b64_data)]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(return_value=mock_response)

        mock_sandbox = AsyncMock()
        mock_sandbox.sandbox_id = "existing-sandbox-456"
        mock_sandbox.files.list = AsyncMock(return_value=[])
        mock_sandbox.files.write = AsyncMock()

        with (
            patch("openai.AsyncOpenAI", return_value=mock_openai_client),
            patch(
                "langcrew_tools.utils.sandbox.toolkit.SandboxToolkit.connect_or_resume_async_sandbox",
                AsyncMock(return_value=mock_sandbox),
            ) as mock_connect,
            patch(
                "langcrew_tools.utils.sandbox.s3_integration.SandboxS3Toolkit.upload_base64_image",
                AsyncMock(return_value="https://s3.example.com/config.png"),
            ),
        ):
            await tool._arun(prompt="a test")

            # Should use the provided config
            expected_config = {
                "sandbox_id": "existing-sandbox-456",
                "api_key": "test-api",
                "domain": "test.domain",
            }
            mock_connect.assert_called_once_with(expected_config)


class TestImageGenerationErrorHandling:
    """Test error handling scenarios."""

    @pytest.mark.asyncio
    async def test_sandbox_connection_failure(self):
        """Test handling of sandbox connection failure."""
        config = {"sandbox_id": "nonexistent-sandbox"}
        tool = ImageGenerationTool(
            api_key="test-key", enable_sandbox=True, async_sandbox_provider=config
        )

        # Mock OpenAI response
        fake_image_data = b"fake-image-data"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")
        mock_response = Mock()
        mock_response.data = [Mock(b64_json=b64_data)]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(return_value=mock_response)

        with (
            patch("openai.AsyncOpenAI", return_value=mock_openai_client),
            patch(
                "langcrew_tools.utils.sandbox.toolkit.SandboxToolkit.connect_or_resume_async_sandbox",
                AsyncMock(side_effect=Exception("Sandbox not found")),
            ),
        ):
            result = await tool._arun(prompt="a test")
            assert "[ERROR]" in result
            assert "Sandbox not found" in result

    @pytest.mark.asyncio
    async def test_sandbox_creation_failure(self):
        """Test handling of sandbox creation failure."""
        config = {"template": "python"}  # Will try to create new sandbox
        tool = ImageGenerationTool(
            api_key="test-key",
            enable_sandbox=True,
            async_sandbox_provider=config,
        )

        # Mock OpenAI response
        fake_image_data = b"fake-image-data"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")
        mock_response = Mock()
        mock_response.data = [Mock(b64_json=b64_data)]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(return_value=mock_response)

        with (
            patch("openai.AsyncOpenAI", return_value=mock_openai_client),
            patch(
                "langcrew_tools.utils.sandbox.toolkit.SandboxToolkit.create_async_sandbox",
                AsyncMock(side_effect=Exception("Failed to create sandbox")),
            ),
        ):
            result = await tool._arun(prompt="a test")
            assert "[ERROR]" in result
            assert "Failed to create sandbox" in result

    @pytest.mark.asyncio
    async def test_image_generation_all_models_fail(self):
        """Test when all image generation models fail."""
        tool = ImageGenerationTool(api_key="test-key")

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(
            side_effect=Exception("All models failed")
        )

        with patch("openai.AsyncOpenAI", return_value=mock_openai_client):
            result = await tool._arun(prompt="a test")
            assert "[ERROR]" in result
            # Should try both default models before failing
            assert mock_openai_client.images.generate.call_count == 2

    @pytest.mark.asyncio
    async def test_image_download_failure(self):
        """Test handling of image URL download failure."""
        tool = ImageGenerationTool(api_key="test-key")

        mock_response = Mock()
        mock_response.status_code = 404

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_class.return_value = mock_client

            with pytest.raises(Exception, match="Failed to download image"):
                await tool._download_image_to_base64("https://example.com/404.png")

    def test_sync_run_method(self):
        """Test the synchronous _run method wrapper."""
        tool = ImageGenerationTool(api_key="test-key")

        # Mock the async method
        async def mock_arun(prompt, file_path=None):
            return '{"message": "Generated successfully"}'

        with patch.object(tool, "_arun", mock_arun):
            result = tool._run(prompt="a sunset")
            result_data = json.loads(result)
            assert result_data["message"] == "Generated successfully"


class TestImageGenerationModelFallback:
    """Test model fallback functionality."""

    @pytest.mark.asyncio
    async def test_model_fallback_success(self):
        """Test that tool falls back to next model when first fails."""
        tool = ImageGenerationTool(api_key="test-key")

        # First model fails, second succeeds
        fake_image_data = b"fake-image-data"
        b64_data = base64.b64encode(fake_image_data).decode("utf-8")
        mock_response = Mock()
        mock_response.data = [Mock(b64_json=b64_data)]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(
            side_effect=[Exception("Model 1 failed"), mock_response]
        )

        with patch("openai.AsyncOpenAI", return_value=mock_openai_client):
            result = await tool._arun(prompt="a sunset")
            result_data = json.loads(result)

            # Should have tried both models
            assert mock_openai_client.images.generate.call_count == 2
            assert "image_b64" in result_data

    @pytest.mark.asyncio
    async def test_url_response_handling(self):
        """Test handling of URL response format from API."""
        tool = ImageGenerationTool(api_key="test-key", enable_sandbox=False)

        # Mock response with URL instead of base64
        mock_response = Mock()
        mock_response.data = [
            Mock(url="https://api.example.com/generated.png", b64_json=None)
        ]

        mock_openai_client = AsyncMock()
        mock_openai_client.images.generate = AsyncMock(return_value=mock_response)

        with (
            patch("openai.AsyncOpenAI", return_value=mock_openai_client),
            patch.object(
                tool,
                "_download_image_to_base64",
                AsyncMock(return_value="downloaded-base64"),
            ) as mock_download,
        ):
            result = await tool._arun(prompt="a sunset")
            result_data = json.loads(result)

            # Should have downloaded the image from URL
            mock_download.assert_called_once_with(
                "https://api.example.com/generated.png"
            )
            assert result_data["image_b64"] == "downloaded-base64"

    @pytest.mark.asyncio
    async def test_download_image_to_base64_success(self):
        """Test successful image download and base64 conversion."""
        tool = ImageGenerationTool(api_key="test-key")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b"fake-image-data"

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_class.return_value = mock_client

            result = await tool._download_image_to_base64(
                "https://example.com/image.png"
            )

            # Verify base64 encoding
            expected = base64.b64encode(b"fake-image-data").decode("utf-8")
            assert result == expected
