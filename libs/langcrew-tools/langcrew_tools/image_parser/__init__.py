"""
Image Parser LangChain Tools

This package provides LangChain compatible tools for image analysis operations:
- ImageParserTool: Main tool for analyzing images using vision models
- Supports various image formats (JPG, PNG, GIF, WEBP, etc.) from URLs
- Downloads images, validates them, and sends to vision models for analysis

Features:
    - Automatic image download and validation
    - Support for multiple image formats
    - Configurable vision model integration
    - Size and format validation
    - Error handling for network and processing issues

Usage:
    from tools.image_parser import ImageParserTool

    tool = ImageParserTool()
    result = await tool._arun(
        image_url="https://example.com/image.jpg",
        question="What do you see in this image?"
    )

Environment Variables:
    VISION_MODEL: Vision model to use (default: gpt-4o)
    VISION_BASE_URL: Base URL for vision model API
    VISION_API_KEY: API key for vision model
    VISION_TIMEOUT: Request timeout in seconds
    VISION_MAX_TOKENS: Maximum tokens for response
    VISION_TEMPERATURE: Temperature for model responses
    VISION_MAX_IMAGE_SIZE: Maximum image size in bytes
"""

from .langchain_tools import ImageParserTool

__all__ = [
    "ImageParserTool",
]
