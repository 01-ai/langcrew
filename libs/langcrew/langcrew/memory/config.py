"""Memory configuration for LangCrew Memory System"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class MemoryConfig:
    """Memory configuration for LangCrew"""

    # Basic configuration
    provider: str = "memory"  # memory, sqlite, postgres, redis, mongodb, mysql

    # Unified storage configuration
    connection_string: str | None = None  # Connection string for all providers

    # Memory type configuration
    short_term_enabled: bool = False
    short_term_max_history: int = 20
    
    long_term_enabled: bool = False  
    long_term_min_quality: float = 0.7
    
    entity_enabled: bool = False

    @classmethod
    def from_dict(cls, config_dict: dict[str, Any]) -> "MemoryConfig":
        """Create config from dictionary"""
        return cls(**config_dict)
