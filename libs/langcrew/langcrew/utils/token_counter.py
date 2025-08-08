"""Token counting utilities for LLM models."""

import logging

import tiktoken
from langchain_core.messages import BaseMessage
from langchain_core.messages.utils import count_tokens_approximately

logger = logging.getLogger(__name__)

# Unified token limit for truncation
TOKEN_LIMIT = 64000

# Unified maximum token limit for user context
MAX_TOKEN_LIMIT = 150000


class TokenCounter:
    """Unified token counter supporting GPT-4.1 and Claude 3.7"""

    def __init__(self, model_name: str, llm=None):
        self.model_name = model_name.lower()
        self.llm = llm
        self._encoding = None

    @property
    def encoding(self):
        """Load the tiktoken encoder"""
        if self._encoding is None:
            self._encoding = tiktoken.get_encoding("o200k_base")
        return self._encoding

    def count_messages(self, messages: list[BaseMessage]) -> tuple[int, bool]:
        """
        Count tokens in messages

        Returns:
            tuple: (token_count, is_exact)
                - token_count: number of tokens
                - is_exact: whether the count is exact
        """
        if "gpt" in self.model_name:
            return self._count_gpt_tokens(messages), True
        else:  # claude
            return self._estimate_claude_tokens(messages), False

    def _count_gpt_tokens(self, messages: list[BaseMessage]) -> int:
        """Exact token counting for GPT-4.1"""
        try:
            # Prioritize using the LLM's built-in method
            if self.llm and hasattr(self.llm, "get_num_tokens_from_messages"):
                return self.llm.get_num_tokens_from_messages(messages)

            # Use tiktoken for direct calculation
            if self.encoding is not None:
                total_tokens = 0
                for msg in messages:
                    if hasattr(msg, "content"):
                        total_tokens += len(self.encoding.encode(str(msg.content)))
                    # Message metadata overhead
                    total_tokens += 4

                return total_tokens

        except Exception as e:
            logger.warning(
                f"GPT token calculation failed: {e}, falling back to approximate"
            )

        # Fall back to approximate calculation
        if count_tokens_approximately:
            return count_tokens_approximately(messages)
        else:
            # If even approximate calculation is unavailable, use rough estimation
            total_chars = sum(
                len(str(msg.content)) for msg in messages if hasattr(msg, "content")
            )
            return int(total_chars / 4)  # Rough estimate: ~1 token per 4 characters

    def _estimate_claude_tokens(self, messages: list[BaseMessage]) -> int:
        """Token estimation for Claude 3.7 (using OpenAI tokenizer)"""
        try:
            # Use tiktoken for estimation
            if self.encoding is not None:
                total_tokens = 0
                for msg in messages:
                    if hasattr(msg, "content"):
                        total_tokens += len(self.encoding.encode(str(msg.content)))
                    # Message metadata overhead
                    total_tokens += 4

                # Add 10% buffer for Claude format differences
                return int(total_tokens * 1.1)

        except Exception as e:
            logger.warning(
                f"Claude token estimation failed: {e}, falling back to approximate"
            )

        # Fall back to approximate calculation
        if count_tokens_approximately:
            return count_tokens_approximately(messages)
        else:
            # If even approximate calculation is unavailable, use rough estimation
            total_chars = sum(
                len(str(msg.content)) for msg in messages if hasattr(msg, "content")
            )
            # Claude typically uses slightly more tokens than GPT, so divide by 3.5 instead of 4
            return int(total_chars / 3.5 * 1.1)  # Rough estimate + 10% buffer
