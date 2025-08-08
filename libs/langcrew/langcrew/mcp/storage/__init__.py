"""
Storage abstraction for multi-process support

This module provides a simple storage interface that can be backed by
different implementations (memory, Redis, etc.) to support multi-process
deployments.
"""

from .base import Storage
from .memory import MemoryStorage

# Optional Redis support
try:
    from .redis import RedisStorage
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False
    RedisStorage = None


def get_storage(backend: str = "memory", **kwargs) -> Storage:
    """
    Factory function to create storage instance.
    
    Args:
        backend: Storage backend type ("memory" or "redis")
        **kwargs: Backend-specific configuration
        
    Returns:
        Storage instance
        
    Raises:
        ValueError: If backend is unknown
        ImportError: If redis backend requested but redis not installed
    """
    if backend == "memory":
        return MemoryStorage()
    elif backend == "redis":
        if not HAS_REDIS:
            raise ImportError(
                "Redis support requires 'redis' package. "
                "Install with: pip install redis"
            )
        return RedisStorage(**kwargs)
    else:
        raise ValueError(f"Unknown storage backend: {backend}")


__all__ = ["Storage", "MemoryStorage", "RedisStorage", "get_storage", "HAS_REDIS"]