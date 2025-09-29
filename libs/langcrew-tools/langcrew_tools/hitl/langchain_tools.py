# HITL Tools for LangChain - Independent and reusable HITL tools
# These tools can be used independently, without depending on HITLConfig

import logging
import sys
from collections.abc import Callable
from typing import Any, ClassVar, Dict, List, Optional

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.tools import BaseTool
from langcrew.tools import HitlGetHandoverInfoTool, ToolCallback
from langgraph.types import interrupt
from pydantic import BaseModel, Field, PrivateAttr

from ..base import BaseToolInput


class FormFieldSchema(BaseModel):
    """JSON Schema field definition for dynamic forms"""

    type: str = Field(
        ...,
        description="Field type: string, number, boolean, array, object, multiselect",
    )
    title: str = Field(..., description="Field display title")
    description: Optional[str] = Field(None, description="Field description/help text")
    enum: Optional[List[str]] = Field(
        None, description="Enum options for select fields"
    )
    required: bool = Field(False, description="Whether this field is required")
    format: Optional[str] = Field(
        None, description="Format hint: email, url, date, date-time, phone, color, time"
    )
    pattern: Optional[str] = Field(
        None,
        description="Regular expression pattern for validation (e.g., for phone numbers)",
    )
    minLength: Optional[int] = Field(
        None, description="Minimum length for string fields"
    )
    maxLength: Optional[int] = Field(
        None, description="Maximum length for string fields"
    )
    minimum: Optional[float] = Field(
        None, description="Minimum value for number fields"
    )
    maximum: Optional[float] = Field(
        None, description="Maximum value for number fields"
    )
    default: Optional[Any] = Field(None, description="Default value for the field")
    # 多选相关字段
    multiselect: Optional[bool] = Field(
        False,
        description="Whether this field supports multiple selection (for string/enum fields)",
    )
    minSelections: Optional[int] = Field(
        None,
        description="Minimum number of selections required (for multiselect fields)",
    )
    maxSelections: Optional[int] = Field(
        None,
        description="Maximum number of selections allowed (for multiselect fields)",
    )


class FormSchema(BaseModel):
    """Complete form schema definition"""

    type: str = Field(
        default="object", description="Schema type, always 'object' for forms"
    )
    properties: Dict[str, FormFieldSchema] = Field(
        ..., description="Form field definitions"
    )
    required: List[str] = Field(default=[], description="List of required field names")
    title: Optional[str] = Field(None, description="Form title")
    description: Optional[str] = Field(None, description="Form description")


class UserInputRequest(BaseToolInput):
    """Input for UserInputTool with dynamic form support."""

    question: str = Field(..., description="The question to ask the user")
    options: Optional[List[str]] = Field(
        None,
        description="Optional list of predefined options (max 4, each option max 10 characters or 5 Chinese characters, keep them short and clear)",
        max_length=4,
    )
    form_schema: Optional[FormSchema] = Field(
        None,
        description="JSON Schema for dynamic form generation. Use this instead of options for complex forms.",
    )


class UserInputTool(BaseTool):
    """User Input Tool - Based on LangGraph official pattern

    Allows LLM to actively decide when user input is needed, this is the standard
    pattern recommended by LangGraph.
    Reference: https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/add-human-in-the-loop/

    This tool is independent of HITLConfig, users can flexibly choose whether to use it.
    """

    name: ClassVar[str] = "user_input"
    args_schema: type[BaseModel] = UserInputRequest
    description: ClassVar[str] = (
        "Request input from the human when you need clarification, additional information, "
        "or confirmation. Use this when the user's query is ambiguous or when you need "
        "specific details to proceed. "
        "Optionally provide up to 4 short options like ['Yes', 'No'] or ['Approve', 'Reject']. "
        "Each option should be less than 10 characters or 5 Chinese characters."
    )

    async def _arun(
        self,
        question: str,
        options: list[str] | None = None,
        **kwargs,
    ) -> str:
        """Request user input asynchronously using LangGraph interrupt."""

        # Build interrupt data (following LangGraph standard format)
        interrupt_data = {
            "type": "user_input",
            "question": question,
        }

        # Add options if provided
        if options is not None:
            interrupt_data["options"] = options

        # Send event to frontend (optional, failure doesn't affect core functionality)
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_required",
                interrupt_data,
                config=None,  # Hard to get config in tool, event sending is optional
            )
        except Exception:
            pass  # Event sending failure doesn't affect core functionality

        # Use LangGraph native interrupt (core functionality)
        user_response = interrupt(interrupt_data)

        # Send completion event (optional)
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_completed",
                {"response": user_response},
                config=None,
            )
        except Exception:
            pass

        # Return the actual user response
        return str(user_response)

    def _run(
        self,
        question: str,
        options: list[str] | None = None,
        **kwargs,
    ) -> str:
        """Request user input synchronously.

        Calls the async version for consistency.
        """
        import asyncio

        # Use asyncio to run the async version
        return asyncio.run(
            self._arun(
                question=question,
                options=options,
                **kwargs,
            )
        )


class HitlHandoverTool(UserInputTool, ToolCallback):
    """HITL (Human In The Loop) functionality implementation tool

    Core implementation tool for HITL functionality, called by React model decisions,
    with custom events agreed upon with frontend to pass HITL information.

    Main requirement scenarios:
    1. React model self-determination: React model judges current process needs human participation
    2. Tool active request: Tool (like browser-tool) has determined need for human participation, requires HitlTool assistance
    3. User active takeover: User actively inputs requirement to take over current tool

    This tool uses UserInputTool subclass approach to uniformly maintain
    on_langcrew_user_input_required event protocol, ensuring consistency with frontend event agreements.

    Reference: https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/add-human-in-the-loop/
    """

    _logger = logging.getLogger(__name__)
    tools: list[HitlGetHandoverInfoTool] = Field(
        None, description="Agent tools to use for the user input"
    )
    ignore_tool_names: list[str] = Field(
        [], description="Tool names to ignore when tracking last executed tool"
    )
    _tools_info: dict[str, HitlGetHandoverInfoTool] = PrivateAttr(default={})
    _last_tool_name: str | None = PrivateAttr(default=None)
    _dynamic_description: str = PrivateAttr(default="")

    def __init__(self, **kwargs):
        """
        Initialize HitlHandoverTool with HITL-capable tools

        Registers tools that have HITL capability (implement HitlGetHandoverInfoTool)
        for dynamic handover information supplementation.

        Args:
            **kwargs: Keyword arguments including 'tools' list of HitlGetHandoverInfoTool instances
        """
        super().__init__(**kwargs)
        self.ignore_tool_names = kwargs.get("ignore_tool_names", [])
        self.ignore_tool_names.append(self.name)
        self.tools = kwargs.get("tools", [])
        for tool in self.tools:
            tool_name = getattr(tool, "name", "default")
            self._tools_info[tool_name] = tool  # Register tools with HITL capability

        # Generate dynamic description based on available tools
        self._update_description()

    @property
    def description(self) -> str:
        return (
            super().description + self._dynamic_description
            if self._dynamic_description
            else ""
        )

    def _update_description(self):
        """
        Update the tool description with dynamic tool names based on available tools.

        Generates a dynamic description that includes the actual names of tools
        that support HITL functionality, replacing the static examples.
        """

        # Generate dynamic tool names part
        if self.tools:
            formatted_names = list(self._tools_info.keys())
            if len(formatted_names) == 1:
                self._dynamic_description = f"Also use this tool when the user explicitly requests to take control of or intervene in automated tools (such as {formatted_names[0]})."
            else:
                tools_list = ", ".join(formatted_names[:-1])
                self._dynamic_description = f"Also use this tool when the user explicitly requests to take control of or intervene in automated tools (such as {tools_list}, and {formatted_names[-1]})."

    def tool_order_callback(self) -> tuple[int | None, Callable]:
        """
        Set highest priority callback to ensure execution after all other callbacks

        Uses sys.maxsize to ensure this callback runs last, allowing it to track
        the last executed tool and supplement HITL information when needed.

        Returns:
            tuple: (priority, callback_function) where priority is sys.maxsize for highest priority
        """
        return sys.maxsize, self._callback

    async def _callback(self, prev_result: Any) -> Any:
        """
        Core callback processing logic for HITL functionality

        This method implements the key HITL workflow:
        1. Tracks the last executed tool name (excluding user_input itself)
        2. When on_langcrew_user_input_required event is detected, supplements
           handover information from the last tool if it implements HitlGetHandoverInfoTool

        Process:
        - Records last tool name from on_tool_start/on_tool_end events
        - Detects on_langcrew_user_input_required custom event (frontend agreement)
        - If last tool has HITL capability, calls get_handover_info() to supplement information
        - Updates event data with handover information for frontend consumption

        Args:
            prev_result: Previous callback result, expected to be event dictionary

        Returns:
            Modified event with supplemented handover information if applicable
        """
        if not isinstance(prev_result, dict):
            return prev_result

        event = prev_result.get("event")

        # Track last executed tool name (excluding user_input itself)
        if event == "on_tool_start" or event == "on_tool_end":
            tool_name = prev_result.get("name")
            if tool_name in self.ignore_tool_names:
                pass  # Ignore user_input tool itself
            elif tool_name:
                self._last_tool_name = tool_name

        # Process HITL event and supplement handover information
        elif (
            event == "on_custom_event"
            and prev_result.get("name") == "on_langcrew_user_input_required"
        ):
            if self._last_tool_name:
                self._logger.debug(f"_last_tool_name: {self._last_tool_name}")
                tool = self._tools_info.get(self._last_tool_name)

                # Check if tool has HITL capability and get handover information
                if tool and hasattr(tool, "get_handover_info"):
                    handover_info = await tool.get_handover_info()
                    self._logger.info(
                        f"_last_tool_name: {self._last_tool_name}, handover_info: {handover_info}"
                    )
                    if handover_info:
                        data = prev_result.get("data", {})
                        data.update(handover_info)  # Supplement handover information
                        prev_result["data"] = data

        return prev_result


class DynamicFormUserInputTool(BaseTool):
    """Enhanced User Input Tool with JSON Schema support for dynamic forms"""

    name: ClassVar[str] = "dynamic_form_user_input"
    args_schema: type[BaseModel] = UserInputRequest
    description: ClassVar[str] = (
        "Request input from the human using either simple options or a dynamic form. "
        "Use 'options' for simple choices, or 'form_schema' for complex forms with multiple fields. "
        "The form_schema should follow JSON Schema format with field definitions including type, title, description, etc. "
        "Supports phone number fields with 'format': 'phone' and optional 'pattern' for custom validation. "
        "Supports color picker fields with 'format': 'color' for color selection. "
        "Supports time picker fields with 'format': 'time' for time selection. "
        "Supports multiselect fields with 'multiselect': true and 'enum' options for multiple selection. "
        "IMPORTANT: Field titles should NOT contain asterisks (*) - the required status is determined by the 'required' property, not the title."
    )

    async def _arun(
        self,
        question: str,
        options: Optional[List[str]] = None,
        form_schema: Optional[FormSchema] = None,
        **kwargs,
    ) -> str:
        """Request user input with dynamic form support."""

        # Build interrupt data
        interrupt_data = {
            "type": "dynamic_form" if form_schema else "user_input",
            "question": question,
        }

        # Add options if provided (simple mode)
        if options is not None:
            interrupt_data["options"] = options

        # Add form schema if provided (dynamic form mode)
        if form_schema is not None:
            interrupt_data["form_schema"] = form_schema.dict()

        # Send event to frontend - this will create the first message
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_required",
                interrupt_data,
                config=None,
            )
        except Exception:
            pass

        # Use LangGraph native interrupt - this might create the second message
        user_response = interrupt(interrupt_data)

        # Send completion event
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_completed",
                {"response": user_response},
                config=None,
            )
        except Exception:
            pass

        return str(user_response)

    def _run(
        self,
        question: str,
        options: Optional[List[str]] = None,
        form_schema: Optional[FormSchema] = None,
        **kwargs,
    ) -> str:
        """Request user input synchronously with dynamic form support."""
        import asyncio

        # Use asyncio to run the async version
        return asyncio.run(
            self._arun(
                question=question,
                options=options,
                form_schema=form_schema,
                **kwargs,
            )
        )
