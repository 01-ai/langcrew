"""Memory configuration for LangCrew Memory System"""

from dataclasses import dataclass, field
from typing import Any


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
    
    # Memory scope configurations with default instructions
    user_memory: MemoryScopeConfig = field(default_factory=lambda: MemoryScopeConfig(
        instructions="Store personal preferences, habits, and important information specific to this user."
    ))
    app_memory: MemoryScopeConfig = field(default_factory=lambda: MemoryScopeConfig(
        enabled=False,
        instructions="Store general knowledge, best practices, and information that benefits all users."
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