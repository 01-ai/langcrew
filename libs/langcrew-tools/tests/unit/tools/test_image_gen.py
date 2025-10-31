import base64
import json
import os
from unittest.mock import AsyncMock, Mock, patch

import pytest

from langcrew_tools.image_gen.langchain_tools import (
    ImageGenerationInput,
    ImageGenerationTool,
)
from langcrew_tools.utils.s3.client import AsyncS3Client


def create_mock_sandbox():
    """Helper function to create a mock sandbox."""
    mock_sandbox = AsyncMock()
    mock_sandbox.sandbox_id = "test-sandbox-id"
    mock_sandbox.files.list = AsyncMock(return_value=[])
    mock_sandbox.files.write = AsyncMock()
    mock_sandbox.commands.run = AsyncMock()
    return mock_sandbox


def create_mock_s3_client():
    """Helper function to create a mock S3 client."""
    mock_s3 = AsyncMock(spec=AsyncS3Client)
    mock_s3.close = AsyncMock()
    return mock_s3


async def get_mock_sandbox_func():
    """Helper function to get a mock sandbox asynchronously."""
    return create_mock_sandbox()


async def get_mock_s3_client_func():
    """Helper function to get a mock S3 client asynchronously."""
    return create_mock_s3_client()


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

    def test_prompt_validation(self):
        """Test that prompt is required."""
        with pytest.raises(Exception):
            ImageGenerationInput()


class TestImageGenerationTool:
    """Test ImageGenerationTool basic functionality."""

    def test_init(self):
        """Test initialization."""
        tool = ImageGenerationTool()
        assert tool.name == "image_generation"
        assert tool.args_schema == ImageGenerationInput
        assert "generate images" in tool.description.lower()
        assert "sandbox" in tool.description.lower()

    def test_tool_metadata(self):
        """Test tool metadata properties."""
        assert ImageGenerationTool.name == "image_generation"
        assert "OpenAI" in ImageGenerationTool.description or "ARK" in ImageGenerationTool.description
        assert "sandbox" in ImageGenerationTool.description.lower()

    def test_sync_run_not_supported(self):
        """Test that synchronous _run is not supported."""
        tool = ImageGenerationTool()
        with pytest.raises(NotImplementedError, match="only supports async execution"):
            tool._run(prompt="a sunset")


class TestImageGenerationInputValidation:
    """Test input validation."""

    @pytest.mark.asyncio
    async def test_empty_prompt(self):
        """Test that empty prompt is rejected."""
        tool = ImageGenerationTool()
        result = await tool._arun(prompt="")
        assert "[ERROR]" in result
        assert "Empty prompt" in result

    @pytest.mark.asyncio
    async def test_whitespace_only_prompt(self):
        """Test that whitespace-only prompt is rejected."""
        tool = ImageGenerationTool()
        result = await tool._arun(prompt="   ")
        assert "[ERROR]" in result
        assert "Empty prompt" in result

    @pytest.mark.asyncio
    async def test_prompt_too_long(self):
        """Test that overly long prompt is rejected."""
        tool = ImageGenerationTool()
        long_prompt = "a" * 4001  # OpenAI limit is 4000
        result = await tool._arun(prompt=long_prompt)
        assert "[ERROR]" in result
        assert "too long" in result

    @pytest.mark.asyncio
    async def test_chinese_prompt_adds_suffix(self):
        """Test that Chinese prompt gets a Chinese text instruction added."""
        # Create a mock sandbox to provide to the tool
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox, s3_client_source=get_mock_s3_client_func)
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            with patch("langcrew.utils.language.detect_chinese", return_value=True):
                # Mock the entire Ark class and its images.generate method
                mock_images = Mock()
                mock_response = Mock()
                mock_response.data = [Mock(url="https://example.com/image.png")]
                mock_images.generate = Mock(return_value=mock_response)
                
                mock_ark_instance = Mock()
                mock_ark_instance.images = mock_images
                
                fake_b64 = base64.b64encode(b"fake-image-data").decode("utf-8")
                
                with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                    with patch.object(tool, "_download_image_to_base64", AsyncMock(return_value=fake_b64)):
                        with patch("langcrew_tools.image_gen.langchain_tools.SandboxS3Toolkit.upload_base64_image", AsyncMock(return_value="https://s3.example.com/image.png")):
                            await tool._arun(prompt="生成一张图片")
                            
                            # Check that the prompt was modified to include Chinese text instruction
                            call_args = mock_images.generate.call_args
                            assert "简体中文" in call_args[1]["prompt"]

    @pytest.mark.asyncio
    async def test_english_prompt_adds_english_suffix(self):
        """Test that English prompt gets an English text instruction added."""
        # Create a mock sandbox to provide to the tool
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox, s3_client_source=get_mock_s3_client_func)
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            with patch("langcrew.utils.language.detect_chinese", return_value=False):
                # Mock the entire Ark class and its images.generate method
                mock_images = Mock()
                mock_response = Mock()
                mock_response.data = [Mock(url="https://example.com/image.png")]
                mock_images.generate = Mock(return_value=mock_response)
                
                mock_ark_instance = Mock()
                mock_ark_instance.images = mock_images
                
                fake_b64 = base64.b64encode(b"fake-image-data").decode("utf-8")
                
                with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                    with patch.object(tool, "_download_image_to_base64", AsyncMock(return_value=fake_b64)):
                        with patch("langcrew_tools.image_gen.langchain_tools.SandboxS3Toolkit.upload_base64_image", AsyncMock(return_value="https://s3.example.com/image.png")):
                            await tool._arun(prompt="generate an image")
                            
                            # Check that the prompt was modified to include English text instruction
                            call_args = mock_images.generate.call_args
                            assert "simplified Chinese or English" in call_args[1]["prompt"]


class TestImageGenerationWithArkAPI:
    """Test image generation with ARK API."""

    @pytest.mark.asyncio
    async def test_ark_api_success(self):
        """Test successful image generation with ARK API."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox, s3_client_source=get_mock_s3_client_func)
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-ark-key"}):
            # Mock ARK client response
            mock_images = Mock()
            mock_response = Mock()
            mock_response.data = [Mock(url="https://ark.example.com/generated.png")]
            mock_images.generate = Mock(return_value=mock_response)
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            # Mock download
            fake_image_data = b"fake-image-bytes"
            fake_b64 = base64.b64encode(fake_image_data).decode("utf-8")
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                with patch.object(tool, "_download_image_to_base64", AsyncMock(return_value=fake_b64)):
                    with patch("langcrew_tools.image_gen.langchain_tools.SandboxS3Toolkit.upload_base64_image", AsyncMock(return_value="https://s3.example.com/uploaded.png")):
                        result = await tool._arun(prompt="a beautiful sunset")
                        
                        result_data = json.loads(result)
                        assert result_data["image_url"] == "https://s3.example.com/uploaded.png"
                        assert result_data["sandbox_path"].startswith("/workspace/")
                        assert "successfully generated" in result_data["message"]

    @pytest.mark.asyncio
    async def test_ark_api_with_custom_path(self):
        """Test ARK API with custom file path."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox, s3_client_source=get_mock_s3_client_func)
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            mock_images = Mock()
            mock_response = Mock()
            mock_response.data = [Mock(url="https://example.com/image.png")]
            mock_images.generate = Mock(return_value=mock_response)
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            fake_b64 = base64.b64encode(b"fake-image-data").decode("utf-8")
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                with patch.object(tool, "_download_image_to_base64", AsyncMock(return_value=fake_b64)):
                    with patch("langcrew_tools.image_gen.langchain_tools.SandboxS3Toolkit.upload_base64_image", AsyncMock(return_value="https://s3.example.com/image.png")):
                        result = await tool._arun(prompt="a cat", path="custom/path.png")
                        
                        result_data = json.loads(result)
                        assert result_data["sandbox_path"] == "/workspace/custom/path.png"

    @pytest.mark.asyncio
    async def test_ark_api_missing_data_field(self):
        """Test handling of ARK API response missing data field."""
        tool = ImageGenerationTool()

        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            mock_images = Mock()
            mock_response = Mock(spec=[])  # No data attribute
            mock_images.generate = Mock(return_value=mock_response)
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                # Source code raises RuntimeError, not returns error message
                with pytest.raises(RuntimeError, match="Invalid ARK API response: missing data field"):
                    await tool._arun(prompt="a sunset")

    @pytest.mark.asyncio
    async def test_ark_api_missing_url(self):
        """Test handling of ARK API response missing URL."""
        tool = ImageGenerationTool()
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            mock_images = Mock()
            mock_response = Mock()
            mock_response.data = [Mock(spec=[])]  # No url attribute
            mock_images.generate = Mock(return_value=mock_response)
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                # Source code raises RuntimeError, not returns error message
                with pytest.raises(RuntimeError, match="Invalid ARK API response: missing image URL"):
                    await tool._arun(prompt="a sunset")

    @pytest.mark.asyncio
    async def test_ark_api_empty_url(self):
        """Test handling of ARK API returning empty URL."""
        tool = ImageGenerationTool()

        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            mock_images = Mock()
            mock_response = Mock()
            mock_response.data = [Mock(url="")]
            mock_images.generate = Mock(return_value=mock_response)
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                # Source code raises RuntimeError, not returns error message
                with pytest.raises(RuntimeError, match="ARK API returned empty image URL"):
                    await tool._arun(prompt="a sunset")

    @pytest.mark.asyncio
    async def test_no_ark_api_key(self):
        """Test when ARK API key is not provided."""
        tool = ImageGenerationTool()

        with patch.dict(os.environ, {}, clear=True):
            if "ARK_API_KEY" in os.environ:
                del os.environ["ARK_API_KEY"]
            
            result = await tool._arun(prompt="a sunset")
            assert "failed" in result.lower()


class TestImageDownload:
    """Test image downloading functionality."""

    @pytest.mark.asyncio
    async def test_download_image_success(self):
        """Test successful image download."""
        tool = ImageGenerationTool()

        fake_image_data = b"fake-image-bytes"
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = fake_image_data

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_class.return_value = mock_client

            result = await tool._download_image_to_base64("https://example.com/image.png")

            expected_b64 = base64.b64encode(fake_image_data).decode("utf-8")
            assert result == expected_b64

    @pytest.mark.asyncio
    async def test_download_image_404(self):
        """Test handling of 404 when downloading image."""
        tool = ImageGenerationTool()

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

    @pytest.mark.asyncio
    async def test_download_image_network_error(self):
        """Test handling of network error when downloading."""
        tool = ImageGenerationTool()
        
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.get = AsyncMock(side_effect=Exception("Network error"))
            mock_client_class.return_value = mock_client
            
            with pytest.raises(Exception, match="Network error"):
                await tool._download_image_to_base64("https://example.com/image.png")


class TestSandboxSave:
    """Test saving images to sandbox."""

    @pytest.mark.asyncio
    async def test_save_to_sandbox_default_path(self):
        """Test saving to sandbox with default path."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)
        
        fake_image_data = b"fake-image-bytes"
        fake_b64 = base64.b64encode(fake_image_data).decode("utf-8")
        
        sandbox_path, sandbox_id = await tool._save_to_sandbox(fake_b64)
        
        assert sandbox_path.startswith("/workspace/image_generation_")
        assert sandbox_path.endswith(".png")
        assert sandbox_id == "test-sandbox-id"
        mock_sandbox.files.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_save_to_sandbox_custom_path(self):
        """Test saving to sandbox with custom path."""
        mock_sandbox = create_mock_sandbox()

        async def get_mock_sandbox():
            return mock_sandbox

        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)

        fake_b64 = base64.b64encode(b"fake-image").decode("utf-8")

        sandbox_path, sandbox_id = await tool._save_to_sandbox(fake_b64, "custom/path.png")

        assert sandbox_path == "/workspace/custom/path.png"
        assert sandbox_id == "test-sandbox-id"
        # Should create workspace directory and custom directory
        expected_calls = [
            ("sudo mkdir -p /workspace",),
            ("mkdir -p /workspace/custom",)
        ]
        actual_calls = [call[0] for call in mock_sandbox.commands.run.call_args_list]
        assert actual_calls == expected_calls

    @pytest.mark.asyncio
    async def test_save_to_sandbox_adds_png_extension(self):
        """Test that .png extension is added if missing."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)
        
        fake_b64 = base64.b64encode(b"fake-image").decode("utf-8")
        
        sandbox_path, _ = await tool._save_to_sandbox(fake_b64, "image_without_ext")
        
        assert sandbox_path == "/workspace/image_without_ext.png"

    @pytest.mark.asyncio
    async def test_save_to_sandbox_handles_existing_file(self):
        """Test handling when file already exists."""
        mock_sandbox = create_mock_sandbox()
        mock_sandbox.files.list = AsyncMock(return_value=["existing.png"])
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)
        
        fake_b64 = base64.b64encode(b"fake-image").decode("utf-8")
        
        sandbox_path, _ = await tool._save_to_sandbox(fake_b64, "existing.png")
        
        # Should generate unique filename
        assert "/workspace/existing_" in sandbox_path
        assert sandbox_path.endswith(".png")

    @pytest.mark.asyncio
    async def test_save_to_sandbox_strips_leading_slash(self):
        """Test that leading slash is stripped from path."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)
        
        fake_b64 = base64.b64encode(b"fake-image").decode("utf-8")
        
        sandbox_path, _ = await tool._save_to_sandbox(fake_b64, "/images/test.png")
        
        assert sandbox_path == "/workspace/images/test.png"
        
class TestS3Integration:
    """Test S3 upload integration."""

    @pytest.mark.asyncio
    async def test_s3_upload_called(self):
        """Test that S3 upload is called with correct parameters."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox, s3_client_source=get_mock_s3_client_func)
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            mock_images = Mock()
            mock_response = Mock()
            mock_response.data = [Mock(url="https://example.com/image.png")]
            mock_images.generate = Mock(return_value=mock_response)
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            fake_b64 = base64.b64encode(b"fake-image").decode("utf-8")
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                with patch.object(tool, "_download_image_to_base64", AsyncMock(return_value=fake_b64)):
                    with patch("langcrew_tools.image_gen.langchain_tools.SandboxS3Toolkit.upload_base64_image", AsyncMock(return_value="https://s3.example.com/uploaded.png")) as mock_upload:
                        result = await tool._arun(prompt="a sunset")
                        
                        # Verify S3 upload was called
                        mock_upload.assert_called_once()
                        call_kwargs = mock_upload.call_args[1]
                        assert call_kwargs["base64_data"] == fake_b64
                        assert call_kwargs["sandbox_id"] == "test-sandbox-id"
                        
                        # Verify result contains S3 URL
                        result_data = json.loads(result)
                        assert result_data["image_url"] == "https://s3.example.com/uploaded.png"


class TestErrorHandling:
    """Test error handling scenarios."""

    @pytest.mark.asyncio
    async def test_ark_api_exception(self):
        """Test handling of ARK API exception."""
        tool = ImageGenerationTool()
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            mock_images = Mock()
            mock_images.generate = Mock(side_effect=Exception("ARK API error"))
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                # Source code propagates the exception
                with pytest.raises(Exception, match="ARK API error"):
                    await tool._arun(prompt="a sunset")

    @pytest.mark.asyncio
    async def test_sandbox_write_failure(self):
        """Test handling of sandbox write failure."""
        mock_sandbox = create_mock_sandbox()
        mock_sandbox.files.write = AsyncMock(side_effect=Exception("Sandbox write failed"))
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            mock_images = Mock()
            mock_response = Mock()
            mock_response.data = [Mock(url="https://example.com/image.png")]
            mock_images.generate = Mock(return_value=mock_response)
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            fake_b64 = base64.b64encode(b"fake-image-data").decode("utf-8")
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                with patch.object(tool, "_download_image_to_base64", AsyncMock(return_value=fake_b64)):
                    # Source code propagates the exception
                    with pytest.raises(Exception, match="Sandbox write failed"):
                        await tool._arun(prompt="a sunset")

    @pytest.mark.asyncio
    async def test_s3_upload_failure(self):
        """Test handling of S3 upload failure."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox, s3_client_source=get_mock_s3_client_func)
        
        with patch.dict(os.environ, {"ARK_API_KEY": "test-key"}):
            mock_images = Mock()
            mock_response = Mock()
            mock_response.data = [Mock(url="https://example.com/image.png")]
            mock_images.generate = Mock(return_value=mock_response)
            
            mock_ark_instance = Mock()
            mock_ark_instance.images = mock_images
            
            fake_b64 = base64.b64encode(b"fake-image-data").decode("utf-8")
            
            with patch("langcrew_tools.image_gen.langchain_tools.Ark", return_value=mock_ark_instance):
                with patch.object(tool, "_download_image_to_base64", AsyncMock(return_value=fake_b64)):
                    with patch("langcrew_tools.image_gen.langchain_tools.SandboxS3Toolkit.upload_base64_image", AsyncMock(side_effect=Exception("S3 upload failed"))):
                        # Source code propagates the exception
                        with pytest.raises(Exception, match="S3 upload failed"):
                            await tool._arun(prompt="a sunset")


class TestEdgeCases:
    """Test edge cases and special scenarios."""

    @pytest.mark.asyncio
    async def test_various_image_extensions(self):
        """Test that various image extensions are preserved."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)
        
        fake_b64 = base64.b64encode(b"fake-image").decode("utf-8")
        
        extensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"]
        
        for ext in extensions:
            path = f"image{ext}"
            sandbox_path, _ = await tool._save_to_sandbox(fake_b64, path)
            assert sandbox_path == f"/workspace/{path}"

    @pytest.mark.asyncio
    async def test_deeply_nested_path(self):
        """Test saving to deeply nested path."""
        mock_sandbox = create_mock_sandbox()

        async def get_mock_sandbox():
            return mock_sandbox

        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)

        fake_b64 = base64.b64encode(b"fake-image").decode("utf-8")

        deep_path = "a/b/c/d/e/image.png"
        sandbox_path, _ = await tool._save_to_sandbox(fake_b64, deep_path)

        assert sandbox_path == f"/workspace/{deep_path}"
        # Should create workspace directory and all nested directories
        expected_calls = [
            ("sudo mkdir -p /workspace",),
            ("mkdir -p /workspace/a/b/c/d/e",)
        ]
        actual_calls = [call[0] for call in mock_sandbox.commands.run.call_args_list]
        assert actual_calls == expected_calls

    @pytest.mark.asyncio
    async def test_timestamp_in_default_filename(self):
        """Test that default filename includes timestamp."""
        mock_sandbox = create_mock_sandbox()
        
        async def get_mock_sandbox():
            return mock_sandbox
        
        tool = ImageGenerationTool(sandbox_source=get_mock_sandbox)
        
        fake_b64 = base64.b64encode(b"fake-image").decode("utf-8")
        
        sandbox_path, _ = await tool._save_to_sandbox(fake_b64)
        
        # Extract timestamp from filename
        filename = sandbox_path.split("/")[-1]
        assert "image_generation_" in filename
        assert filename.endswith(".png")
        
        # Should contain timestamp in format YYYYMMDD_HHMMSS
        timestamp_str = filename.split("_")[2] + "_" + filename.split("_")[3]
        # Basic validation that it looks like a timestamp
        assert len(timestamp_str.split("_")[0]) == 8  # YYYYMMDD
