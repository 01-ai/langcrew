"""
Sandbox configuration for browser operations

This module defines the configuration structure for sandbox-based browser management.
Each sandbox instance has a unique domain, sandbox_id, and api_key combination.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Any

from agentbox import AsyncSandbox

logger = logging.getLogger(__name__)


@dataclass
class SandboxConfig:
    """
    Configuration for sandbox-based browser operations

    Attributes:
        domain: The domain hosting the sandbox service (e.g., 'e2b.dev')
        sandbox_id: Unique identifier for the sandbox instance
        api_key: Authentication key for accessing the sandbox
    """

    domain: str
    sandbox_id: str
    api_key: str

    browser_vnc_url: str | None = None
    browser_wss_url: str | None = None

    @staticmethod
    def get_sandbox_config(async_sandbox: AsyncSandbox) -> SandboxConfig:
        return SandboxConfig(
            domain=async_sandbox.connection_config.domain,
            sandbox_id=async_sandbox.sandbox_id,
            api_key=async_sandbox.connection_config.api_key,
        )

    @classmethod
    def get_local_config(cls) -> SandboxConfig:
        """
        Get or create the global local configuration instance

        Returns a singleton instance for local (non-sandbox) browser operations.
        This avoids creating multiple identical local config instances.

        Returns:
            SandboxConfig: Global local configuration instance
        """
        return SandboxConfig(
            domain="localhost",
            sandbox_id="local",
            api_key="local",
        )

    def is_local_config(self) -> bool:
        """
        Check if this is a local configuration

        Returns:
            bool: True if this is a local configuration
        """
        return (
            self.domain == "localhost"
            and self.sandbox_id == "local"
            and self.api_key == "local"
        )

    def get_key(self) -> str:
        """
        Generate unique sandbox identifier

        Returns:
            str: Unique key in format 'domain:sandbox_id'
        """
        return f"{self.domain}:{self.sandbox_id}"

    def get_hash(self) -> str:
        """
        Generate configuration hash for security comparison

        Returns:
            str: SHA256 hash of the configuration
        """
        content = f"{self.domain}:{self.sandbox_id}:{self.api_key}"
        return hashlib.sha256(content.encode()).hexdigest()

    def is_valid(self) -> bool:
        """
        Validate configuration completeness

        Returns:
            bool: True if all required fields are present and non-empty
        """
        is_valid = bool(self.domain and self.sandbox_id and self.api_key)
        if not is_valid:
            logger.warning(
                f"Invalid sandbox config: domain={bool(self.domain)}, "
                f"sandbox_id={bool(self.sandbox_id)}, api_key={bool(self.api_key)}"
            )
        return is_valid

    def to_connect_config(self) -> dict[str, Any]:
        """
        Convert SandboxConfig to dictionary format

        Returns:
            dict[str, Any]: Dictionary representation of the configuration
        """
        return {
            "domain": self.domain,
            "sandbox_id": self.sandbox_id,
            "api_key": self.api_key,
        }

    def __str__(self) -> str:
        """String representation (without exposing api_key)"""
        return f"SandboxConfig(domain='{self.domain}', sandbox_id='{self.sandbox_id}')"

    def __repr__(self) -> str:
        """Debug representation (without exposing api_key)"""
        return self.__str__()
