"""Memory configuration for LangCrew Memory System"""

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class IndexConfig:
    """Configuration for vector indexing in storage"""
    
    # Embedding configuration
    dims: int | None = None
    embed: str | Callable | None = None
    
    # Field configuration for indexing
    fields: list[str] | None = None
    
    # Additional index parameters
    distance_strategy: str = "cosine"  # cosine, euclidean, dot_product
    
    def __post_init__(self):
        # Validate dims
        if self.dims is not None and self.dims <= 0:
            raise ValueError("dims must be a positive integer")
        
        # Validate distance strategy
        valid_strategies = {"cosine", "euclidean", "dot_product"}
        if self.distance_strategy not in valid_strategies:
            raise ValueError(f"distance_strategy must be one of {valid_strategies}")
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage initialization"""
        config = {}
        if self.dims is not None:
            config["dims"] = self.dims
        if self.embed is not None:
            config["embed"] = self.embed
        if self.fields is not None:
            config["fields"] = self.fields
        if self.distance_strategy != "cosine":
            config["distance_strategy"] = self.distance_strategy
        return config


@dataclass
class MemoryScopeConfig:
    """Memory scope configuration for user/app memory dimensions"""
    
    enabled: bool = True
    instructions: str = ""
    schema: type = str
    actions: tuple = ("create", "update", "delete")
    langmem_tool_config: dict = field(default_factory=dict)
    
    def __post_init__(self):
        # Validate actions
        valid_actions = {"create", "update", "delete"}
        if not all(action in valid_actions for action in self.actions):
            raise ValueError(f"Invalid actions. Must be subset of {valid_actions}")
        
        # Validate actions tuple not empty
        if not self.actions:
            raise ValueError("Actions cannot be empty")


@dataclass
class ShortTermMemoryConfig:
    """Short-term memory configuration (conversation state persistence)"""
    
    enabled: bool = True
    provider: str | None = None
    connection_string: str | None = None


@dataclass
class LongTermMemoryConfig:
    """Long-term memory configuration (cross-session learning)"""
    
    enabled: bool = False
    model: str = "anthropic:claude-3-5-sonnet-latest"
    provider: str | None = None
    connection_string: str | None = None
    
    # Index configuration with sensible defaults
    index: IndexConfig | None = field(default_factory=lambda: IndexConfig(
        dims=1536,
        embed="openai:text-embedding-3-small"
    ))
    
    # Memory scope configurations with default instructions
    user_memory: MemoryScopeConfig = field(default_factory=lambda: MemoryScopeConfig(
        instructions="Proactively call this tool when you:\n\n"
                    "1. Identify a new USER preference, habit, or personal information.\n"
                    "2. Receive an explicit USER request to remember something or otherwise alter your behavior.\n"
                    "3. Are working and want to record important context specific to this user.\n"
                    "4. Identify that an existing USER MEMORY is incorrect or outdated."
    ))
    app_memory: MemoryScopeConfig = field(default_factory=lambda: MemoryScopeConfig(
        enabled=False,
        instructions="Proactively call this tool when you:\n\n"
                    "1. Learn general knowledge, best practices, or patterns that benefit all users.\n"
                    "2. Receive explicit requests to remember application-wide information.\n"
                    "3. Identify outdated or incorrect general knowledge in existing memories.\n"
                    "4. Want to record important context that applies across different users.\n\n"
                    "IMPORTANT: NEVER store user personal information, preferences, or user-specific data here."
    ))
    app_id: str | None = None
    
    # Search tool configuration
    search_response_format: str = "content"
    
    def __post_init__(self):
        # Validate app_memory requires app_id
        if self.enabled and self.app_memory.enabled and not self.app_id:
            raise ValueError("app_memory.enabled=True requires app_id")
        
        # Validate app_id format (basic validation)
        if self.app_id and not isinstance(self.app_id, str):
            raise ValueError("app_id must be a string")
        
        # Validate search_response_format
        valid_formats = {"content", "content_and_artifact"}
        if self.search_response_format not in valid_formats:
            raise ValueError(f"search_response_format must be one of {valid_formats}")
        
        # Validate model string
        if not isinstance(self.model, str) or not self.model.strip():
            raise ValueError("model must be a non-empty string")


@dataclass
class MemoryConfig:
    """Unified memory configuration for LangCrew"""
    
    # Global storage configuration
    provider: str = "memory"  # memory, sqlite, postgres, redis, mongodb, mysql
    connection_string: str | None = None
    
    # Memory type configurations
    short_term: ShortTermMemoryConfig = field(default_factory=ShortTermMemoryConfig)
    long_term: LongTermMemoryConfig = field(default_factory=LongTermMemoryConfig)
    
    def get_short_term_provider(self) -> str:
        """Get actual provider for short-term memory"""
        return self.short_term.provider or self.provider
    
    def get_long_term_provider(self) -> str:
        """Get actual provider for long-term memory"""
        return self.long_term.provider or self.provider
    
    @classmethod
    def from_dict(cls, config_dict: dict[str, Any]) -> "MemoryConfig":
        """Create config from dictionary"""
        return cls(**config_dict)