"""
MCP Exception Classes

This module defines custom exceptions for MCP integration,
providing clear error messages for various security and operational issues.
"""

from typing import Any


class MCPException(Exception):
    """Base exception for all MCP-related errors"""
    
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.details = details or {}


class MCPSecurityException(MCPException):
    """Exception raised for security violations"""
    
    def __init__(self, message: str, violated_rule: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(message, details)
        self.violated_rule = violated_rule


class MCPConnectionException(MCPException):
    """Exception raised for connection-related issues"""
    
    def __init__(self, message: str, server_name: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(message, details)
        self.server_name = server_name


class MCPValidationException(MCPException):
    """Exception raised for validation failures"""
    pass


class MCPPermissionDeniedException(MCPSecurityException):
    """Exception raised when permission is denied"""
    
    def __init__(self, message: str, resource: str | None = None, action: str | None = None):
        super().__init__(message)
        self.resource = resource
        self.action = action


class MCPUserConsentRequiredException(MCPSecurityException):
    """Exception raised when user consent is required but not provided"""
    
    def __init__(self, message: str, action: str, details: dict[str, Any] | None = None):
        super().__init__(message, violated_rule="user_consent")
        self.action = action


class MCPConfigurationException(MCPException):
    """Exception raised for configuration issues"""
    
    def __init__(self, message: str, config_key: str | None = None, expected_type: str | None = None):
        super().__init__(message)
        self.config_key = config_key
        self.expected_type = expected_type