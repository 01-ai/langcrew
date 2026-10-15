"""Middleware to patch dangling tool calls in the messages history."""

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from langchain.agents.middleware import AgentMiddleware, AgentState
from langchain.tools.tool_node import ToolCallRequest
from langchain_core.messages import ToolMessage
from langchain_core.tools.base import ToolException
from langgraph.runtime import Runtime
from langgraph.types import Command, Overwrite

logger = logging.getLogger(__name__)


class PatchToolCallsMiddleware(AgentMiddleware):
    """Middleware to patch dangling tool calls in the messages history."""

    def before_agent(
        self, state: AgentState, runtime: Runtime[Any]
    ) -> dict[str, Any] | None:  # noqa: ARG002
        """Before the agent runs, handle dangling tool calls from any AIMessage."""
        messages = state["messages"]
        if not messages or len(messages) == 0:
            return None

        patched_messages = []
        # Iterate over the messages and add any dangling tool calls
        for i, msg in enumerate(messages):
            patched_messages.append(msg)
            if msg.type == "ai" and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    corresponding_tool_msg = next(
                        (
                            msg
                            for msg in messages[i:]
                            if msg.type == "tool"
                            and msg.tool_call_id == tool_call["id"]
                        ),
                        None,
                    )
                    if corresponding_tool_msg is None:
                        # We have a dangling tool call which needs a ToolMessage
                        tool_msg = (
                            f"Tool call {tool_call['name']} with id {tool_call['id']} was "
                            "cancelled - another message came in before it could be completed."
                        )
                        patched_messages.append(
                            ToolMessage(
                                content=tool_msg,
                                name=tool_call["name"],
                                tool_call_id=tool_call["id"],
                            )
                        )

        return {"messages": Overwrite(patched_messages)}

    def wrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], ToolMessage | Command],
    ) -> ToolMessage | Command:
        """Handle ToolException gracefully by returning error message instead of raising."""
        try:
            return handler(request)
        except Exception as e:
            tool_name = request.tool_call.get("name", "unknown")
            logger.error(
                f"Tool {tool_name} raised ToolException: {e}",
                exc_info=True,
            )
            # Return error message as ToolMessage, allowing agent to continue
            return ToolMessage(
                content=str(e),
                tool_call_id=request.tool_call["id"],
            )

    async def awrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], Awaitable[ToolMessage | Command]],
    ) -> ToolMessage | Command:
        """Handle ToolException gracefully by returning error message instead of raising."""
        try:
            return await handler(request)
        except ToolException as e:
            tool_name = request.tool_call.get("name", "unknown")
            logger.error(
                f"Tool {tool_name} raised ToolException: {e}",
                exc_info=True,
            )
            # Return error message as ToolMessage, allowing agent to continue
            return ToolMessage(
                content=str(e),
                tool_call_id=request.tool_call["id"],
            )
