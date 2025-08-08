import asyncio
from typing import Any

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.tools import BaseTool
from langgraph.types import interrupt

from .config import HITLConfig


class HITLToolWrapper:
    """Tool wrapper that adds approval logic to specified tools"""

    def __init__(self, hitl_config: HITLConfig):
        self.hitl_config = hitl_config

    def wrap_tools(self, tools: list[BaseTool]) -> list[BaseTool]:
        """Wrap tools that require approval"""
        wrapped_tools = []
        for tool in tools:
            if self.hitl_config.should_approve_tool(tool.name):
                wrapped_tools.append(self._create_approval_tool(tool))
            else:
                wrapped_tools.append(tool)

        return wrapped_tools

    def _create_approval_tool(self, original_tool: BaseTool) -> BaseTool:
        """Create approval wrapper for a single tool"""

        class ApprovalWrappedTool(BaseTool):
            name: str = original_tool.name
            description: str = original_tool.description

            def _run(self, **kwargs) -> Any:
                """Synchronous execution with approval"""
                return asyncio.run(self._arun(**kwargs))

            async def _arun(self, **kwargs) -> Any:
                """Asynchronous execution with approval"""
                # Build approval request
                approval_request = {
                    "type": "tool_approval_request",
                    "tool": {
                        "name": original_tool.name,
                        "args": kwargs,
                        "description": f"Execute {original_tool.name} with parameters: {kwargs}",
                    },
                }

                # Send start event
                try:
                    await adispatch_custom_event(
                        "on_langcrew_tool_approval_required",
                        approval_request,
                        config=None,
                    )
                except Exception:
                    pass  # Event sending failure doesn't affect core functionality

                # Use LangGraph native interrupt
                user_response = interrupt(approval_request)

                # Send completion event
                try:
                    await adispatch_custom_event(
                        "on_langcrew_tool_approval_completed",
                        {
                            "approved": bool(user_response),
                            "tool_name": original_tool.name,
                        },
                        config=None,
                    )
                except Exception:
                    pass

                # Execute based on user decision
                if user_response:
                    # Execute original tool
                    if hasattr(original_tool, "_arun"):
                        return await original_tool._arun(**kwargs)
                    else:
                        # Original tool only supports sync
                        return await asyncio.get_event_loop().run_in_executor(
                            None, lambda: original_tool._run(**kwargs)
                        )
                else:
                    # User denied execution
                    raise ToolApprovalDenied(
                        f"Tool {original_tool.name} execution was denied by user"
                    )

        return ApprovalWrappedTool()


class ToolApprovalDenied(Exception):
    """Exception raised when tool approval is denied"""

    pass
