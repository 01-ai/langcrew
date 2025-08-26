"""
Context Management for LangCrew

Provides context management and message processing strategies for agents.

Key Features:
- Configurable message processing strategies
- Message retention, compression, and summarization
- Flexible hook-based architecture

Basic Usage:
```python
from langcrew.context import ContextConfig, KeepLastConfig

# Configure agent to keep only recent messages
context_config = ContextConfig(
    pre_model=KeepLastConfig(keep_last=20)
)
```

For detailed usage, see individual module documentation.
"""

from .config import (
    CompressToolsConfig,
    ContextConfig,
    ContextConfigType,
    KeepLastConfig,
    SummaryConfig,
)
from .hooks import create_context_hooks
from .processor import MessageProcessor
from .tool_call_compressor import ToolCallCompressor

__all__ = [
    # Configuration classes
    "ContextConfig",
    "ContextConfigType",
    "KeepLastConfig",
    "CompressToolsConfig",
    "SummaryConfig",
    # Processing utilities
    "MessageProcessor",
    "ToolCallCompressor",
    # Internal (exported for agent.py usage)
    "create_context_hooks",
]
