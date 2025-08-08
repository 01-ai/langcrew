"""
MCP Configuration Module

This module provides configuration classes for MCP integration,
including security settings and connection parameters.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class MCPSecurityConfig:
    """Security configuration for MCP integration

    This configuration implements the security requirements from the MCP specification:
    1. User consent (Confused Deputy Prevention)
    2. Session management (Session Hijacking Prevention)

    By default, all security features are disabled. Use create_secure_mcp_config()
    for production environments.
    """

    # User consent (Confused Deputy Prevention)
    enable_user_consent: bool = False
    consent_cache_ttl: int = 300  # seconds

    # Session management (Session Hijacking Prevention)
    enable_session_management: bool = False
    session_timeout: int = 3600  # 1 hour
    session_rotate_interval: int = 300  # 5 minutes
    session_binding: bool = True  # Bind sessions to client fingerprints

    # Storage configuration (required for multi-process support)
    storage_backend: str = "memory"  # "memory" or "redis"
    storage_config: dict[str, Any] = field(default_factory=dict)
    # Example for Redis: {"url": "redis://[:password@]localhost:6379/0"}


@dataclass
class MCPConfig:
    """Main configuration for MCP integration"""

    # Security configuration
    security: MCPSecurityConfig = field(default_factory=MCPSecurityConfig)

    # Tool management
    cache_tools: bool = True
    tool_cache_ttl: int = 300  # seconds

    # Error handling
    fail_on_error: bool = False

    # Debug settings
    debug: bool = False

    @classmethod
    def from_dict(cls, config_dict: dict[str, Any]) -> "MCPConfig":
        """Create MCPConfig from dictionary"""
        security_dict = config_dict.pop("security", {})

        return cls(security=MCPSecurityConfig(**security_dict), **config_dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert MCPConfig to dictionary"""
        return {
            "security": self.security.__dict__,
            "cache_tools": self.cache_tools,
            "tool_cache_ttl": self.tool_cache_ttl,
            "fail_on_error": self.fail_on_error,
            "debug": self.debug,
        }


def create_secure_mcp_config() -> MCPConfig:
    """Create a secure MCP configuration for production use

    This configuration enables all MCP security features as required
    by the specification. Recommended for production environments.

    Returns:
        MCPConfig with all security features enabled
    """
    return MCPConfig(
        security=MCPSecurityConfig(
            # Enable all MCP security features
            enable_user_consent=True,
            enable_session_management=True,
            session_timeout=3600,  # 1 hour
            session_rotate_interval=300,  # 5 minutes
            session_binding=True,
        )
    )


def create_dev_mcp_config() -> MCPConfig:
    """Create a development MCP configuration with security disabled

    WARNING: This configuration disables all security features.
    Only use for local development and testing. Never use in production.

    Returns:
        MCPConfig with security features disabled
    """
    return MCPConfig(
        security=MCPSecurityConfig(
            # Disable all security for development
            enable_user_consent=False,
            enable_session_management=False,
        ),
        debug=True,  # Enable debug mode for development
    )
