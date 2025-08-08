"""
Redis storage implementation
"""

import json
from typing import Any

from .base import Storage

try:
    import redis
except ImportError:
    raise ImportError(
        "Redis support requires 'redis' package. Install with: pip install redis"
    )


class RedisStorage(Storage):
    """
    Redis storage for multi-process environments.

    This implementation uses Redis as backend storage, supporting
    multi-process and distributed deployments.
    """

    def __init__(self, url: str = "redis://localhost:6379/0", **kwargs):
        """
        Initialize Redis storage.

        Args:
            url: Redis URL in format redis://[:password@]host[:port][/database]
            **kwargs: Additional redis client options
        """
        # Create Redis client from URL
        self.client = redis.from_url(url, decode_responses=True, **kwargs)

        # Test connection
        try:
            self.client.ping()
        except redis.ConnectionError as e:
            raise ConnectionError(f"Failed to connect to Redis: {e}")

    def get(self, key: str) -> Any | None:
        """Get value from Redis."""
        value = self.client.get(key)
        if value is None:
            return None

        # Try to deserialize JSON
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            # Return as string if not JSON
            return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Set value in Redis with optional TTL."""
        # Serialize to JSON if not string
        if not isinstance(value, str):
            value = json.dumps(value)

        if ttl is not None and ttl > 0:
            self.client.setex(key, ttl, value)
        else:
            self.client.set(key, value)

    def delete(self, key: str) -> None:
        """Delete key from Redis."""
        self.client.delete(key)

    def exists(self, key: str) -> bool:
        """Check if key exists in Redis."""
        return bool(self.client.exists(key))

    def incr(self, key: str, amount: int = 1) -> int:
        """
        Increment a counter (useful for rate limiting).

        Args:
            key: Counter key
            amount: Amount to increment

        Returns:
            New counter value
        """
        return self.client.incrby(key, amount)

    def expire(self, key: str, ttl: int) -> bool:
        """
        Set TTL on existing key.

        Args:
            key: Key to expire
            ttl: TTL in seconds

        Returns:
            True if TTL was set
        """
        return bool(self.client.expire(key, ttl))
