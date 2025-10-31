import base64
import json
import logging
import os
import random
from datetime import datetime
from typing import Any, ClassVar

import httpx
from langchain_core.tools import BaseTool
from langcrew.utils.language import detect_chinese
from pydantic import BaseModel, Field
from volcenginesdkarkruntime import Ark

from ..utils.s3 import S3ClientMixin
from ..utils.sandbox.base_sandbox import SandboxMixin
from ..utils.sandbox.s3_integration import SandboxS3Toolkit

logger = logging.getLogger(__name__)

ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
ARK_MODEL = "doubao-seedream-4-0-250828"


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


class ImageGenerationTool(BaseTool, SandboxMixin, S3ClientMixin):
    """Tool for generating images with timeout handling and retry mechanism."""

    name: ClassVar[str] = "image_generation"
    description: ClassVar[str] = (
        "Generate images from text descriptions using OpenAI's image generation models with improved timeout handling. "
        "The generated images are automatically saved to the E2B sandbox workspace. "
        "Returns a JSON object containing both the original image URL and the sandbox file path."
    )
    args_schema: type[BaseModel] = ImageGenerationInput
    model: str = Field(
        default=ARK_MODEL,
        description="The model to use for image generation. Default is doubao-seedream-4-0-250828.",
    )

    def __init__(self, model: str = ARK_MODEL, **kwargs):
        """Initialize the ImageGenerationTool.

        Args:
            model: The model to use for image generation
            **kwargs: Additional arguments for parent class
        """
        super().__init__(**kwargs)
        self.model = model

    def _run(
        self,
        prompt: str,
        path: str | None = None,
        **kwargs: Any,
    ) -> str:
        raise NotImplementedError("image_generation only supports async execution.")

    async def _arun(
        self,
        prompt: str,
        path: str | None = None,
        **kwargs: Any,
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
        if detect_chinese(prompt):
            prompt += ", 如果图像中存在文字，请使用简体中文，或者英文"
        else:
            prompt += ", if there are any text in the image, please use simplified Chinese or English"

        logger.info(f"Starting image generation with prompt: {prompt[:100]}...")

        ark_api_key = os.environ.get("ARK_API_KEY")
        if ark_api_key:
            result = await self._generate_with_ark_api(prompt, path)
            if result:
                logger.info("ARK API succeeded, returning result")
                return result
            else:
                logger.warning("ARK API failed")
                return "[ERROR] ARK API failed"

        return "image generation model failed"

    async def _generate_with_ark_api(
        self, prompt: str, file_path: str | None = None
    ) -> str:
        """Generate image using ARK API.

        Args:
            prompt: Text description of the desired image
            file_path: Optional file path

        Returns:
            JSON string with result or error message
        """
        client = Ark(
            base_url=ARK_BASE_URL,
            api_key=os.environ.get("ARK_API_KEY"),
        )

        response = client.images.generate(model=self.model, prompt=prompt)

        if not hasattr(response, "data") or not response.data:
            raise RuntimeError("Invalid ARK API response: missing data field")

        if not response.data[0] or not hasattr(response.data[0], "url"):
            raise RuntimeError("Invalid ARK API response: missing image URL")

        image_url = response.data[0].url
        if not image_url:
            raise RuntimeError("ARK API returned empty image URL")

        logger.info(f"ARK API returned image URL: {image_url}")

        image_b64 = await self._download_image_to_base64(image_url)

        sandbox_path, sandbox_id = await self._save_to_sandbox(image_b64, file_path)
        logger.info(f"Image saved to sandbox: {sandbox_path}, sandbox_id: {sandbox_id}")

        s3_image_url = await SandboxS3Toolkit.upload_base64_image(
            async_s3_client=await self.get_s3_client(),
            base64_data=image_b64,
            sandbox_id=sandbox_id,
        )
        logger.info(f"Image uploaded to S3: {s3_image_url}")

        result = {
            "image_url": s3_image_url,
            "sandbox_path": sandbox_path,
            "message": f"Image has been successfully generated with ARK API and saved to the sandbox at {sandbox_path}",
        }

        return json.dumps(result, ensure_ascii=False)

    async def _download_image_to_base64(self, image_url: str) -> str:
        """Download image from URL and convert to base64.

        Args:
            image_url: URL of the image to download

        Returns:
            Base64 encoded image data

        Raises:
            Exception: If download fails
        """
        async with httpx.AsyncClient() as client:
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

    async def _save_to_sandbox(
        self, image_b64: str, file_path: str | None = None
    ) -> tuple[str, str]:
        """Save base64 image to sandbox workspace.

        Args:
            image_b64: Base64 encoded image data
            file_path: Optional relative file path

        Returns:
            Tuple of (sandbox_path, sandbox_id)
        """

        # Decode base64 data
        logger.info("Decoding base64 image data")
        image_data = base64.b64decode(image_b64)

        # Get sandbox instance first to obtain sandbox_id
        async_sandbox = await self.get_sandbox()

        sandbox_id = async_sandbox.sandbox_id

        # Ensure workspace directory exists
        await async_sandbox.commands.run("sudo mkdir -p /workspace")
        logger.info("Ensured workspace directory exists: /workspace")

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

        return sandbox_path, sandbox_id
