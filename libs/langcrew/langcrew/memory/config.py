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
    connection_string: str | None = None  # Connection string for all providers

    # Memory type configuration
    short_term: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "max_history": 20,
            # "auto_inject": True,  # Auto inject context - reserved for future use
            # "relevance_threshold": 0.7,  # Relevance threshold - reserved for future use
        }
    )

    long_term: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "min_quality": 0.7,
            # "embedding_model": None,  # Use default embedding model - reserved for future use
            # "chunk_size": 500,  # Text chunk size for storage - reserved for future use
            # "search_k": 5,  # Number of relevant items to retrieve - reserved for future use
        }
    )

    entity: dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            # "extract_entities": True,  # Auto-extract entities - reserved for future use
            # "entity_types": ["person", "organization", "location", "concept"],  # Entity types - reserved for future use
        }
    )

    @classmethod
    def from_dict(cls, config_dict: dict[str, Any]) -> "MemoryConfig":
        """Create config from dictionary"""
        return cls(**config_dict)
