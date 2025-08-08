"""
Image Parser Configuration Management

This module provides configuration management for image parsing APIs
with support for environment variables and default values.
"""

import os
from dataclasses import dataclass


@dataclass
class ImageParserConfig:
    """Image parser API configuration with environment variable support"""

    # Vision model configuration
    vision_model: str = "gpt-4o"
    vision_base_url: str | None = None
    vision_api_key: str | None = None

    # Request timeouts
    request_timeout: int = 60

    # Image processing settings
    max_image_size: int = 20 * 1024 * 1024  # 20MB
    supported_formats: list | None = None

    # Response settings
    max_tokens: int = 4096
    temperature: float = 0.0

    def __post_init__(self):
        """Load configuration from environment variables if available"""
        # Vision model configuration
        self.vision_model = os.getenv("VISION_MODEL", self.vision_model)
        self.vision_base_url = os.getenv("VISION_BASE_URL", self.vision_base_url)
        self.vision_api_key = os.getenv("VISION_API_KEY", self.vision_api_key)

        # Timeout configuration
        if timeout_env := os.getenv("VISION_TIMEOUT"):
            try:
                self.request_timeout = int(timeout_env)
            except ValueError:
                pass

        # Token and temperature configuration
        if max_tokens_env := os.getenv("VISION_MAX_TOKENS"):
            try:
                self.max_tokens = int(max_tokens_env)
            except ValueError:
                pass

        if temperature_env := os.getenv("VISION_TEMPERATURE"):
            try:
                self.temperature = float(temperature_env)
            except ValueError:
                pass

        # Image size configuration
        if max_size_env := os.getenv("VISION_MAX_IMAGE_SIZE"):
            try:
                self.max_image_size = int(max_size_env)
            except ValueError:
                pass

        # Initialize supported formats if not set
        if self.supported_formats is None:
            self.supported_formats = [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "bmp",
                "tiff",
                "svg",
            ]

    def validate(self) -> None:
        """Validate configuration parameters"""
        if not self.vision_model:
            raise ValueError("Vision model is required")

        # Note: API key and base URL are optional as they can be set via environment
        # or passed directly to the LLM client


# Default configuration instance
default_config = ImageParserConfig()
