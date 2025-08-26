"""
Message processing operations for context management.
"""

import logging
from collections.abc import Sequence

from langchain_core.language_models import BaseLanguageModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.messages.modifier import RemoveMessage

from .config import CompressorProtocol
from .token_utils import count_message_tokens

logger = logging.getLogger(__name__)


class MessageProcessor:
    """Operations for message history management including trimming, compression, and summarization."""

    def keep_last_n(self, messages: list[BaseMessage], n: int) -> list[BaseMessage]:
        """
        Keep last N messages, preserving AI+Tool pairs integrity.
        Returns RemoveMessage operations for deleted messages plus kept messages.
        """
        if len(messages) <= n:
            return messages

        cutoff_index = self._find_safe_cutoff_point(messages, n)

        # Generate RemoveMessage operations for deleted messages
        messages_to_remove = messages[:cutoff_index]
        kept_messages = messages[cutoff_index:]

        # Build delete operations for messages with IDs
        delete_messages = [
            RemoveMessage(id=m.id) for m in messages_to_remove if m.id is not None
        ]

        # Combine delete operations with kept messages
        final_messages = delete_messages + kept_messages

        logger.info(
            f"keep_last_n: {len(messages)} -> {len(kept_messages)} messages kept, "
            f"{len(messages_to_remove)} messages removed"
        )

        return final_messages

    def adaptive_window_trim(
        self,
        messages: list[BaseMessage],
        window_size: int,
        llm: BaseLanguageModel | None = None,
    ) -> list[BaseMessage]:
        """Fit as many recent messages as possible within token budget."""
        if not messages:
            return messages

        # Simple approach: fit as many recent messages as possible within budget
        selected = []
        current_tokens = 0

        # Start from most recent and work backwards
        for msg in reversed(messages):
            msg_tokens = count_message_tokens([msg], llm)

            if current_tokens + msg_tokens <= window_size:
                selected.insert(
                    0, msg
                )  # Insert at beginning to maintain chronological order
                current_tokens += msg_tokens
            else:
                # Would exceed budget, stop here
                break

        # Validate message integrity (AI+Tool pairs)
        self._validate_chat_history(selected)

        # Generate RemoveMessage operations for deleted messages (like keep_last_n)
        messages_to_remove = [msg for msg in messages if msg not in selected]

        # Build delete operations for messages with IDs
        delete_messages = [
            RemoveMessage(id=m.id) for m in messages_to_remove if m.id is not None
        ]

        # Combine delete operations with selected messages
        final_messages = delete_messages + selected

        logger.info(
            f"Adaptive window trim: {len(messages)} -> {len(selected)} messages "
            f"using {current_tokens}/{window_size} tokens, {len(messages_to_remove)} messages removed"
        )

        return final_messages

    def compress_earlier_tool_rounds(
        self,
        messages: list[BaseMessage],
        compressor: CompressorProtocol,
        keep_recent_rounds: int = 1,
    ) -> list[BaseMessage]:
        """
        Compress earlier tool call rounds while preserving recent rounds.
        Non-tool messages remain unchanged.
        """
        if not messages:
            return messages

        # Identify all tool call rounds
        all_rounds = self._identify_rounds(messages)

        if not all_rounds:
            # No tool call rounds found, return messages without compression
            logger.info(
                f"No tool call rounds found with keep_recent_rounds={keep_recent_rounds}, "
                "returning messages without compression"
            )
            return messages

        # Check if we need to protect all rounds
        if len(all_rounds) <= keep_recent_rounds:
            # All rounds are protected, no compression needed
            logger.info(
                f"All {len(all_rounds)} rounds are protected (keep_recent_rounds={keep_recent_rounds}), "
                "returning messages without compression"
            )
            return messages

        # Calculate which rounds to compress
        rounds_to_compress = (
            all_rounds[:-keep_recent_rounds] if keep_recent_rounds > 0 else all_rounds
        )

        # Collect indices of messages that need compression
        indices_to_compress = set()
        for round_indices in rounds_to_compress:
            indices_to_compress.update(round_indices)

        logger.info(
            f"Compressing {len(indices_to_compress)} messages from {len(rounds_to_compress)} earlier rounds, "
            f"keeping {len(all_rounds) - len(rounds_to_compress)} recent rounds intact"
        )

        # Apply compression only to messages in earlier tool rounds
        compressed_messages = []
        for i, msg in enumerate(messages):
            if i in indices_to_compress:
                # This is an earlier tool round message, apply compression
                compressed_messages.append(compressor.compress(msg))
            else:
                # Keep message unchanged (recent rounds or regular messages)
                compressed_messages.append(msg)

        # Validate message integrity after compression
        self._validate_chat_history(compressed_messages)

        logger.info(
            f"Successfully compressed {len(rounds_to_compress)} earlier tool rounds, "
            f"validation passed for all tool calls"
        )

        return compressed_messages

    def summarize_and_trim(
        self,
        messages: list[BaseMessage],
        keep_recent_tokens: int,
        llm: BaseLanguageModel,
        running_summary: str | None = None,
    ) -> dict:
        """
        Summarize older messages while keeping recent ones within token budget.
        Returns dict with 'messages' (including RemoveMessage ops) and 'running_summary'.
        """
        if not llm:
            raise ValueError("LLM is required for conversation summarization")

        prep_data = self._prepare_summarization_data(
            messages, keep_recent_tokens, running_summary, llm
        )

        if not prep_data:
            return {"messages": messages, "running_summary": running_summary}

        # Generate summary using sync LLM call
        response = llm.invoke(prep_data["messages_for_llm"])

        result = self._build_summarization_result(prep_data, response)
        if result is None:
            # Failed to generate summary, return original state
            return {"messages": messages, "running_summary": running_summary}

        return result

    async def asummarize_and_trim(
        self,
        messages: list[BaseMessage],
        keep_recent_tokens: int,
        llm: BaseLanguageModel,
        running_summary: str | None = None,
    ) -> dict:
        """Async version of summarize_and_trim."""
        if not llm:
            raise ValueError("LLM is required for conversation summarization")

        prep_data = self._prepare_summarization_data(
            messages, keep_recent_tokens, running_summary, llm
        )

        if not prep_data:
            return {"messages": messages, "running_summary": running_summary}

        # Generate summary using async LLM call
        response = await llm.ainvoke(prep_data["messages_for_llm"])

        result = self._build_summarization_result(prep_data, response)
        if result is None:
            # Failed to generate summary, return original state
            return {"messages": messages, "running_summary": running_summary}

        return result

    def _prepare_summarization_data(
        self,
        messages: list[BaseMessage],
        keep_recent_tokens: int,
        running_summary: str | None = None,
        llm: BaseLanguageModel | None = None,
    ) -> dict | None:
        """Prepare data for summarization. Returns None if no messages to summarize."""

        # Find recent messages based on token budget
        messages_to_summarize, recent_messages = self._find_recent_messages_by_tokens(
            messages, keep_recent_tokens, llm
        )

        # Only prepare if there are messages to process
        if not messages_to_summarize:
            logger.info("No messages to summarize")
            return None

        # Generate summarization prompt
        if running_summary:
            # A summary already exists, extend it
            summary_prompt = (
                f"This is a summary of the conversation to date: {running_summary}\n\n"
                "Extend the summary by taking into account the new messages above.\n"
                "IMPORTANT: You must preserve:\n"
                "1. The user's original request and task objectives\n"
                "2. The original plan that was specified at the beginning\n"
                "3. All file paths that were created, modified, or mentioned\n"
                "4. The current task plan and progress\n"
                "5. Key results and outputs\n"
                "Please respond in the same language as the messages above.\n"
                "Extend the summary:"
            )
        else:
            summary_prompt = (
                "Create a comprehensive summary of the conversation above.\n"
                "IMPORTANT: You must include:\n"
                "1. The user's original request and task objectives\n"
                "2. The original plan that was specified at the beginning\n"
                "3. All file paths that were created, modified, or mentioned\n"
                "4. The task plan and current progress\n"
                "5. Key results and outputs\n"
                "Please respond in the same language as the messages above.\n"
                "Create the summary:"
            )

        messages_for_llm = messages_to_summarize + [
            HumanMessage(content=summary_prompt)
        ]

        return {
            "messages_to_summarize": messages_to_summarize,
            "recent_messages": recent_messages,
            "messages_for_llm": messages_for_llm,
        }

    def _build_summarization_result(self, prep_data: dict, response) -> dict:
        """Build final result with RemoveMessage ops, summary message, and updated summary."""
        summary_content = response.content if response.content else ""
        if not summary_content:
            logger.error("Failed to generate summary")
            return None

        # Return the summary string directly
        updated_running_summary = summary_content

        # Build final message list
        delete_messages = [
            RemoveMessage(id=m.id)
            for m in prep_data["messages_to_summarize"]
            if m.id is not None
        ]

        # Create summary message inline
        formatted_content = (
            f"[System Message: This is an auto-generated conversation summary. "
            f"Please inform the user that 'Due to the conversation length exceeding context limits, "
            f"the system has automatically summarized your conversation to maintain optimal performance.' "
            f"Then continue with the task]\n\n"
            f"Previous conversation summary:\n{summary_content}"
        )
        summary_message = HumanMessage(content=formatted_content)

        # Put summary before recent messages to maintain chronological order
        final_messages = (
            delete_messages + [summary_message] + prep_data["recent_messages"]
        )

        # Final validation to ensure chat history integrity
        self._validate_chat_history(final_messages)

        return {
            "messages": final_messages,
            "running_summary": updated_running_summary,
        }

    def _identify_rounds(self, messages: list[BaseMessage]) -> list[list[int]]:
        """Identify AI+Tool message rounds. Returns list of index lists."""
        rounds = []
        i = 0
        while i < len(messages):
            msg = messages[i]

            # Check if this is an AI message with tool calls
            if isinstance(msg, AIMessage) and msg.tool_calls:
                tool_indices = []
                j = i + 1

                # Collect all consecutive ToolMessages
                while j < len(messages) and isinstance(messages[j], ToolMessage):
                    tool_indices.append(j)
                    j += 1

                if not tool_indices:
                    raise ValueError(
                        f"AI message at index {i} has tool_calls but no ToolMessage follows. "
                        f"Expected at least one ToolMessage."
                    )

                # A round includes the AI message and all its tool messages
                round_indices = [i] + tool_indices
                rounds.append(round_indices)
                i = j
            else:
                i += 1

        return rounds

    def _validate_chat_history(self, messages: Sequence[BaseMessage]) -> None:
        """Validate all tool calls have corresponding ToolMessages."""
        all_tool_calls = [
            tool_call
            for message in messages
            if isinstance(message, AIMessage)
            for tool_call in message.tool_calls
        ]
        tool_call_ids_with_results = {
            message.tool_call_id
            for message in messages
            if isinstance(message, ToolMessage)
        }
        tool_calls_without_results = [
            tool_call
            for tool_call in all_tool_calls
            if tool_call["id"] not in tool_call_ids_with_results
        ]
        if not tool_calls_without_results:
            return

        error_message = (
            "Found AIMessages with tool_calls that do not have a corresponding ToolMessage. "
            f"Here are the first few of those tool calls: {tool_calls_without_results[:3]}.\n\n"
            "Every tool call (LLM requesting to call a tool) in the message history MUST have a corresponding ToolMessage "
            "(result of a tool invocation to return to the LLM) - this is required by most LLM providers."
        )
        raise ValueError(error_message)

    def _find_safe_cutoff_point(
        self, messages: list[BaseMessage], keep_count: int
    ) -> int:
        """Find cutoff point that preserves AI+Tool message pairs."""
        if len(messages) <= keep_count:
            return 0  # Keep all messages by returning 0 as cutoff

        # Special case: if keep_count is 0, return len(messages) to keep nothing
        if keep_count == 0:
            return len(messages)

        # Preserve system message (if exists)
        start_index = 0
        if messages and isinstance(messages[0], SystemMessage):
            start_index = 1
            keep_count = max(
                1, keep_count - 1
            )  # Reduce the number to keep, as system message is always preserved

        # Start with the naive cutoff point
        cutoff_index = max(start_index, len(messages) - keep_count)

        # Try different cutoff points until we find one that passes validation
        while cutoff_index > start_index:
            try:
                # Test if this cutoff would result in valid message history
                test_messages = messages[cutoff_index:]
                self._validate_chat_history(test_messages)
                # If validation passes, this cutoff is safe
                return cutoff_index
            except ValueError:
                # Validation failed, try moving cutoff earlier
                cutoff_index -= 1

        # If we reach here, return the minimum safe index
        return start_index

    def _find_recent_messages_by_tokens(
        self,
        messages: list[BaseMessage],
        token_budget: int,
        llm: BaseLanguageModel | None = None,
    ) -> tuple[list[BaseMessage], list[BaseMessage]]:
        """Split messages by token budget. Returns (to_summarize, to_keep)."""
        if not messages:
            return messages, []

        recent_messages = []
        current_tokens = 0

        # Start from most recent and work backwards
        for msg in reversed(messages):
            msg_tokens = count_message_tokens([msg], llm)

            if current_tokens + msg_tokens <= token_budget:
                recent_messages.insert(0, msg)  # Insert at beginning to maintain order
                current_tokens += msg_tokens
            else:
                break

        # Split messages
        split_index = len(messages) - len(recent_messages)
        to_summarize = messages[:split_index]
        to_keep = messages[split_index:]

        # Validate message integrity
        if to_keep:
            self._validate_chat_history(to_keep)

        return to_summarize, to_keep
