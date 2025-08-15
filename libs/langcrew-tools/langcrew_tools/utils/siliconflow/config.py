"""
SiliconFlow Configuration Management

This module provides configuration management for SiliconFlow API clients
with support for environment variables and default values.
"""

import os
from dataclasses import dataclass


@dataclass
class SiliconFlowConfig:
    """SiliconFlow API configuration with environment variable support"""

    url: str = "https://api.siliconflow.cn/v1"
    token: str = ""
    chunk_size: int = 10
    timeout: int = 30000

    def __post_init__(self):
        """Load configuration from environment variables if available"""
        # Override with environment variables if they exist
        self.url = os.getenv("SILICONFLOW_URL", self.url)
        self.token = os.getenv("SILICONFLOW_TOKEN", self.token)

        # Handle optional environment variables
        if chunk_size_env := os.getenv("SILICONFLOW_CHUNK_SIZE"):
            try:
                self.chunk_size = int(chunk_size_env)
            except ValueError:
                pass

        if timeout_env := os.getenv("SILICONFLOW_TIMEOUT"):
            try:
                self.timeout = int(timeout_env)
            except ValueError:
                pass

    @property
    def headers(self) -> dict:
        """Get HTTP headers for API requests

        Returns:
            dict: Headers dictionary with authorization and content type
        """
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def validate(self) -> None:
        """Validate configuration parameters"""
        if not self.url:
            raise ValueError("SiliconFlow URL is required")
        if not self.token:
            raise ValueError("SiliconFlow token is required")
