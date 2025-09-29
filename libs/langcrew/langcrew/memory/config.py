"""Memory configuration for LangCrew Memory System"""

from dataclasses import dataclass, field
from typing import Any

from langgraph.store.base import IndexConfig


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

    🚀 QUICK START - 4 Common Configurations:

    1. DEVELOPMENT (Basic user memory, no app isolation):
        LongTermMemoryConfig(
            enabled=True
            # app_id is optional but RECOMMENDED for production
        )

    2. SIMPLE (User memory with app isolation):
        LongTermMemoryConfig(
            enabled=True,
            app_id="my-app-dev"  # RECOMMENDED! Your app identifier, prevents data mixing
        )

    3. PRODUCTION (User memory with semantic search):
        LongTermMemoryConfig(
            enabled=True,
            app_id="my-app-prod",  # RECOMMENDED! Your app identifier, prevents data mixing
            index=IndexConfig(
                dims=1536,
                embed="openai:text-embedding-3-small"
            )
        )

    4. MULTI-TENANT (User memory with experimental app insights):
        LongTermMemoryConfig(
            enabled=True,
            app_id="saas-app-v1",  # RECOMMENDED! Your app identifier, prevents data mixing
            app_memory=MemoryScopeConfig(enabled=True),  # ⚠️ EXPERIMENTAL: Shared insights
            index=IndexConfig(
                dims=1536,
                embed="openai:text-embedding-3-small"
            )
        )

    PARAMETERS:
        enabled: Enable/disable long-term memory
        app_id: Your application identifier (OPTIONAL but RECOMMENDED for production)
        index: Vector search config (None = no semantic search)
        user_memory: User-specific memories (enabled by default)
        app_memory: Application-wide shared memories (disabled by default)
        provider: Storage override (inherits from global if None)
        connection_string: Database connection override (inherits from global if None)
        search_response_format: Search result format ("content" or "content_and_artifact")

    MEMORY TYPES:
        - user_memory: Personal user preferences/info (enabled by default)
        - app_memory: ⚠️ EXPERIMENTAL - Shared application insights across all users (disabled by default)

    IMPORTANT:
        - app_id is OPTIONAL but STRONGLY RECOMMENDED for production use
        - app_id prevents data mixing between different applications in shared databases
        - Use unique app_id like "my-app-v1", "chatbot-prod", etc.
        - Without app_id, memories lack application-level namespace isolation

    DATA ISOLATION:
        - With app_id: User memories: ("user_memories", app_id, "{user_id}"), App memories: ("app_memories", app_id)
        - Without app_id: User memories: ("user_memories", "{user_id}"), App memories: ("app_memories",)
        - Complete isolation: App A's user "123" != App B's user "123" (only when app_id is set)
    """

    enabled: bool = False
    provider: str | None = None
    connection_string: str | None = None

    # Index configuration - None by default to avoid external dependencies
    index: IndexConfig | None = None

    app_id: str | None = None

    # Memory scope configurations with default instructions
    user_memory: MemoryScopeConfig = field(
        default_factory=lambda: MemoryScopeConfig(
            enabled=True,
            manage_instructions="Call this tool when you:\n\n"
            "1. User expresses preferences (I like/love/enjoy/prefer, I don't like/hate)\n"
            "2. User shares personal information (job, location, hobbies, goals)\n"
            "3. User explicitly asks you to remember something\n"
            "4. User corrects or updates previous information about themselves\n"
            "5. User mentions habits, routines, or repeated behaviors\n"
            "6. You need to record important context specific to this user\n\n"
            "Examples: 'I love pizza', 'I work as a teacher', 'Remember I'm vegetarian', 'I'm learning guitar'",
            search_instructions="Call this tool when you:\n\n"
            "1. User asks about their own preferences, interests, or background\n"
            "2. User asks for personalized recommendations or advice\n"
            "3. You need to tailor your response based on what you know about the user\n"
            "4. User asks 'What do you know about me?' or similar questions\n"
            "5. You want to reference previous conversations or user context\n\n"
            "Examples: 'What do I like?', 'Recommend something for me', 'What are my hobbies?'",
        )
    )
    app_memory: MemoryScopeConfig = field(
        default_factory=lambda: MemoryScopeConfig(
            enabled=False,
            manage_instructions="⚠️  EXPERIMENTAL FEATURE - Use with caution ⚠️\n\n"
            "This tool stores application-wide insights that benefit all users. "
            "It learns from user interaction patterns to make the assistant smarter over time.\n\n"
            "Proactively call this tool when you:\n\n"
            "1. Discover user behavior patterns that could improve assistance (e.g., 'Users often need help with X after doing Y').\n"
            "2. Learn effective assistance strategies that work well across different users.\n"
            "3. Identify common user pain points, confusion areas, or workflow patterns.\n"
            "4. Record successful problem-solving approaches that benefit multiple users.\n"
            "5. Notice application feature usage trends or optimization opportunities.\n\n"
            "STORE APPLICATION-LEVEL INSIGHTS LIKE:\n"
            "- 'Most users struggle with feature A, explaining B first helps'\n"
            "- 'When users ask about X, they usually also need guidance on Y'\n"
            "- 'Common workflow pattern: users do step 1 → step 2 → step 3'\n\n"
            "⚠️  CRITICAL BOUNDARIES (EXPERIMENTAL - Monitor carefully):\n"
            "- NEVER store individual user data, preferences, or personal information\n"
            "- ONLY store aggregated insights and patterns that benefit all users\n"
            "- Focus on improving application-wide assistance effectiveness\n"
            "- This feature is experimental and should be monitored for appropriate usage",
            search_instructions="⚠️  EXPERIMENTAL FEATURE - Use with caution ⚠️\n\n"
            "This searches application-wide insights to help you assist users more effectively.\n\n"
            "Proactively call this tool when you:\n\n"
            "1. Encountering a user situation that might have common patterns or proven solutions.\n"
            "2. Looking for effective assistance strategies for similar scenarios.\n"
            "3. Needing insights about typical user workflows or expectations.\n"
            "4. Wanting to provide better help based on accumulated application knowledge.\n\n"
            "⚠️  EXPERIMENTAL: This feature learns from user patterns to improve assistance. "
            "Monitor usage to ensure it only accesses application-level insights, not personal data.",
        )
    )

    # Search tool configuration
    search_response_format: str = "content"

    def __post_init__(self):
        # Note: app_id is now optional but recommended for production use
        # When app_id is not provided, memories won't have app-level namespace isolation

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

        # Development: Basic setup without app isolation
        MemoryConfig(
            provider="sqlite",
            connection_string="sqlite:///memory.db",
            long_term=LongTermMemoryConfig(enabled=True)
            # No app_id: memories stored without app-level namespace
        )

        # Multi-application shared database with isolation
        MemoryConfig(
            provider="postgres",
            connection_string="postgresql://user:pass@localhost/db",
            long_term=LongTermMemoryConfig(
                enabled=True,
                app_id="my-app-v1",  # RECOMMENDED: Isolates ALL memories (user + app)
                app_memory=MemoryScopeConfig(enabled=True),
                index=IndexConfig(
                    dims=1536,
                    embed="openai:text-embedding-3-small"
                )
            )
        )

        # Another app using same database (completely isolated)
        MemoryConfig(
            provider="postgres",
            connection_string="postgresql://user:pass@localhost/db",
            long_term=LongTermMemoryConfig(
                enabled=True,
                app_id="other-app-v2",  # Different app_id = completely isolated
                app_memory=MemoryScopeConfig(enabled=True)
                # With app_id, user "alice" memories are separate between apps:
                # App 1: ("user_memories", "my-app-v1", "alice")
                # App 2: ("user_memories", "other-app-v2", "alice")
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
            config["index"] = self.long_term.index
        return config

    @classmethod
    def from_dict(cls, config_dict: dict[str, Any]) -> "MemoryConfig":
        """Create config from dictionary"""
        return cls(**config_dict)
