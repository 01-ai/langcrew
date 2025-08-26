"""
Configuration classes for agent context management.

Provides strategies for message history optimization including retention,
compression, and summarization to manage LLM context windows effectively.
"""

from enum import Enum
from typing import Any, Literal, Protocol

from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field


class CompressorProtocol(Protocol):
    """Protocol for message compression implementations.

    Compressors examine messages and apply compression based on content, type, or other factors.
    Must return a new message instance, not modify the original.
    """

    def compress(self, message: BaseMessage) -> BaseMessage:
        """Compress a message if needed.

        Args:
            message: Message to potentially compress

        Returns:
            Original or compressed message with same type and essential attributes.
        """
        ...


class CompressionStrategy(str, Enum):
    """Compression strategy enumeration."""

    KEEP_LAST = "keep_last"
    COMPRESS_TOOLS = "compress_tools"
    SUMMARY = "summary"
    ADAPTIVE_WINDOW = "adaptive_window"


class BaseConfig(BaseModel):
    """Base configuration for all context strategies."""

    execution_context_interval: int = Field(
        default=3,
        ge=0,
        description="Interval for injecting execution context (0 to disable)",
    )


class KeepLastConfig(BaseConfig):
    """Keep only the last N messages in context."""

    strategy: Literal[CompressionStrategy.KEEP_LAST] = Field(
        default=CompressionStrategy.KEEP_LAST,
        frozen=True,
        description="Strategy identifier (immutable)",
    )
    keep_last: int = Field(
        default=25, ge=1, description="Number of recent messages to keep in context"
    )


class AdaptiveWindowConfig(BaseConfig):
    """Keep recent messages within a token budget."""

    strategy: Literal[CompressionStrategy.ADAPTIVE_WINDOW] = Field(
        default=CompressionStrategy.ADAPTIVE_WINDOW,
        frozen=True,
        description="Strategy identifier (immutable)",
    )
    window_size: int = Field(
        default=64000,
        gt=0,
        description="""
    Token budget for context window.
    
    The system will keep as many recent messages as possible within 
    this token limit. This provides predictable performance and cost control.
    
    Note: Test with your actual message patterns to find the optimal size.
    """,
    )


class SummaryConfig(BaseConfig):
    """Summarize old messages while keeping recent ones intact."""

    strategy: Literal[CompressionStrategy.SUMMARY] = Field(
        default=CompressionStrategy.SUMMARY,
        frozen=True,
        description="Strategy identifier (immutable)",
    )
    compression_threshold: int = Field(
        default=150000,
        gt=0,
        description="""
    Token threshold that triggers conversation summarization.
    
    When total tokens exceed this value, older messages are summarized while 
    keeping recent messages (see keep_recent) intact. This prevents context 
    overflow while preserving conversation continuity.
    
    TRADE-OFF CONSIDERATIONS:
    - Higher threshold: Better context retention, less information loss, but 
      slower LLM response and higher costs
    - Lower threshold: Faster responses, lower costs, but more aggressive 
      summarization may lose details
    
    Default: 150,000 (balanced for 200k context models)
    """,
    )
    keep_recent_tokens: int = Field(
        default=64000,
        gt=0,
        description="""
    Token budget for recent messages to keep without summarization.
    
    When summarization is triggered, the most recent messages 
    within this token budget will be preserved intact, while 
    older messages get summarized.
    
    Note: Actual message count varies based on message length.
    """,
    )
    llm: Any | None = Field(
        default=None,
        exclude=True,
        description="LLM instance for summarization (excluded from serialization)",
    )


class CompressToolsConfig(BaseConfig):
    """Compress messages using a custom compressor.

    Example:
        from langcrew.context.tool_call_compressor import ToolCallCompressor
        compressor = ToolCallCompressor(tools=['file_read'], max_length=500)
        config = CompressToolsConfig(compressor=compressor)
    """

    strategy: Literal[CompressionStrategy.COMPRESS_TOOLS] = Field(
        default=CompressionStrategy.COMPRESS_TOOLS,
        frozen=True,
        description="Strategy identifier (immutable)",
    )
    compressor: Any = Field(
        description="Message compressor instance implementing CompressorProtocol",
        exclude=True,  # Exclude from serialization as it's a runtime object
    )
    keep_recent_rounds: int = Field(
        default=1,
        ge=0,
        description="Number of recent tool call rounds to keep uncompressed. Must be at least 1 to preserve tool results that haven't been processed by LLM yet",
    )


# Union type for all context configuration strategies
ContextConfigType = (
    KeepLastConfig | CompressToolsConfig | SummaryConfig | AdaptiveWindowConfig
)


def create_context_config(config_dict: dict[str, Any]) -> ContextConfigType | None:
    """Create context configuration from dictionary based on strategy field."""
    if not config_dict:
        return None

    strategy = config_dict.get("strategy")
    if not strategy:
        raise ValueError("Context config missing 'strategy' field")

    # Convert string to enum if needed
    if isinstance(strategy, str):
        try:
            strategy = CompressionStrategy(strategy)
        except ValueError:
            raise ValueError(f"Unknown strategy: {strategy}")

    # Base configuration that's common to all strategies
    # Note: 'enabled' field is ignored (use None to disable, config object to enable)
    base_config = {}
    if "execution_context_interval" in config_dict:
        base_config["execution_context_interval"] = config_dict[
            "execution_context_interval"
        ]

    # Create clean config dict for Pydantic
    clean_config = {**config_dict, **base_config}
    clean_config.pop("strategy", None)  # Remove strategy as it's set by default

    if strategy == CompressionStrategy.KEEP_LAST:
        return KeepLastConfig(**clean_config)
    elif strategy == CompressionStrategy.COMPRESS_TOOLS:
        return CompressToolsConfig(**clean_config)
    elif strategy == CompressionStrategy.SUMMARY:
        return SummaryConfig(**clean_config)
    elif strategy == CompressionStrategy.ADAPTIVE_WINDOW:
        return AdaptiveWindowConfig(**clean_config)
    else:
        raise ValueError(f"Unknown strategy: {strategy}")


class ContextConfig(BaseModel):
    """Context configuration container for message processing strategies.

    Supports single or multiple strategies applied before model invocation.

    Example:
        config = ContextConfig(
            pre_model=KeepLastConfig(keep_last=20)
        )
    """

    pre_model: list[ContextConfigType] | ContextConfigType | None = Field(
        default=None, description="Context configuration(s) for pre-model hook"
    )
