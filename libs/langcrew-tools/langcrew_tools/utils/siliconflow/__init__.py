"""
SiliconFlow Toolkit Package

This package provides SiliconFlow API integration tools:
- SiliconFlowClient: Unified embedding and rerank operations
- SiliconFlowConfig: Configuration management with environment variable support

Usage:
    from toolkit.siliconflow import SiliconFlowClient, SiliconFlowConfig

    # Using default configuration
    client = SiliconFlowClient()

    # Using custom configuration
    config = SiliconFlowConfig(url="custom-url", token="custom-token")
    client = SiliconFlowClient(config=config)
"""

from .client import SiliconFlowClient, SiliconFlowEmbeddings
from .config import SiliconFlowConfig
from .exceptions import SiliconFlowError

__all__ = [
    "SiliconFlowEmbeddings",
    "SiliconFlowClient",
    "SiliconFlowConfig",
    "SiliconFlowError",
]
