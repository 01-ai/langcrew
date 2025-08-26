"""
Tool call compression using string truncation.
"""

import json
import logging

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

logger = logging.getLogger(__name__)


class ToolCallCompressor:
    """
    Compress tool calls in AI messages and tool results using truncation.
    Targets AIMessage.tool_calls arguments and ToolMessage.content.
    """

    def __init__(
        self,
        tools: list[str],
        max_length: int = 1000,
    ):
        self.compressible_tools = set(tools)
        self.max_length = max_length

        logger.info(
            f"ToolCallCompressor initialized: "
            f"tools={self.compressible_tools}, max_length={self.max_length}"
        )

    def compress(self, message: BaseMessage) -> BaseMessage:
        """
        Compress tool calls in AI messages or content in Tool messages.
        Uses string truncation while preserving message structure.
        """
        # Check if this is an AI message with tool calls for compressible tools
        if isinstance(message, AIMessage) and message.tool_calls:
            compressed_tool_calls = []
            has_compression = False

            for tc in message.tool_calls:
                compressed_tc = tc  # Default to original value

                if tc.get("name") in self.compressible_tools and "args" in tc:
                    has_compression = True
                    compressed_tc = tc.copy()
                    compressed_tc["args"] = self._compress_tool_args(
                        tc["args"], self.max_length
                    )

                compressed_tool_calls.append(compressed_tc)

            # Only create new message if compression actually occurred
            if has_compression:
                # Also compress the AI message content if it's a string
                compressed_content = message.content
                if isinstance(message.content, str):
                    compressed_content = self._truncate_safely(
                        message.content, self.max_length
                    )
                return message.model_copy(
                    update={
                        "content": compressed_content,
                        "tool_calls": compressed_tool_calls,
                    }
                )

        # Check if this is a tool result message - always compress these
        elif isinstance(message, ToolMessage) and message.content:
            compressed_content = self._compress_tool_content(
                message.content, self.max_length
            )
            return message.model_copy(update={"content": compressed_content})

        # Return message unchanged if no compression is needed
        return message

    def _compress_tool_args(self, args: dict | list, max_length: int) -> dict | list:
        """Recursively truncate strings in tool arguments."""
        if isinstance(args, dict):
            # Recursively process dictionary
            compressed = {}
            for key, value in args.items():
                if isinstance(value, str):
                    compressed[key] = self._truncate_safely(value, max_length)
                elif isinstance(value, dict | list):
                    compressed[key] = self._compress_tool_args(value, max_length)
                else:
                    compressed[key] = value
            return compressed
        else:  # isinstance(args, list)
            # Recursively process list
            compressed = []
            for item in args:
                if isinstance(item, str):
                    compressed.append(self._truncate_safely(item, max_length))
                elif isinstance(item, dict | list):
                    compressed.append(self._compress_tool_args(item, max_length))
                else:
                    compressed.append(item)
            return compressed

    def _compress_tool_content(
        self, content: str | dict | list, max_length: int
    ) -> str:
        """Convert content to string and truncate."""
        if isinstance(content, str):
            # Directly truncate string content
            return self._truncate_safely(content, max_length)
        else:  # isinstance(content, dict | list)
            # Serialize to JSON then truncate
            try:
                json_str = json.dumps(content, ensure_ascii=False)
                return self._truncate_safely(json_str, max_length)
            except (TypeError, ValueError) as e:
                # If serialization fails, convert to string and truncate
                logger.warning(f"Failed to serialize content to JSON: {e}")
                return self._truncate_safely(str(content), max_length)

    def _truncate_safely(self, content: str, max_length: int) -> str:
        """Truncate string, preserving start and end with truncation info in middle."""
        # Early return: no truncation needed
        if len(content) <= max_length:
            return content

        original_length = len(content)

        # Reserve space for truncation message
        TRUNCATION_MSG_RESERVE = 50
        START_END_RATIO = 0.7  # 70% start, 30% end

        if max_length < TRUNCATION_MSG_RESERVE:
            # For very small limits, just truncate without any marker
            return content[:max_length]

        # Calculate content distribution
        available_for_content = max_length - TRUNCATION_MSG_RESERVE
        start_length = int(available_for_content * START_END_RATIO)
        end_length = available_for_content - start_length
        omitted_length = original_length - start_length - end_length

        # Extract content segments
        start_part = content[:start_length]
        end_part = content[-end_length:] if end_length > 0 else ""

        # Generate truncation info
        truncation_info = f"\n[...{omitted_length} chars omitted...]\n"

        # Assemble final result
        return start_part + truncation_info + end_part
