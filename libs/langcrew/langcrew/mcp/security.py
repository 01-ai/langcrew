"""
MCP Security Module (Simplified)

This module implements only the security requirements from the MCP specification:
- User consent (Confused Deputy Prevention)
- Session management (Session Hijacking Prevention)
"""

import hashlib
import json
import secrets
from datetime import datetime, timedelta
from typing import Any

from .config import MCPSecurityConfig
from .exceptions import MCPUserConsentRequiredException
from .fingerprint import MCPFingerprint
from .storage import Storage, get_storage


class MCPSecurityValidator:
    """Validates and enforces MCP security policies"""
    
    def __init__(self, config: MCPSecurityConfig):
        self.config = config
        
        # Create storage backend
        self._storage = get_storage(
            backend=config.storage_backend,
            **config.storage_config
        )
        
        # Session management
        self.session_manager = SessionManager(
            storage=self._storage,
            enabled=config.enable_session_management,
            session_timeout=config.session_timeout,
            rotate_interval=config.session_rotate_interval,
        )
    
    def check_user_consent(self, action: str, details: dict[str, Any]) -> bool:
        """Check if user consent is required and valid"""
        if not self.config.enable_user_consent:
            return True
        
        # Use stable SHA256 hash
        details_str = json.dumps(details, sort_keys=True)
        consent_hash = hashlib.sha256(details_str.encode()).hexdigest()[:16]
        consent_key = f"mcp:consent:{action}:{consent_hash}"
        
        # Check consent in storage
        if self._storage.exists(consent_key):
            return True
        
        # Consent not found or expired
        raise MCPUserConsentRequiredException(
            f"User consent required for action: {action}",
            action=action,
            details=details
        )
    
    def grant_consent(self, action: str, details: dict[str, Any]):
        """Grant user consent for an action"""
        # Use stable SHA256 hash
        details_str = json.dumps(details, sort_keys=True)
        consent_hash = hashlib.sha256(details_str.encode()).hexdigest()[:16]
        consent_key = f"mcp:consent:{action}:{consent_hash}"
        
        # Store consent with TTL
        self._storage.set(
            consent_key,
            {"granted_at": datetime.now().isoformat()},
            ttl=self.config.consent_cache_ttl
        )


class SessionManager:
    """
    Manages secure sessions for MCP connections with anti-hijacking measures.
    
    Implements:
    - Non-deterministic session ID generation
    - Session binding to client fingerprints
    - Automatic session rotation
    - Session expiration
    """
    
    def __init__(self, storage: Storage, enabled: bool = True, session_timeout: int = 3600, rotate_interval: int = 300):
        self.storage = storage
        self.enabled = enabled
        self.session_timeout = session_timeout  # seconds
        self.rotate_interval = rotate_interval  # seconds
    
    def create_session(self, client_fingerprint: MCPFingerprint, metadata: dict[str, Any] | None = None) -> str:
        """Create a new secure session."""
        if not self.enabled:
            return "session-disabled"
        
        # Generate cryptographically secure session ID
        session_id = secrets.token_urlsafe(32)
        
        # Create session data - store uuid_str instead of full fingerprint
        session_data = {
            "client_fingerprint": client_fingerprint.uuid_str,
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "last_rotation": datetime.now().isoformat(),
            "metadata": metadata or {},
            "request_count": 0,
        }
        
        # Store in backend with TTL
        key = f"mcp:session:{session_id}"
        self.storage.set(key, session_data, ttl=self.session_timeout)
        
        return session_id
    
    def validate_session(self, session_id: str, client_fingerprint: MCPFingerprint) -> tuple[bool, str | None]:
        """
        Validate a session and return (is_valid, new_session_id).
        
        Returns:
            Tuple of (is_valid, new_session_id) where new_session_id is provided if rotation occurred
        """
        if not self.enabled:
            return (True, None)
        
        # Check if fingerprint is expired
        if client_fingerprint.is_expired():
            return (False, None)
        
        key = f"mcp:session:{session_id}"
        session_data = self.storage.get(key)
        
        if session_data is None:
            return (False, None)
        
        # Verify client fingerprint binding - compare uuid_str
        if session_data["client_fingerprint"] != client_fingerprint.uuid_str:
            # Potential session hijacking attempt
            self.storage.delete(key)
            return (False, None)
        
        # Update last activity
        session_data["last_activity"] = datetime.now().isoformat()
        session_data["request_count"] += 1
        
        # Check if rotation is needed
        last_rotation = datetime.fromisoformat(session_data["last_rotation"])
        if datetime.now() - last_rotation > timedelta(seconds=self.rotate_interval):
            new_session_id = self._rotate_session(session_id, session_data, client_fingerprint)
            return (True, new_session_id)
        
        # Update session in storage
        self.storage.set(key, session_data, ttl=self.session_timeout)
        
        return (True, None)
    
    def _rotate_session(self, old_session_id: str, session_data: dict[str, Any], client_fingerprint: MCPFingerprint) -> str:
        """Rotate a session to a new ID while preserving session data."""
        # Generate new session ID
        new_session_id = secrets.token_urlsafe(32)
        
        # Update session data
        session_data["last_rotation"] = datetime.now().isoformat()
        
        # Store with new ID
        new_key = f"mcp:session:{new_session_id}"
        self.storage.set(new_key, session_data, ttl=self.session_timeout)
        
        # Delete old session
        old_key = f"mcp:session:{old_session_id}"
        self.storage.delete(old_key)
        
        return new_session_id
    
    def end_session(self, session_id: str) -> bool:
        """End a session."""
        key = f"mcp:session:{session_id}"
        if self.storage.exists(key):
            self.storage.delete(key)
            return True
        return False