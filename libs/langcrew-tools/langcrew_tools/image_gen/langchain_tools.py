import asyncio
import base64
import json
import logging
import os
import random
from datetime import datetime
from typing import ClassVar

import httpx
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from ..utils.s3.client import AsyncS3Client
from ..utils.sandbox.base_sandbox import SandboxMixin
from ..utils.sandbox.s3_integration import SandboxS3Toolkit

logger = logging.getLogger(__name__)


class ImageGenerationInput(BaseModel):
    """Input for ImageGenerationTool."""

    prompt: str = Field(
        ...,
        description="A text description of the desired image(s) in English. 中文描述会影响生成效果，请使用英文。Examples: 'beautiful modern Chinese woman, realistic photograph, professional photography', 'sunset over mountains', 'cute kitten playing'",
    )
    path: str | None = Field(
        default=None,
        description="Optional relative file path for the generated image (e.g., 'output/my_image.png', 'images/sunset.png'). "
        "Path is relative to /workspace. If not provided, defaults to 'image_generation_{timestamp}_{random}.png'.",
    )


class ImageGenerationTool(BaseTool, SandboxMixin):
    """Tool for generating images with timeout handling and retry mechanism."""

    name: ClassVar[str] = "image_generation"
    description: ClassVar[str] = (
        "Generate images from text descriptions using OpenAI's image generation models with improved timeout handling. "
        "The generated images can be saved locally or uploaded to sandbox workspace based on configuration. "
        "Supports both creating new sandbox and connecting to existing sandbox by providing sandbox_id."
    )
    args_schema: type[BaseModel] = ImageGenerationInput

    # Configuration parameters
    api_key: str = Field(default=None, description="OpenAI API key")
    base_url: str = Field(default=None, description="OpenAI API base URL")
    proxy_url: str = Field(default=None, description="HTTP proxy URL")
    default_size: str = Field(default="1024x1024", description="Default image size")
    default_quality: str = Field(default="medium", description="Default image quality")
    default_n: int = Field(
        default=1, description="Default number of images to generate"
    )
    enable_sandbox: bool = Field(
        default=False, description="Whether to enable sandbox integration"
    )
    async_s3_client: AsyncS3Client = Field(default=None, description="Async S3 client")

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        proxy_url: str | None = None,
        default_size: str | None = None,
        default_quality: str | None = None,
        default_n: int | None = None,
        enable_sandbox: bool = False,
        async_s3_client: AsyncS3Client | None = None,
        **kwargs,
    ):
        """Initialize ImageGenerationTool with optional configuration.

        Configuration priority (highest to lowest):
        1. Constructor parameters
        2. Environment variables (LANGCREW_IMAGE_GEN_*)
        3. Field default values

        Args:
            api_key: aimlapi API key
            base_url: aimlapi API base URL
            proxy_url: HTTP proxy URL
            default_size: Default image size
            default_quality: Default image quality
            default_n: Default number of images to generate
            enable_sandbox: Whether to enable sandbox integration
            async_s3_client: Async S3 client
            sandbox_id: Existing sandbox ID to connect to (if None, creates new sandbox)
            sandbox_config: Optional sandbox configuration
        """
        super().__init__(**kwargs)

        # Load configuration with priority
        self.api_key = api_key or os.getenv("LANGCREW_IMAGE_GEN_API_KEY")
        self.base_url = (
            base_url
            or os.getenv("LANGCREW_IMAGE_GEN_BASE_URL")
            or "https://api.aimlapi.com/v1/"
        )
        self.proxy_url = (
            proxy_url
            or os.getenv("LANGCREW_IMAGE_GEN_PROXY_URL")
            or os.getenv("HTTP_PROXY")
        )
        self.default_size = (
            default_size
            or os.getenv("LANGCREW_IMAGE_GEN_DEFAULT_SIZE")
            or self.default_size
        )
        self.default_quality = (
            default_quality
            or os.getenv("LANGCREW_IMAGE_GEN_DEFAULT_QUALITY")
            or self.default_quality
        )
        self.default_n = (
            default_n
            or int(os.getenv("LANGCREW_IMAGE_GEN_DEFAULT_N", "0"))
            or self.default_n
        )
        self.enable_sandbox = enable_sandbox

    def _run(
        self,
        prompt: str,
        path: str | None = None,
    ) -> str:
        """Synchronous wrapper for async _arun method.

        Args:
            prompt: Text description of the desired image(s)
            path: Optional relative file path for the generated image

        Returns:
            JSON string containing image URLs and any warnings
        """
        return asyncio.run(self._arun(prompt, path))

    async def _arun(
        self,
        prompt: str,
        path: str | None = None,
    ) -> str:
        """Use the tool asynchronously.

        Args:
            prompt: Text description of the desired image(s)
            path: Optional relative file path for the generated image

        Returns:
            JSON string containing image URLs and any warnings
        """
        # Input validation
        if not prompt or not prompt.strip():
            return "[ERROR] Empty prompt provided"
        if len(prompt) > 4000:  # OpenAI limit
            return "[ERROR] Prompt too long (max 4000 chars)"

        # Check for Chinese characters and return error
        if self._detect_chinese(prompt):
            error_msg = "[ERROR] Chinese characters detected. Please use English descriptions only."
            logger.error(error_msg)
            return error_msg

        logger.info(f"Starting image generation with prompt: {prompt[:100]}...")

        models_to_try = [
            {"name": "flux/schnell", "timeout": 60},
            {"name": "flux-pro/v1.1", "timeout": 90},
            # {"name": "dall-e-3", "timeout": 120},
            # {"name": "openai/gpt-image-1", "timeout": 120},
        ]

        last_error = None

        for model_config in models_to_try:
            logger.info(f"Trying model: {model_config['name']}")
            try:
                result = await self._generate_with_model(prompt, path, model_config)
                if result and not result.startswith("[ERROR]"):
                    return result
                last_error = result
            except Exception as e:
                logger.warning(f"Model {model_config['name']} failed: {e}")
                last_error = f"[ERROR] {type(e).__name__}: {str(e)}"

        # If all models failed, return the last error
        return last_error or "[ERROR] All image generation models failed"

    @staticmethod
    def _detect_chinese(text: str) -> bool:
        """Detect if the input text is Chinese.

        Args:
            text: Input text to detect

        Returns:
            True if text is primarily Chinese, False otherwise
        """
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

    async def _generate_with_model(
        self, prompt: str, file_path: str | None, model_config: dict
    ) -> str:
        """Generate image with a specific model (single attempt, no retry).

        Args:
            prompt: Text description of the desired image
            file_path: Optional file path
            model_config: Model configuration dict

        Returns:
            JSON string with result or error message
        """
        model_name = model_config["name"]
        timeout = model_config["timeout"]

        try:
            # Import and initialize OpenAI client with timeout
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=timeout,
                http_client=httpx.AsyncClient(proxy=self.proxy_url),
            )

            logger.info(
                f"Generating image with model {model_name}, prompt: {prompt[:100]}..."
            )

            if model_name.startswith("flux"):
                response = await client.images.generate(
                    model=model_name,
                    prompt=prompt,
                    n=self.default_n,
                    output_format="png",
                    background="auto",
                    moderation="auto",
                    output_compression=100,
                    timeout=timeout,
                )
            else:
                response = await client.images.generate(
                    model=model_name,
                    prompt=prompt,
                    size=self.default_size,
                    quality=self.default_quality,
                    n=self.default_n,
                    output_format="png",
                    background="auto",
                    moderation="auto",
                    output_compression=100,
                    response_format="b64_json",
                    timeout=timeout,
                )

            # Handle different response formats
            image_b64 = None
            image_url = None

            # Check if response has data field (traditional OpenAI format)
            if hasattr(response, "data") and response.data:
                if hasattr(response.data[0], "b64_json") and response.data[0].b64_json:
                    image_b64 = response.data[0].b64_json
                elif hasattr(response.data[0], "url") and response.data[0].url:
                    image_url = response.data[0].url
            # Check if response has images field (new AIML API format)
            elif hasattr(response, "images") and response.images:
                if isinstance(response.images, list) and len(response.images) > 0:
                    first_image = response.images[0]
                    if isinstance(first_image, dict) and "url" in first_image:
                        image_url = first_image["url"]
                    elif hasattr(first_image, "url"):
                        image_url = first_image.url

            if not image_b64 and not image_url:
                raise RuntimeError(
                    f"No image was generated by {model_name} - neither base64 nor URL found"
                )

            # If we have URL, download the image
            if image_url and not image_b64:
                logger.info(f"Downloading image from URL: {image_url}")
                image_b64 = await self._download_image_to_base64(image_url)

            if self.enable_sandbox:
                # Save to sandbox and upload to S3
                sandbox_path, sandbox_id = await self._save_to_sandbox(
                    image_b64, file_path
                )
                logger.info(
                    f"Image saved to sandbox: {sandbox_path}, sandbox_id: {sandbox_id}"
                )

                if self.async_s3_client:
                    # Upload to S3 with the sandbox_id
                    s3_image_url = await SandboxS3Toolkit.upload_base64_image(
                        async_s3_client=self.async_s3_client,
                        base64_data=image_b64,
                        sandbox_id=sandbox_id,
                    )
                else:
                    s3_image_url = image_url
                logger.info(f"Image uploaded to S3: {s3_image_url}")

                result = {
                    "image_url": s3_image_url,
                    "sandbox_path": sandbox_path,
                    "message": f"Image has been successfully saved to the sandbox at {sandbox_path}",
                }
            else:
                # Just save locally if path is provided
                if file_path:
                    local_path = self._save_to_local(image_b64, file_path)
                    logger.info(f"Image saved locally: {local_path}")
                    result = {
                        "local_path": local_path,
                        "message": f"Image has been successfully saved locally at {local_path}",
                    }
                else:
                    # Return base64 data directly
                    result = {
                        "image_b64": image_b64,
                        "message": "Image generated successfully, returned as base64 data",
                    }
                if image_url:
                    result["image_url"] = image_url

            return json.dumps(result, ensure_ascii=False)

        except ImportError:
            raise ImportError(
                "openai package is not installed. Please install it with 'pip install openai'"
            )
        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            return f"[ERROR] {type(e).__name__}: {str(e)}"

    async def _download_image_to_base64(self, image_url: str) -> str:
        """Download image from URL and convert to base64.

        Args:
            image_url: URL of the image to download

        Returns:
            Base64 encoded image data
        """
        # Configure client with proxy if available
        async with httpx.AsyncClient(proxy=self.proxy_url) as client:
            response = await client.get(image_url)
            if response.status_code == 200:
                image_data = response.content
                image_b64 = base64.b64encode(image_data).decode("utf-8")
                logger.info(
                    f"Successfully downloaded image from URL, size: {len(image_data)} bytes"
                )
                return image_b64
            else:
                raise Exception(
                    f"Failed to download image: HTTP {response.status_code}"
                )

    def _save_to_local(self, image_b64: str, file_path: str) -> str:
        """Save base64 image to local filesystem.

        Args:
            image_b64: Base64 encoded image data
            file_path: File path to save the image

        Returns:
            Local file path where image was saved
        """
        # Decode base64 data
        image_data = base64.b64decode(image_b64)

        # Ensure the file has an image extension
        if not file_path.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
            file_path = f"{file_path}.png"

        # Create directory if needed
        dir_path = os.path.dirname(file_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)

        # Save image to local file
        with open(file_path, "wb") as f:
            f.write(image_data)

        logger.info(f"Image saved to local file: {file_path}")
        return file_path

    async def _save_to_sandbox(
        self, image_b64: str, file_path: str | None = None
    ) -> tuple[str, str]:
        """Save base64 image to sandbox workspace.

        Supports both connecting to existing sandbox (if sandbox_id provided)
        and creating new sandbox (if sandbox_id is None).

        Args:
            image_b64: Base64 encoded image data
            file_path: Optional relative file path

        Returns:
            Tuple of (sandbox_path, sandbox_id)
        """
        # Decode base64 data
        logger.info("Decoding base64 image data")
        image_data = base64.b64decode(image_b64)

        async_sandbox = await self.get_sandbox()

        # Process file path
        if file_path:
            # Remove leading slash if present
            relative_path = file_path.lstrip("/")

            # Ensure the file has an image extension
            if not relative_path.lower().endswith((
                ".png",
                ".jpg",
                ".jpeg",
                ".gif",
                ".webp",
            )):
                relative_path = f"{relative_path}.png"

            # Extract directory path if exists
            dir_path = os.path.dirname(relative_path)
            filename = os.path.basename(relative_path)

            # Create directory if needed
            if dir_path:
                full_dir_path = f"/workspace/{dir_path}"
                await async_sandbox.commands.run(f"mkdir -p {full_dir_path}")
                logger.info(f"Created directory: {full_dir_path}")

            # Build full path
            sandbox_path = f"/workspace/{relative_path}"
            check_dir = f"/workspace/{dir_path}" if dir_path else "/workspace"

        else:
            # Generate default filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"image_generation_{timestamp}_{random.randint(1000, 9999)}.png"
            relative_path = filename
            sandbox_path = f"/workspace/{filename}"
            check_dir = "/workspace"

        # Check if file already exists
        existing_files = await async_sandbox.files.list(check_dir)
        if filename in existing_files:
            # Generate unique filename
            name_parts = filename.rsplit(".", 1)
            if len(name_parts) > 1:
                base_name, extension = name_parts
                unique_suffix = datetime.now().strftime("%H%M%S")
                new_filename = f"{base_name}_{unique_suffix}.{extension}"
            else:
                unique_suffix = datetime.now().strftime("%H%M%S")
                new_filename = f"{filename}_{unique_suffix}"

            # Update paths
            if file_path and dir_path:
                sandbox_path = f"/workspace/{dir_path}/{new_filename}"
            else:
                sandbox_path = f"/workspace/{new_filename}"

            logger.info(f"Using unique filename to avoid overwrite: {new_filename}")

        # Save image to sandbox
        await async_sandbox.files.write(sandbox_path, image_data)
        logger.info(f"Image saved to sandbox: {sandbox_path}")

        return sandbox_path, async_sandbox.sandbox_id
