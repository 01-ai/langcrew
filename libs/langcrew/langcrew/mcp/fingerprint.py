"""
MCP Fingerprint Module (Simplified)

This module provides a minimal fingerprint implementation for LangCrew MCP client.
The fingerprint is used primarily for session management and client identification.
"""

import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any

from pydantic import BaseModel, Field, field_validator


class MCPFingerprint(BaseModel):
    """
    Minimal fingerprint implementation for session management.

    This simplified version focuses on:
    - Client instance identification
    - Session management support (preventing session hijacking)

    Attributes:
        uuid_str: Unique identifier for this fingerprint
        created_at: When this fingerprint was created
        session_token: Optional token for session-based authentication
        expires_at: Optional expiration time for the fingerprint
        metadata: Simple metadata dictionary (max 1KB)
    """

    # Basic identification
    uuid_str: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.now)

    # Session management (optional)
    session_token: str | None = None
    expires_at: datetime | None = None

    # Simple metadata
    metadata: dict[str, Any] = Field(default_factory=dict)

    def __init__(self, **data):
        """Initialize with auto-generated fields, preventing external override."""
        # Prevent external setting of critical fields (security measure)
        if "uuid_str" in data:
            data.pop("uuid_str")
        if "created_at" in data:
            data.pop("created_at")

        # Call parent constructor
        super().__init__(**data)

    @field_validator("metadata")
    @classmethod
    def validate_metadata(cls, v):
        """Validate metadata structure and content for security."""
        if not isinstance(v, dict):
            raise ValueError("Metadata must be a dictionary")

        # Check all keys and values for proper types
        for key, value in v.items():
            if not isinstance(key, str):
                raise ValueError(f"Metadata keys must be strings, got {type(key)}")

            # Only allow simple types to prevent serialization issues
            if not isinstance(value, str | int | float | bool | type(None)):
                if isinstance(value, dict):
                    # Allow one level of nesting, but check contents
                    for nested_key, nested_value in value.items():
                        if not isinstance(nested_key, str):
                            raise ValueError("Nested metadata keys must be strings")
                        if not isinstance(
                            nested_value, str | int | float | bool | type(None)
                        ):
                            raise ValueError(
                                f"Nested metadata values must be simple types, got {type(nested_value)}"
                            )
                else:
                    raise ValueError(
                        f"Metadata values must be simple types, got {type(value)}"
                    )

        # Limit size to 1KB to prevent DoS
        if len(str(v)) > 1024:
            raise ValueError("Metadata size exceeds 1KB limit")

        return v

    @classmethod
    def create_with_session(cls, ttl_seconds: int = 3600) -> "MCPFingerprint":
        """
        Create a fingerprint with session management capabilities.

        Args:
            ttl_seconds: Time-to-live in seconds (default: 1 hour)

        Returns:
            MCPFingerprint with session token and expiration
        """
        return cls(
            session_token=secrets.token_urlsafe(32),
            expires_at=datetime.now() + timedelta(seconds=ttl_seconds),
        )

    def is_expired(self) -> bool:
        """
        Check if the fingerprint has expired.

        Returns:
            True if expired, False otherwise
        """
        if self.expires_at:
            return datetime.now() > self.expires_at
        return False

    def __str__(self) -> str:
        """String representation showing the UUID."""
        return self.uuid_str

    def __eq__(self, other) -> bool:
        """Compare fingerprints by their UUID."""
        if isinstance(other, MCPFingerprint):
            return self.uuid_str == other.uuid_str
        return False

    def __hash__(self) -> int:
        """Hash based on UUID for use in sets/dicts."""
        return hash(self.uuid_str)

    def to_dict(self) -> dict[str, Any]:
        """
        Convert to dictionary for serialization (excluding sensitive data).

        Note: session_token is excluded for security reasons.

        Returns:
            Dictionary representation of the fingerprint
        """
        result = {
            "uuid_str": self.uuid_str,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata,
        }

        # Do NOT include session_token - it's sensitive information
        # that should not be serialized or logged

        if self.expires_at:
            result["expires_at"] = self.expires_at.isoformat()

        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "MCPFingerprint":
        """
        Create a fingerprint from dictionary (for non-sensitive data only).

        Security note: This method does NOT restore uuid_str, created_at, or
        session_token to prevent fingerprint forgery and token leakage.

        Args:
            data: Dictionary representation

        Returns:
            MCPFingerprint instance
        """
        if not data:
            return cls()

        # Only restore non-sensitive fields
        expires_at = data.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)

        # Create new instance with fresh UUID and timestamp
        # Do NOT restore: uuid_str, created_at, session_token
        return cls(expires_at=expires_at, metadata=data.get("metadata", {}))

    def regenerate_session_token(self) -> str:
        """
        Regenerate session token (useful for token rotation).

        Returns:
            New session token
        """
        self.session_token = secrets.token_urlsafe(32)
        return self.session_token

    def clear_session(self) -> None:
        """
        Clear session-related data.

        This removes the session token and expiration, effectively
        invalidating the session.
        """
        self.session_token = None
        self.expires_at = None
