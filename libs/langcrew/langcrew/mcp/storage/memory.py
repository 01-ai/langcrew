"""
In-memory storage implementation
"""

import time
from typing import Any

from .base import Storage


class MemoryStorage(Storage):
    """
    In-memory storage for single process environments.

    This implementation stores data in memory with optional TTL support.
    Note: This storage is NOT shared across processes.
    """

    def __init__(self):
        # Store data and expiry times separately
        self._data: dict[str, Any] = {}
        self._expiry: dict[str, float] = {}

    def get(self, key: str) -> Any | None:
        """Get value by key if not expired."""
        # Check if key exists
        if key not in self._data:
            return None

        # Check expiry
        if key in self._expiry:
            if time.time() > self._expiry[key]:
                # Expired, clean up
                del self._data[key]
                del self._expiry[key]
                return None

        return self._data[key]

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Set value with optional TTL."""
        self._data[key] = value

        if ttl is not None and ttl > 0:
            self._expiry[key] = time.time() + ttl
        elif key in self._expiry:
            # Remove expiry if no TTL specified
            del self._expiry[key]

    def delete(self, key: str) -> None:
        """Delete key from storage."""
        if key in self._data:
            del self._data[key]
        if key in self._expiry:
            del self._expiry[key]

    def exists(self, key: str) -> bool:
        """Check if key exists and is not expired."""
        return self.get(key) is not None

    def clear(self) -> None:
        """Clear all data (useful for testing)."""
        self._data.clear()
        self._expiry.clear()

    def cleanup_expired(self) -> int:
        """
        Remove expired keys from storage.

        Returns:
            Number of keys removed
        """
        current_time = time.time()
        expired_keys = [
            key for key, expiry in self._expiry.items() if current_time > expiry
        ]

        for key in expired_keys:
            self.delete(key)

        return len(expired_keys)
