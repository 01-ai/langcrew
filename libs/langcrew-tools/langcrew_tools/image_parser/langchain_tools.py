# Image Parser LangChain Tools
# Provides image parsing functionality using vision models

import asyncio
import base64
import io
import logging
import time
from pathlib import Path
from typing import ClassVar
from urllib.parse import ParseResult, unquote, urlparse

import httpx
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from PIL import Image
from pydantic import BaseModel, Field

from ..base import BaseToolInput, SandboxS3ToolMixin
from ..utils.sandbox.s3_integration import SandboxS3Toolkit
from .config import ImageParserConfig, default_config

logger = logging.getLogger(__name__)


class ImageParserInput(BaseToolInput):
    """Input for ImageParserTool."""

    image_url: str = Field(..., description="URL or local path of the image to analyze")
    question: str = Field(
        ..., description="Question or prompt about the image to ask the vision model"
    )


class ImageParserTool(SandboxS3ToolMixin):
    """Tool for analyzing images using vision models."""

    name: ClassVar[str] = "image_parser"
    args_schema: type[BaseModel] = ImageParserInput
    description: ClassVar[str] = (
        "Analyze images using vision models to answer questions about image content. "
        "Supports various image formats (JPG, PNG, GIF, WEBP, etc.) from URLs, local paths, or sandbox files. "
        "The tool downloads or reads the image, validates it, and sends it to a vision model "
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
    ) -> dict[str, str | None]:
        """Perform image analysis asynchronously.

        Returns:
            Dict containing analysis result and image URL for access.
            Format: {"analysis": str, "image_url": str | None}
        """
        logger.info(f"Starting image analysis for URL: {image_url}")
        logger.info(f"Question: {question[:100]}...")

        if not image_url or not image_url.strip():
            return {"analysis": "Error: No image URL provided", "image_url": None}

        if not question or not question.strip():
            return {"analysis": "Error: No question provided", "image_url": None}

        try:
            # load image source and validate image data
            (
                image_data,
                content_type,
                reference,
            ) = await self._load_image_source(image_url)
            image_data, mime_type = self._validate_image_data(
                image_data, content_type, reference, image_url
            )

            # Determine image URL for access
            image_url = None
            if reference and not reference.startswith(("http://", "https://")):
                # Local file detected, upload to S3 and use S3 URL
                # Convert bytes to base64 for SandboxS3Toolkit
                image_b64 = base64.b64encode(image_data).decode("utf-8")
                async_sandbox = await self.get_sandbox()
                s3_client = await self.get_s3_client()
                image_url = await SandboxS3Toolkit.upload_base64_image(
                    async_s3_client=s3_client,
                    base64_data=image_b64,
                    sandbox_id=async_sandbox.sandbox_id,
                )
            else:
                # Remote URL, use the original URL
                image_url = reference

            # Create vision model message
            message = self._create_vision_message(image_data, mime_type, question)

            # Send to vision model
            response = await self._query_vision_model(message)

            # Return structured result with image URL
            result = {
                "analysis": response,
                "image_url": image_url,
            }
            return result

        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            return {"analysis": f"Analysis failed: {str(e)}", "image_url": None}

    async def _load_image_source(self, image_url: str) -> tuple[bytes, str | None, str]:
        """Load raw image bytes plus metadata from URL or local path."""
        logger.info(f"Resolving image source: {image_url}")

        try:
            parsed_url = urlparse(image_url)
        except Exception as e:
            raise ValueError(f"Invalid image reference: {e}")

        # check if the image is a local path or a remote URL
        scheme = (parsed_url.scheme or "").lower()
        if self._is_local_reference(parsed_url):
            return await self._read_local_image(parsed_url, image_url)

        if scheme not in ("http", "https"):
            raise ValueError(
                "Unsupported image source: only http(s) URLs or local file paths are allowed"
            )

        return await self._download_remote_image(image_url, parsed_url)

    def _validate_image_data(
        self,
        image_data: bytes,
        content_type: str | None,
        reference: str,
        original_url: str,
    ) -> tuple[bytes, str]:
        """Validate image bytes, preprocess if needed, and determine MIME type."""
        if not image_data:
            raise ValueError("Image data is empty")

        mime_type = self._validate_content_type(content_type or "", reference)

        # Preprocess image (resize if needed)
        processed_data = self._preprocess_image(image_data, mime_type)

        logger.info(
            f"Image validation passed for source: {original_url}, mime: {mime_type}, final size: {len(processed_data)} bytes"
        )
        return processed_data, mime_type

    def _preprocess_image(self, image_data: bytes, mime_type: str) -> bytes:
        """Resize image to fit within max_image_resolution if needed."""
        # Skip processing for SVG as it's vector-based
        if mime_type == "image/svg+xml":
            return image_data

        try:
            with Image.open(io.BytesIO(image_data)) as img:
                # Handle animated GIFs - skip resizing for now to preserve animation
                if mime_type == "image/gif" and getattr(img, "is_animated", False):
                    logger.info("Skipping resize for animated GIF")
                    return image_data

                original_width, original_height = img.size
                max_res = self.config.max_image_resolution

                # Check if resizing is necessary
                if original_width <= max_res and original_height <= max_res:
                    return image_data

                logger.info(
                    f"Resizing image from {original_width}x{original_height} to fit within {max_res}x{max_res}"
                )

                # Resize using thumbnail to preserve aspect ratio
                img.thumbnail((max_res, max_res), Image.Resampling.LANCZOS)
                new_width, new_height = img.size

                # Save back to bytes
                output = io.BytesIO()
                # Use original format if possible, otherwise default to JPEG
                img_format = img.format if img.format else "JPEG"
                img.save(output, format=img_format)
                processed_data = output.getvalue()

                logger.info(
                    f"Resized image successfully: {original_width}x{original_height} -> {new_width}x{new_height}. "
                    f"Bytes: {len(image_data)} -> {len(processed_data)}"
                )
                return processed_data

        except Exception as e:
            logger.error(
                f"Failed to preprocess image with PIL: {e}. Using original data."
            )
            return image_data

    def _is_local_reference(self, parsed_url: ParseResult) -> bool:
        """Determine if the provided reference points to a local file."""
        scheme = (parsed_url.scheme or "").lower()
        if scheme in ("", "file"):
            return True

        raw_scheme = parsed_url.scheme or ""
        if len(raw_scheme) == 1 and parsed_url.path.startswith("\\"):
            return True

        return False

    def _resolve_local_path(
        self, parsed_url: ParseResult, original_reference: str
    ) -> Path:
        """Resolve the absolute local path from different reference formats."""
        if parsed_url.scheme == "file":
            netloc = parsed_url.netloc
            if netloc and netloc not in ("localhost", "127.0.0.1"):
                raw_path = f"//{netloc}{parsed_url.path}"
            else:
                raw_path = parsed_url.path or netloc
        elif len(parsed_url.scheme) == 1 and parsed_url.path.startswith("\\"):
            raw_path = f"{parsed_url.scheme}:{parsed_url.path}"
        else:
            raw_path = original_reference

        if not raw_path:
            raise ValueError("Invalid local image path")

        decoded_path = unquote(raw_path)
        return Path(decoded_path).expanduser()

    async def _read_local_image(
        self, parsed_url: ParseResult, original_reference: str
    ) -> tuple[bytes, str | None, str]:
        """Read and validate image data from a local path or sandbox."""
        file_path = self._resolve_local_path(parsed_url, original_reference).resolve()
        logger.info(f"Attempting to read local image from: {file_path}")

        # First try to read from local filesystem
        if file_path.exists() and file_path.is_file():
            try:
                image_data = file_path.read_bytes()
                logger.info(
                    f"Successfully loaded local image bytes: {len(image_data)} bytes from {file_path}"
                )
                return image_data, None, file_path.as_posix()
            except OSError as e:
                logger.warning(
                    f"Failed to read local image: {e}, trying sandbox fallback"
                )
        else:
            logger.info(f"Local image not found: {file_path}, trying sandbox fallback")

        # If local file doesn't exist or couldn't be read, try sandbox
        try:
            async_sandbox = await self.get_sandbox()
            sandbox_path = file_path.as_posix()  # Use the resolved path as sandbox path

            logger.info(f"Attempting to read from sandbox: {sandbox_path}")
            image_data = await async_sandbox.files.read(sandbox_path, format="bytes")

            logger.info(
                f"Successfully loaded sandbox image bytes: {len(image_data)} bytes from {sandbox_path}"
            )
            return image_data, None, sandbox_path

        except Exception as e:
            logger.error(f"Failed to read from sandbox: {e}")
            if file_path.exists():
                raise ValueError(f"Local image exists but could not be read: {e}")
            else:
                raise ValueError(
                    f"Image not found in local filesystem or sandbox: {file_path}"
                )

    async def _download_remote_image(
        self, image_url: str, parsed_url: ParseResult
    ) -> tuple[bytes, str | None, str]:
        """Download image bytes from remote URL."""
        if not parsed_url.scheme or not parsed_url.netloc:
            raise ValueError("Invalid URL format")

        logger.info(f"Downloading image from remote URL: {image_url}")

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

        logger.info(
            f"Successfully downloaded image bytes: {len(image_data)} bytes from remote URL"
        )
        return image_data, content_type or None, image_url

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
                "type": "image",
                "base64": base64_image,
                "mime_type": mime_type,
            },
            {"type": "text", "text": question},
        ]

        return HumanMessage(content_blocks=content)

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
