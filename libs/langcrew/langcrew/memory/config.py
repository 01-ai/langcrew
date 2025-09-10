"""Memory configuration for LangCrew Memory System"""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any


@dataclass
class IndexConfig:
    """Configuration for vector indexing in storage

    Args:
        dims: Embedding dimensions (e.g., 1536 for OpenAI, 1024 for Anthropic)
        embed: Embedding provider string or callable (e.g., "openai:text-embedding-3-small")
        extra_config: Storage-specific configurations like fields, distance_strategy, etc.

    Examples:
        # Basic configuration without embedding (no vector search)
        IndexConfig()

        # With OpenAI embedding
        IndexConfig(
            dims=1536,
            embed="openai:text-embedding-3-small"
        )

        # With Anthropic embedding
        IndexConfig(
            dims=1024,
            embed="anthropic:voyage-3"
        )

        # With storage-specific configurations
        IndexConfig(
            dims=1536,
            embed="openai:text-embedding-3-small",
            extra_config={
                "fields": ["content"],
                "distance_strategy": "euclidean"
            }
        )
    """

    # Embedding configuration - None by default to avoid external dependencies
    dims: int | None = None
    embed: str | Callable | None = None

    # Storage-specific configurations (e.g., fields, distance_strategy, etc.)
    extra_config: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        # Validate dims
        if self.dims is not None and self.dims <= 0:
            raise ValueError("dims must be a positive integer")

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage initialization"""
        config = {}
        if self.dims is not None:
            config["dims"] = self.dims
        if self.embed is not None:
            config["embed"] = self.embed

        # Merge storage-specific configurations
        config.update(self.extra_config)
        return config


@dataclass
class MemoryScopeConfig:
    """Memory scope configuration for user/app memory dimensions

    Args:
        enabled: Whether this memory scope is enabled
        manage_instructions: Instructions for when to use the memory management tool
        search_instructions: Instructions for when to use the memory search tool
        schema: Data schema for memory content validation (default: str)
        actions_permitted: Tuple of allowed actions ("create", "update", "delete")
    """

    enabled: bool = True
    # Separate instructions for manage and search tools
    manage_instructions: str = ""
    search_instructions: str = ""
    schema: type = str
    actions_permitted: tuple = ("create", "update", "delete")

    def __post_init__(self):
        # Validate actions_permitted
        valid_actions = {"create", "update", "delete"}
        if not all(action in valid_actions for action in self.actions_permitted):
            raise ValueError(
                f"Invalid actions_permitted. Must be subset of {valid_actions}"
            )

        # Validate actions_permitted tuple not empty
        if not self.actions_permitted:
            raise ValueError("actions_permitted cannot be empty")


@dataclass
class ShortTermMemoryConfig:
    """Short-term memory configuration (conversation state persistence)

    Args:
        enabled: Whether short-term memory is enabled
        provider: Storage provider override (inherits from global if None)
        connection_string: Database connection string override (inherits from global if None)
    """

    enabled: bool = True
    provider: str | None = None
    connection_string: str | None = None


@dataclass
class LongTermMemoryConfig:
    """Long-term memory configuration (cross-session learning)

    Args:
        enabled: Whether long-term memory is enabled
        provider: Storage provider override (inherits from global if None)
        connection_string: Database connection string override (inherits from global if None)
        index: Vector indexing configuration for semantic search (None = no vector search)
        user_memory: Configuration for user-specific memories
        app_memory: Configuration for application-wide memories
        app_id: Application identifier (required when app_memory.enabled=True)
        search_response_format: Format for search tool responses ("content" or "content_and_artifact")

    Examples:
        # Basic long-term memory without vector search
        LongTermMemoryConfig(enabled=True)

        # With OpenAI embedding for vector search
        LongTermMemoryConfig(
            enabled=True,
            index=IndexConfig(
                dims=1536,
                embed="openai:text-embedding-3-small",
                extra_config={"fields": ["content"]}
            )
        )

        # Multi-app setup with isolated memories
        LongTermMemoryConfig(
            enabled=True,
            app_id="my-app-v1",  # Required for app_memory isolation
            app_memory=MemoryScopeConfig(enabled=True)
        )

    Namespace Design:
        - User memories: ("user_memories", "{user_id}")
          * Isolated per user across all applications
          * user_id comes from LangGraph runtime config

        - App memories: ("app_memories", app_id)
          * Isolated per application
          * app_id is static per application instance
          * Multiple apps can share same database safely

    Multi-Application Support:
        - Same database can host multiple applications
        - User memories are isolated by user_id (from runtime)
        - App memories are isolated by app_id (from config)
        - No cross-contamination between apps or users
    """

    enabled: bool = False
    provider: str | None = None
    connection_string: str | None = None

    # Index configuration - None by default to avoid external dependencies
    index: IndexConfig | None = None

    # Memory scope configurations with default instructions
    user_memory: MemoryScopeConfig = field(
        default_factory=lambda: MemoryScopeConfig(
            enabled=True,
            manage_instructions="Proactively call this tool when you:\n\n"
            "1. Identify a new USER preference, habit, or personal information.\n"
            "2. Receive an explicit USER request to remember something or otherwise alter your behavior.\n"
            "3. Are working and want to record important context specific to this user.\n"
            "4. Identify that an existing USER MEMORY is incorrect or outdated.",
            search_instructions="Proactively call this tool when you:\n\n"
            "1. Need to recall USER preferences, habits, or personal information to provide better responses.\n"
            "2. Are asked about the USER's background, interests, or characteristics.\n"
            "3. Want to personalize your response based on what you know about the USER.\n"
            "4. Need to check if you have relevant context about the USER before asking questions.\n"
            "5. Are introducing or describing the USER based on previous conversations.",
        )
    )
    app_memory: MemoryScopeConfig = field(
        default_factory=lambda: MemoryScopeConfig(
            enabled=False,
            manage_instructions="Proactively call this tool when you:\n\n"
            "1. Learn general knowledge, best practices, or patterns that benefit all users.\n"
            "2. Receive explicit requests to remember application-wide information.\n"
            "3. Identify outdated or incorrect general knowledge in existing memories.\n"
            "4. Want to record important context that applies across different users.\n\n"
            "IMPORTANT: NEVER store user personal information, preferences, or user-specific data here.",
            search_instructions="Proactively call this tool when you:\n\n"
            "1. Need to recall general knowledge, best practices, or patterns that benefit all users.\n"
            "2. Want to check if you have learned something that applies to the current situation.\n"
            "3. Need to verify or update your understanding of general concepts.\n"
            "4. Are looking for application-wide information or context.\n\n"
            "IMPORTANT: This searches application-wide memories only. NEVER search here for user personal information, preferences, or user-specific data.",
        )
    )
    app_id: str | None = None

    # Search tool configuration
    search_response_format: str = "content"

    def __post_init__(self):
        # Validate app_memory requires app_id
        if self.enabled and self.app_memory.enabled and not self.app_id:
            raise ValueError(
                "app_memory.enabled=True requires app_id. "
                "app_id is used to isolate application-wide memories from different applications "
                "in shared databases. Set app_id to a unique identifier for your application "
                "(e.g., 'my-app-v1', 'chatbot-prod', etc.)"
            )

        # Validate app_id format (basic validation)
        if self.app_id and not isinstance(self.app_id, str):
            raise ValueError("app_id must be a string")

        # Validate app_id not empty if provided
        if self.app_id is not None and not self.app_id.strip():
            raise ValueError("app_id cannot be empty string")

        # Validate search_response_format
        valid_formats = {"content", "content_and_artifact"}
        if self.search_response_format not in valid_formats:
            raise ValueError(f"search_response_format must be one of {valid_formats}")


@dataclass
class MemoryConfig:
    """Unified memory configuration for LangCrew

    Args:
        provider: Global storage provider ("memory", "sqlite", "postgres", "redis", "mongodb", "mysql")
        connection_string: Global database connection string
        short_term: Short-term memory configuration (conversation history)
        long_term: Long-term memory configuration (persistent knowledge)

    Examples:
        # Basic in-memory configuration (development)
        MemoryConfig()

        # SQLite with long-term memory
        MemoryConfig(
            provider="sqlite",
            connection_string="sqlite:///memory.db",
            long_term=LongTermMemoryConfig(enabled=True)
        )

        # Multi-application shared database
        MemoryConfig(
            provider="postgres",
            connection_string="postgresql://user:pass@localhost/db",
            long_term=LongTermMemoryConfig(
                enabled=True,
                app_id="my-app-v1",  # Isolates this app's memories
                app_memory=MemoryScopeConfig(enabled=True),
                index=IndexConfig(
                    dims=1536,
                    embed="openai:text-embedding-3-small"
                )
            )
        )

        # Another app using same database (isolated)
        MemoryConfig(
            provider="postgres",
            connection_string="postgresql://user:pass@localhost/db",
            long_term=LongTermMemoryConfig(
                enabled=True,
                app_id="other-app-v2",  # Different app_id = isolated memories
                app_memory=MemoryScopeConfig(enabled=True)
            )
        )
    """

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

    def to_checkpointer_config(self) -> dict[str, Any]:
        """Convert to checkpointer configuration - only if short_term.enabled"""
        if not self.short_term.enabled:
            return {}

        config = {}
        if self.short_term.connection_string or self.connection_string:
            config["connection_string"] = (
                self.short_term.connection_string or self.connection_string
            )
        return config

    def to_store_config(self) -> dict[str, Any]:
        """Convert to store configuration - only if long_term.enabled"""
        if not self.long_term.enabled:
            return {}

        config = {}
        if self.long_term.connection_string or self.connection_string:
            config["connection_string"] = (
                self.long_term.connection_string or self.connection_string
            )
        if self.long_term.index:
            config["index"] = self.long_term.index.to_dict()
        return config

    @classmethod
    def from_dict(cls, config_dict: dict[str, Any]) -> "MemoryConfig":
        """Create config from dictionary"""
        return cls(**config_dict)
