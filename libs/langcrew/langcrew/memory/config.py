"""Memory configuration for LangCrew Memory System"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class MemoryConfig:
    """Memory configuration for LangCrew"""

    # Basic configuration
    enabled: bool = True
    provider: str = "memory"  # memory, sqlite, postgres, redis, mongodb, mysql

    # Unified storage configuration
    connection_string: str | None = (
        None  # Connection string for all providers (including file paths)
    )

    # Memory type configuration
    short_term: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "max_history": 20,
            # "auto_inject": True,  # DISABLED: Auto inject context (not implemented)
            # "relevance_threshold": 0.7  # DISABLED: Relevance threshold (not implemented)
        }
    )

    long_term: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "chunk_size": 500,
            "search_k": 5,
            "min_quality": 0.7,
            # "embedding_model": None,  # DISABLED: Custom embedding model (not implemented)
        }
    )

    entity: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "entity_types": ["person", "organization", "location", "concept"],
            # "extract_entities": True,  # DISABLED: Auto entity extraction (not implemented)
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
