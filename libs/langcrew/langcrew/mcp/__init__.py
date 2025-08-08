"""
LangCrew MCP (Model Context Protocol) Integration

This module provides secure integration with MCP servers,
allowing LangCrew agents to use MCP tools with comprehensive security controls.
"""

from .adapter import MCPToolAdapter, SecureMCPTool
from .config import (
    MCPConfig,
    MCPSecurityConfig,
    create_dev_mcp_config,
    create_secure_mcp_config,
)
from .exceptions import (
    MCPConfigurationException,
    MCPConnectionException,
    MCPException,
    MCPPermissionDeniedException,
    MCPSecurityException,
    MCPUserConsentRequiredException,
    MCPValidationException,
)
from .fingerprint import MCPFingerprint
from .security import MCPSecurityValidator

__all__ = [
    # Main adapter
    "MCPToolAdapter",
    "SecureMCPTool",
    # Configuration
    "MCPConfig",
    "MCPSecurityConfig",
    "create_secure_mcp_config",
    "create_dev_mcp_config",
    # Security
    "MCPSecurityValidator",
    "MCPFingerprint",
    # Exceptions
    "MCPException",
    "MCPSecurityException",
    "MCPConnectionException",
    "MCPValidationException",
    "MCPPermissionDeniedException",
    "MCPUserConsentRequiredException",
    "MCPConfigurationException",
]
