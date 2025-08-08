"""
Parser Configuration Management

This module provides configuration management for file parsing APIs
with support for environment variables and default values.
"""

import os
from dataclasses import dataclass


@dataclass
class ParserConfig:
    """Parser API configuration with environment variable support"""

    # Marker API configuration (for PDF files)
    marker_url: str = "https://api.marker.com/parse"
    marker_token: str = ""

    # Unstructured API configuration (for other file types)
    unstructured_url: str = "https://api.unstructured.io/general/v0/general"
    unstructured_key: str = ""

    # Request timeouts
    marker_timeout: int = 50
    unstructured_timeout: int = 30

    def __post_init__(self):
        """Load configuration from environment variables if available"""
        # Marker API configuration
        self.marker_url = os.getenv("MARKER_API_URL", self.marker_url)
        self.marker_token = os.getenv("MARKER_API_TOKEN", self.marker_token)

        # Unstructured API configuration
        self.unstructured_url = os.getenv("UNSTRUCTURED_API_URL", self.unstructured_url)
        self.unstructured_key = os.getenv("UNSTRUCTURED_API_KEY", self.unstructured_key)

        # Timeout configuration
        if timeout_env := os.getenv("MARKER_TIMEOUT"):
            try:
                self.marker_timeout = int(timeout_env)
            except ValueError:
                pass

        if timeout_env := os.getenv("UNSTRUCTURED_TIMEOUT"):
            try:
                self.unstructured_timeout = int(timeout_env)
            except ValueError:
                pass

    def validate(self) -> None:
        """Validate configuration parameters"""
        if not self.marker_url:
            raise ValueError("Marker API URL is required")
        if not self.marker_token:
            raise ValueError("Marker API token is required, set env: MARKER_API_TOKEN")
        if not self.unstructured_url:
            raise ValueError("Unstructured API URL is required")
        if not self.unstructured_key:
            raise ValueError(
                "Unstructured API key is required, set env: UNSTRUCTURED_API_KEY"
            )


# Default configuration instance
default_config = ParserConfig()
