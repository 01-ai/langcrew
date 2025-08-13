"""Base configuration for LangCrew Memory System"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class MemoryConfig:
    """Memory configuration for LangCrew"""

    # Basic configuration
    enabled: bool = True
    provider: str = "memory"  # memory, sqlite, postgres, redis, mongodb, mysql

    # Unified storage configuration
    connection_string: str | None = None  # Connection string for all providers

    # Memory type configuration
    short_term: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "auto_inject": True,  # Auto inject context
            "max_history": 20,
            "relevance_threshold": 0.7,
        }
    )

    long_term: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "embedding_model": None,  # Use default
            "chunk_size": 500,
            "search_k": 5,
            "min_quality": 0.7,
        }
    )

    entity: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "extract_entities": True,
            "entity_types": ["person", "organization", "location", "concept"],
        }
    )

    # Shared namespaces for cross-project access
    shared_namespaces: list = field(default_factory=list)

    # Thread management
    thread_id: str | None = None  # Fixed thread_id if specified

    @classmethod
    def from_dict(cls, config_dict: dict[str, Any]) -> "MemoryConfig":
        """Create config from dictionary"""
        return cls(**config_dict)
