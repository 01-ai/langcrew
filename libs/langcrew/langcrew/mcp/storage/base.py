"""
Base storage interface
"""

from abc import ABC, abstractmethod
from typing import Any


class Storage(ABC):
    """
    Simple storage interface for multi-process support.

    This interface provides basic key-value storage operations
    with TTL support for caching and session management.
    """

    @abstractmethod
    def get(self, key: str) -> Any | None:
        """
        Get value by key.

        Args:
            key: Storage key

        Returns:
            Value if exists and not expired, None otherwise
        """
        pass

    @abstractmethod
    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """
        Set value with optional TTL.

        Args:
            key: Storage key
            value: Value to store
            ttl: Time-to-live in seconds, None for no expiration
        """
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        """
        Delete key from storage.

        Args:
            key: Storage key
        """
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """
        Check if key exists and is not expired.

        Args:
            key: Storage key

        Returns:
            True if key exists and not expired
        """
        pass
