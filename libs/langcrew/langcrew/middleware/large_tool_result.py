"""Middleware for handling large tool results.

This middleware intercepts tool call results and stores large results to the filesystem
to avoid context overflow, providing a preview and instructions for accessing the full result.
"""

import logging
from collections.abc import Awaitable, Callable
from dataclasses import replace

from langchain.agents.middleware.types import AgentMiddleware
from langchain.tools.tool_node import ToolCallRequest
from langchain_core.language_models import BaseLanguageModel
from langchain_core.messages import ToolMessage
from langgraph.errors import GraphInterrupt
from langgraph.types import Command

from ..utils.token_utils import count_message_tokens
from .protocols import FilesystemBackend
from .utils import format_content_with_line_numbers, sanitize_tool_call_id

logger = logging.getLogger(__name__)

TOO_LARGE_TOOL_MSG = """Tool result too large, the result of this tool call {tool_call_id} was saved in the filesystem at this path: {file_path}
You can read the result from the filesystem by using the read_file tool, but make sure to only read part of the result at a time.
You can do this by specifying an offset and limit in the read_file tool call.
For example, to read the first 100 lines, you can use the read_file tool with offset=0 and limit=100.

Here are the first 10 lines of the result:
{content_sample}
"""


class LargeToolResultMiddleware(AgentMiddleware):
    """Middleware to intercept and store large tool results to filesystem.

    This middleware monitors tool call results and automatically stores results
    that exceed the token limit to the filesystem, returning a preview and
    instructions for the LLM to access the full result.

    Args:
        backend: FilesystemBackend instance for file operations
        token_limit: Maximum tokens before evicting to filesystem (default: 20000)
        llm: Optional LLM instance for accurate token counting
    """

    def __init__(
        self,
        backend: FilesystemBackend,
        token_limit: int = 20000,
        llm: BaseLanguageModel | None = None,
    ):
        """Initialize the middleware.

        Args:
            backend: Filesystem backend for storing large results
            token_limit: Token threshold for eviction (default: 20000)
            llm: Optional LLM for accurate token counting (uses model name)
        """
        self.backend = backend
        self.token_limit = token_limit
        self.llm = llm

        # Keep char_limit as fallback for backward compatibility
        self._char_limit = token_limit * 4  # Rough estimate: 4 chars per token

        # Log initialization
        model_info = (
            "with accurate token counting" if llm else "with character-based estimate"
        )
        logger.info(
            f"LargeToolResultMiddleware initialized: token_limit={token_limit}, {model_info}"
        )

    def wrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], ToolMessage | Command],
    ) -> ToolMessage | Command:
        """Synchronous wrapper - not supported for async operations.

        This middleware requires async operations to write to the filesystem.
        Use awrap_tool_call instead.
        """
        # For sync calls, just pass through - we can't do async file operations here
        return handler(request)

    async def awrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], Awaitable[ToolMessage | Command]],
    ) -> ToolMessage | Command:
        """Async wrapper that intercepts large tool results.

        Args:
            request: The tool call request
            handler: The handler to call for executing the tool

        Returns:
            ToolMessage or Command with potentially evicted result
        """
        # Execute the tool
        try:
            tool_result = await handler(request)
        except GraphInterrupt:
                # GraphInterrupt is a normal HITL mechanism, not an error
                raise
        except Exception as e:
            tool_result = self._create_error_message(e, request)

        # Intercept and process if large
        return await self._intercept_large_tool_result(tool_result)

    def _create_error_message(self, e: Exception, request):
        error_msg = (
            f"Tool execution error: {str(e)}\n\nPlease check your input and try again."
        )
        if isinstance(e, ValueError):
            error_msg = f"Invalid parameter usage: {str(e)}\n\nPlease adjust your parameters and retry."
        elif isinstance(e, FileNotFoundError):
            error_msg = f"File not found: {str(e)}\n\nPlease check the file path."

        return ToolMessage(
            content=error_msg, tool_call_id=request.tool_call["id"], status="error"
        )
        
    async def _intercept_large_tool_result(
        self, tool_result: ToolMessage | Command
    ) -> ToolMessage | Command:
        if isinstance(tool_result, ToolMessage) and isinstance(
            tool_result.content, str
        ):
            # Use accurate token counting if LLM is available
            if self.llm:
                token_count = count_message_tokens([tool_result], llm=self.llm)
                is_large = self.token_limit and token_count > self.token_limit
                logger.info(
                    f"Tool result size check: token_count={token_count}, "
                    f"is_large={is_large}, tool_call_id={tool_result.tool_call_id}"
                )
            else:
                # Fallback to character-based estimate
                is_large = (
                    self.token_limit and len(tool_result.content) > self._char_limit
                )
                logger.info(
                    f"Tool result size check: char_length={len(tool_result.content)}, "
                    f"is_large={is_large}, tool_call_id={tool_result.tool_call_id}"
                )

            if not is_large:
                return tool_result

            processed_message = await self._process_large_message(
                tool_result,
            )
            return processed_message

        if isinstance(tool_result, Command):
            update = tool_result.update
            if update is None:
                return tool_result
            command_messages = update.get("messages", [])
            processed_messages = []
            for message in command_messages:
                # Use accurate token counting if LLM is available
                if (
                    self.llm
                    and isinstance(message, ToolMessage)
                    and isinstance(message.content, str)
                ):
                    token_count = count_message_tokens([message], llm=self.llm)
                    is_large = self.token_limit and token_count > self.token_limit
                else:
                    # Fallback to character-based estimate
                    is_large = (
                        self.token_limit
                        and isinstance(message, ToolMessage)
                        and isinstance(message.content, str)
                        and len(message.content) > self._char_limit
                    )

                if not is_large:
                    processed_messages.append(message)
                    continue

                processed_message = await self._process_large_message(
                    message,
                )
                processed_messages.append(processed_message)
            return replace(
                tool_result,
                update={**update, "messages": processed_messages},
            )

        return tool_result

    async def _process_large_message(
        self,
        message: ToolMessage,
    ) -> ToolMessage:
        content = message.content
        if not isinstance(content, str) or len(content) <= self._char_limit:
            return message

        sanitized_id = sanitize_tool_call_id(message.tool_call_id)
        file_path = f"/large_tool_results/{sanitized_id}"

        logger.info(
            f"Evicting large tool result to filesystem: "
            f"tool_call_id={message.tool_call_id}, "
            f"file_path={file_path}, "
            f"content_size={len(content)}"
        )

        await self.backend.write(file_path, content)
        content_sample = format_content_with_line_numbers(
            [line[:1000] for line in content.splitlines()[:10]], start_line=1
        )
        processed_message = message.model_copy(
            update={
                "content": TOO_LARGE_TOOL_MSG.format(
                    tool_call_id=message.tool_call_id,
                    file_path=file_path,
                    content_sample=content_sample,
                )
            }
        )
        return processed_message
