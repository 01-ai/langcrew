import asyncio
import inspect
import logging
from dataclasses import dataclass
from typing import Any

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.types import interrupt

from .config import HITLConfig

logger = logging.getLogger(__name__)


@dataclass
class ExecutionState:
    """Tool execution state tracking"""

    before_interrupt_processed: bool = False
    tool_executed: bool = False
    tool_result: Any | None = None
    after_interrupt_processed: bool = False
    saved_kwargs: dict[str, Any] | None = None  # Save kwargs for resume


class HITLToolWrapper:
    """Wrapper for tools that require human-in-the-loop interaction"""

    def __init__(self, hitl_config: HITLConfig):
        self.hitl_config = hitl_config
        # Tool execution state cache to prevent duplicate execution
        self._execution_cache: dict[str, ExecutionState] = {}

    def wrap_tools(self, tools: list[BaseTool]) -> list[BaseTool]:
        """Wrap tools that require interrupt before or after execution"""
        wrapped_tools = []
        for tool in tools:
            interrupt_before_needed = self.hitl_config.should_interrupt_before_tool(
                tool.name
            )
            interrupt_after_needed = self.hitl_config.should_interrupt_after_tool(
                tool.name
            )

            if interrupt_before_needed or interrupt_after_needed:
                wrapped_tools.append(
                    self._create_interrupt_tool(
                        tool,
                        interrupt_before=interrupt_before_needed,
                        interrupt_after=interrupt_after_needed,
                    )
                )
            else:
                wrapped_tools.append(tool)

        return wrapped_tools

    def _create_interrupt_tool(
        self,
        original_tool: BaseTool,
        interrupt_before: bool = False,
        interrupt_after: bool = False,
    ) -> BaseTool:
        """Create interrupt wrapper for a single tool using model_copy approach"""

        # Store reference to outer class instance
        outer_self = self

        # Inspect original tool signatures to handle config parameter correctly
        arun_sig = (
            inspect.signature(original_tool._arun)
            if hasattr(original_tool, "_arun")
            else None
        )
        run_sig = inspect.signature(original_tool._run)

        arun_accepts_config = arun_sig and "config" in arun_sig.parameters
        run_accepts_config = "config" in run_sig.parameters

        # 🎯 Use model_copy to create perfect copy of original tool
        wrapped_tool = original_tool.model_copy()

        # Define helper methods that will be added to the wrapped tool
        def _parse_user_response(user_response: Any) -> dict:
            """Parse user response into standard format with Chinese/English support"""

            # Standard format
            if isinstance(user_response, dict) and "approved" in user_response:
                return user_response

            # Boolean value
            if isinstance(user_response, bool):
                return {"approved": user_response}

            # String responses with Chinese/English support
            if isinstance(user_response, str):
                response_lower = user_response.lower().strip()

                # Approval keywords (Chinese + English)
                approval_keywords = [
                    # Chinese
                    "批准",
                    "同意",
                    "确认",
                    "通过",
                    "好的",
                    "可以",
                    "行",
                    "是的",
                    # English
                    "approve",
                    "approved",
                    "yes",
                    "ok",
                    "confirm",
                    "confirmed",
                    "accept",
                    "accepted",
                    "agree",
                    "agreed",
                ]

                if any(keyword in response_lower for keyword in approval_keywords):
                    return {"approved": True}

                # Denial keywords (Chinese + English)
                denial_keywords = [
                    # Chinese
                    "拒绝",
                    "不同意",
                    "不通过",
                    "不可以",
                    "不行",
                    "取消",
                    "否",
                    "不要",
                    # English
                    "deny",
                    "denied",
                    "no",
                    "reject",
                    "rejected",
                    "refuse",
                    "refused",
                    "cancel",
                    "cancelled",
                    "disagree",
                    "disagreed",
                ]

                if any(keyword in response_lower for keyword in denial_keywords):
                    return {"approved": False, "reason": user_response}

            # Falsy values treated as denied (maintain original logic)
            if not user_response:
                return {"approved": False}

            # Other truthy values treated as approved
            return {"approved": True}

        def _process_user_feedback(original_result: Any, parsed_feedback: dict) -> Any:
            """Process parsed user feedback and return modified result"""

            # Log user approval status
            if not parsed_feedback.get("approved", True):
                reason = parsed_feedback.get("reason", "User disapproved result")
                logger.info(f"User disapproved result but continuing: {reason}")

            # Apply result modifications
            if "modified_result" in parsed_feedback:
                return parsed_feedback["modified_result"]

            return original_result

        # Define the enhanced _arun method with interrupt support
        async def interrupt_arun(config: RunnableConfig = None, **kwargs) -> Any:
            """Asynchronous execution with interrupt support"""

            # Extract thread_id from config for proper thread isolation
            thread_id = "default"
            if config and config.get("configurable"):
                thread_id = config["configurable"].get("thread_id", "default")

            # Generate stable execution ID with thread isolation (no timestamp)
            execution_id = (
                f"{thread_id}_{original_tool.name}_{hash(str(sorted(kwargs.items())))}"
            )

            # Get or create execution state
            if execution_id not in outer_self._execution_cache:
                outer_self._execution_cache[execution_id] = ExecutionState()

            exec_state = outer_self._execution_cache[execution_id]

            # Before interrupt
            if interrupt_before and not exec_state.before_interrupt_processed:
                # Always save kwargs for resume (even if empty, they might be filled later)
                if not exec_state.saved_kwargs:
                    exec_state.saved_kwargs = kwargs.copy() if kwargs else {}
                elif kwargs:
                    # Update saved kwargs if we have new values
                    exec_state.saved_kwargs.update(kwargs)

                # Use saved kwargs if current kwargs are empty
                effective_kwargs = kwargs if kwargs else (exec_state.saved_kwargs or {})

                before_request = {
                    "type": "tool_interrupt_before",
                    "execution_id": execution_id,
                    "tool": {
                        "name": original_tool.name,
                        "args": effective_kwargs,
                        "description": f"Execute {original_tool.name} with parameters: {effective_kwargs}",
                    },
                }

                # Send before interrupt event
                try:
                    await adispatch_custom_event(
                        "on_langcrew_tool_interrupt_before",
                        before_request,
                    )
                except Exception:
                    pass  # Event sending failure doesn't affect core functionality

                # Use LangGraph native interrupt
                user_response = interrupt(before_request)

                # Parse user response
                parsed_response = _parse_user_response(user_response)

                # Send interrupt completed event
                try:
                    await adispatch_custom_event(
                        "on_langcrew_tool_interrupt_before_completed",
                        {
                            "approved": parsed_response.get("approved", False),
                            "tool_name": original_tool.name,
                            "execution_id": execution_id,
                            "has_modifications": "modified_args" in parsed_response,
                        },
                    )
                except Exception:
                    pass

                # Process user response
                if not parsed_response.get("approved", False):
                    reason = parsed_response.get("reason", "User denied tool execution")
                    # Clean up cache before returning
                    if execution_id in outer_self._execution_cache:
                        del outer_self._execution_cache[execution_id]
                    return f"Tool execution denied by user: {reason}"

                # Apply parameter modifications
                if "modified_args" in parsed_response:
                    effective_kwargs.update(parsed_response["modified_args"])
                    # Update saved kwargs as well
                    if exec_state.saved_kwargs:
                        exec_state.saved_kwargs.update(parsed_response["modified_args"])

                # Update kwargs with effective_kwargs (may have been modified)
                kwargs.update(effective_kwargs)

                # Mark before interrupt as processed
                exec_state.before_interrupt_processed = True

            # Tool execution
            if not exec_state.tool_executed:
                # Always prefer current kwargs, but fall back to saved kwargs if empty
                # This handles resume scenarios where kwargs might not be passed
                if kwargs:
                    # Update saved kwargs with current values
                    if exec_state.saved_kwargs:
                        exec_state.saved_kwargs.update(kwargs)
                    else:
                        exec_state.saved_kwargs = kwargs.copy()
                    effective_kwargs = kwargs
                else:
                    # Use saved kwargs (for resume scenarios)
                    effective_kwargs = exec_state.saved_kwargs or {}

                # Execute original tool with proper config handling
                if hasattr(original_tool, "_arun"):
                    if arun_accepts_config:
                        result = await original_tool._arun(
                            config=config, **effective_kwargs
                        )
                    else:
                        result = await original_tool._arun(**effective_kwargs)
                else:
                    # Original tool only supports sync
                    # Create a proper function closure to capture effective_kwargs
                    def run_with_kwargs(
                        tool=original_tool, args=effective_kwargs, cfg=config
                    ):
                        if run_accepts_config:
                            return tool._run(config=cfg, **args)
                        else:
                            return tool._run(**args)

                    result = await asyncio.get_event_loop().run_in_executor(
                        None, run_with_kwargs
                    )

                # Save tool execution result and state
                exec_state.tool_executed = True
                exec_state.tool_result = result
            else:
                # Use cached result
                result = exec_state.tool_result

            # After interrupt
            if interrupt_after and not exec_state.after_interrupt_processed:
                after_request = {
                    "type": "tool_interrupt_after",
                    "execution_id": execution_id,
                    "tool": {
                        "name": original_tool.name,
                        "args": kwargs,
                        "result": result,
                        "description": f"Review result from {original_tool.name}: {result}",
                        "already_executed": True,
                    },
                }

                # Send after interrupt event
                try:
                    await adispatch_custom_event(
                        "on_langcrew_tool_interrupt_after",
                        after_request,
                    )
                except Exception:
                    pass

                # Use LangGraph native interrupt for review
                user_feedback = interrupt(after_request)

                # Parse user feedback
                parsed_feedback = _parse_user_response(user_feedback)

                # Send interrupt completed event
                try:
                    await adispatch_custom_event(
                        "on_langcrew_tool_interrupt_after_completed",
                        {
                            "approved": parsed_feedback.get("approved", True),
                            "tool_name": original_tool.name,
                            "execution_id": execution_id,
                            "has_modifications": "modified_result" in parsed_feedback,
                            "original_result": result,
                        },
                    )
                except Exception:
                    pass

                # Process user feedback
                result = _process_user_feedback(result, parsed_feedback)

                # Mark after interrupt as processed
                exec_state.after_interrupt_processed = True

            # Clean up cache after execution completes
            if execution_id in outer_self._execution_cache:
                del outer_self._execution_cache[execution_id]

            return result

        # Define the enhanced _run method
        def interrupt_run(config: RunnableConfig = None, **kwargs) -> Any:
            """Synchronous execution with interrupt support"""
            return asyncio.run(interrupt_arun(config=config, **kwargs))

        # Replace methods on the copied tool
        wrapped_tool._arun = interrupt_arun
        wrapped_tool._run = interrupt_run

        # Add helper methods to the wrapped tool
        wrapped_tool._parse_user_response = _parse_user_response
        wrapped_tool._process_user_feedback = _process_user_feedback

        return wrapped_tool
