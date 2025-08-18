# Image Parser LangChain Tools
# Provides image parsing functionality using vision models

import asyncio
import base64
import logging
import time
from pathlib import Path
from typing import ClassVar
from urllib.parse import urlparse

import httpx
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from .config import ImageParserConfig, default_config

logger = logging.getLogger(__name__)


class ImageParserInput(BaseToolInput):
    """Input for ImageParserTool."""

    image_url: str = Field(..., description="URL of the image to analyze")
    question: str = Field(
        ..., description="Question or prompt about the image to ask the vision model"
    )


class ImageParserTool(BaseTool):
    """Tool for analyzing images using vision models."""

    name: ClassVar[str] = "image_parser"
    args_schema: type[BaseModel] = ImageParserInput
    description: ClassVar[str] = (
        "Analyze images using vision models to answer questions about image content. "
        "Supports various image formats (JPG, PNG, GIF, WEBP, etc.) from URLs. "
        "The tool downloads the image, validates it, and sends it to a vision model "
        "along with your question to get detailed analysis and answers."
    )

    # Configuration
    config: ImageParserConfig = Field(default_factory=lambda: default_config)
    # LLM client - excluded from serialization
    llm: BaseChatModel | None = Field(default=None, exclude=True)

    def __init__(
        self,
        config: ImageParserConfig | None = None,
        llm: BaseChatModel | None = None,
        **kwargs,
    ):
        """Initialize ImageParserTool with configuration.

        Args:
            config: Image parser configuration
            llm: Vision model client (optional, will create default if not provided)
            **kwargs: Additional arguments for BaseTool
        """
        super().__init__(**kwargs)

        if config:
            self.config = config
        self.config.validate()

        # Initialize LLM client
        if llm:
            self.llm = llm
        else:
            self.llm = self._create_default_llm()

    def _create_default_llm(self) -> BaseChatModel:
        """Create default vision LLM client."""
        try:
            from langchain_openai import ChatOpenAI

            llm_kwargs = {
                "model": self.config.vision_model,
                "temperature": self.config.temperature,
                "max_tokens": self.config.max_tokens,
                "request_timeout": self.config.request_timeout,
            }

            # Add optional configuration
            if self.config.vision_api_key:
                llm_kwargs["api_key"] = self.config.vision_api_key
            if self.config.vision_base_url:
                llm_kwargs["base_url"] = self.config.vision_base_url

            return ChatOpenAI(**llm_kwargs)

        except ImportError:
            logger.error("langchain_openai not available")
            raise ImportError("langchain_openai is required for ImageParserTool")
        except Exception as e:
            logger.error(f"Failed to create LLM client: {e}")
            raise

    def _run(
        self,
        image_url: str,
        question: str,
        **kwargs,
    ) -> str:
        """Perform image analysis synchronously."""
        raise NotImplementedError("image_parser only supports async execution.")

    async def _arun(
        self,
        image_url: str,
        question: str,
        **kwargs,
    ) -> str:
        """Perform image analysis asynchronously."""
        logger.info(f"Starting image analysis for URL: {image_url}")
        logger.info(f"Question: {question[:100]}...")

        if not image_url or not image_url.strip():
            return "Error: No image URL provided"

        if not question or not question.strip():
            return "Error: No question provided"

        try:
            # Validate and download image
            image_data, mime_type = await self._download_and_validate_image(image_url)

            # Create vision model message
            message = self._create_vision_message(image_data, mime_type, question)

            # Send to vision model
            response = await self._query_vision_model(message)

            return response

        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            return f"Analysis failed: {str(e)}"

    async def _download_and_validate_image(self, image_url: str) -> tuple[bytes, str]:
        """Download and validate image from URL."""
        logger.info(f"Downloading image from: {image_url}")

        # Validate URL format
        try:
            parsed_url = urlparse(image_url)
            if not parsed_url.scheme or not parsed_url.netloc:
                raise ValueError("Invalid URL format")
        except Exception as e:
            raise ValueError(f"Invalid URL format: {e}")

        # Download image
        try:
            async with httpx.AsyncClient(timeout=self.config.request_timeout) as client:
                response = await client.get(image_url)
                response.raise_for_status()

                image_data = response.content
                content_type = response.headers.get("content-type", "")

        except httpx.RequestError as e:
            raise ValueError(f"Failed to download image: {e}")
        except httpx.HTTPStatusError as e:
            raise ValueError(f"HTTP error downloading image: {e.response.status_code}")

        # Validate image size
        if len(image_data) > self.config.max_image_size:
            size_mb = len(image_data) / (1024 * 1024)
            max_mb = self.config.max_image_size / (1024 * 1024)
            raise ValueError(f"Image too large: {size_mb:.1f}MB (max: {max_mb}MB)")

        # Validate content type
        mime_type = self._validate_content_type(content_type, image_url)

        logger.info(
            f"Successfully downloaded image: {len(image_data)} bytes, type: {mime_type}"
        )
        return image_data, mime_type

    def _validate_content_type(self, content_type: str, image_url: str) -> str:
        """Validate and determine image MIME type."""
        # Check if content-type is provided and valid
        if content_type and content_type.startswith("image/"):
            mime_type = content_type
        else:
            # Try to guess from URL extension
            parsed_url = urlparse(image_url)
            path = parsed_url.path.lower()

            # Map common extensions to MIME types
            extension_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".bmp": "image/bmp",
                ".tiff": "image/tiff",
                ".svg": "image/svg+xml",
            }

            file_ext = Path(path).suffix
            mime_type = extension_map.get(file_ext, "image/jpeg")  # Default to JPEG

            logger.warning(
                f"Content-type not provided, guessed from extension: {mime_type}"
            )

        # Validate against supported formats
        supported_mime_types = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/bmp",
            "image/tiff",
            "image/svg+xml",
        ]

        if mime_type not in supported_mime_types:
            raise ValueError(f"Unsupported image format: {mime_type}")

        return mime_type

    def _create_vision_message(
        self, image_data: bytes, mime_type: str, question: str
    ) -> HumanMessage:
        """Create a message for the vision model with image and question."""
        # Convert image to base64
        base64_image = base64.b64encode(image_data).decode("utf-8")

        # Create content list with image and text
        content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{base64_image}",
                    "detail": "high",
                },
            },
            {"type": "text", "text": question},
        ]

        return HumanMessage(content=content)

    async def _query_vision_model(self, message: HumanMessage) -> str:
        """Send message to vision model and get response."""
        logger.info("Sending request to vision model")

        start_time = time.time()

        try:
            # Use async invoke if available, otherwise fall back to sync
            if hasattr(self.llm, "ainvoke"):
                response = await self.llm.ainvoke([message])
            else:
                # Fall back to sync invoke in async context
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, self.llm.invoke, [message])

            elapsed_time = time.time() - start_time
            logger.info(f"Vision model response received in {elapsed_time:.2f}s")

            # Extract content from response
            if hasattr(response, "content"):
                content = response.content
            elif hasattr(response, "text"):
                content = response.text
            else:
                content = str(response)

            return str(content).strip()

        except Exception as e:
            logger.error(f"Vision model request failed: {e}")
            raise ValueError(f"Failed to get response from vision model: {e}")

    def get_supported_formats(self) -> list[str]:
        """Get list of supported image formats."""
        return self.config.supported_formats or [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "bmp",
            "tiff",
            "svg",
        ]

    def __repr__(self) -> str:
        """String representation of the tool."""
        return f"ImageParserTool(model={self.config.vision_model})"
