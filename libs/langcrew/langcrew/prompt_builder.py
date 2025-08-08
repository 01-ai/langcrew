import logging
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
)

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from .agent import Agent
    from .types import TaskSpec


class PromptBuilder:
    """Prompt builder using markdown format

    Uses predefined default templates with standard formatting.
    Subclasses can override templates to provide custom formatting.
    """

    # Default framework templates
    DEFAULT_SYSTEM_TEMPLATE = """
**Role**: {role}

**Goal**: {goal}

**Background**: {backstory}

## Available Tools
{tools}"""

    DEFAULT_USER_TEMPLATE = """
{task_description}

## Expected Output
{expected_output}

{context}"""

    def __init__(
        self,
        # Time injection parameters
        inject_current_time: bool = True,
    ):
        """
        Initialize PromptBuilder

        Args:
            inject_current_time: Whether to inject current time into system prompt (default: True)
        """
        # Store time injection configuration
        self.inject_current_time = inject_current_time

        # Initialize templates with defaults
        self.system_template = SystemMessagePromptTemplate.from_template(
            self.DEFAULT_SYSTEM_TEMPLATE
        )
        self.user_template = HumanMessagePromptTemplate.from_template(
            self.DEFAULT_USER_TEMPLATE
        )

    def _inject_current_time(self, system_content: str) -> str:
        """Inject current time into system prompt if not already present.

        Args:
            system_content: The original system prompt content

        Returns:
            System prompt with current time injected at the beginning
        """
        # Avoid duplicate injection
        if "**Current Time**:" in system_content:
            return system_content

        # Skip injection if disabled
        if not self.inject_current_time:
            return system_content

        # Get current time in server's local timezone
        current_time = datetime.now()
        time_str = current_time.strftime("%Y-%m-%d %H:%M:%S (%A)")

        # Inject time at the beginning of system prompt
        time_prefix = f"**Current Time**: {time_str}\n\n"
        return time_prefix + system_content

    def _format_tools(self, tools) -> str:
        """Format tools with detailed information in markdown"""
        # === Input Validation ===
        if not tools:
            return "*No tools available*"

        # === Main Loop: Process Each Tool ===
        tool_descriptions = []
        for tool in tools:
            tool_lines = []

            # --- Collect Basic Information ---
            # Tool name as subheading
            tool_lines.append(f"### {tool.name}")

            # Add description if available
            if hasattr(tool, "description") and tool.description:
                tool_lines.append(tool.description)

            # Add return_direct notification if enabled
            if hasattr(tool, "return_direct") and tool.return_direct:
                tool_lines.append(
                    "\n**Note**: This tool returns results directly to the user."
                )

            # --- Schema Acquisition & Processing ---
            tool_schema = None

            # Priority 1: Use tool_call_schema (excludes injected arguments like InjectedToolCallId)
            if hasattr(tool, "tool_call_schema"):
                try:
                    tool_schema = tool.tool_call_schema
                except Exception:
                    pass

            # Priority 2: Fallback to args_schema for compatibility with older tools
            if (
                tool_schema is None
                and hasattr(tool, "args_schema")
                and tool.args_schema
            ):
                tool_schema = tool.args_schema

            # --- Arguments Formatting ---
            if tool_schema is not None:
                try:
                    # Extract schema data based on schema type
                    schema_data = {}
                    if hasattr(tool_schema, "model_json_schema"):
                        # Pydantic v2 model
                        schema_data = tool_schema.model_json_schema()
                    elif hasattr(tool_schema, "schema"):
                        # Pydantic v1 model
                        schema_data = tool_schema.schema()
                    elif isinstance(tool_schema, dict):
                        # Direct dict schema
                        schema_data = tool_schema

                    # Format arguments if properties exist
                    if "properties" in schema_data:
                        props = schema_data["properties"]
                        required_args = schema_data.get("required", [])

                        if props:
                            tool_lines.append("\n**Arguments**:")
                            for arg_name, arg_details in props.items():
                                # Build argument description
                                required_marker = (
                                    " *(required)*" if arg_name in required_args else ""
                                )
                                arg_type = arg_details.get("type", "any")
                                arg_description = arg_details.get("description", "")

                                tool_lines.append(
                                    f"- `{arg_name}` ({arg_type}){required_marker}: {arg_description}"
                                )
                except Exception:
                    # Silently skip if schema processing fails
                    pass

            # --- Result Assembly ---
            tool_descriptions.append("\n".join(tool_lines))

        # === Final Result Return ===
        return "\n\n".join(tool_descriptions)

    def format_prompt(
        self,
        agent: Optional["Agent"] = None,
        task: Optional["TaskSpec"] = None,
        context: str | None = None,
        **kwargs,
    ) -> list[BaseMessage]:
        """Format the prompt with agent and task information

        Strategy: Provide all available variables, let template use what it needs
        """

        # Build all possible variables
        all_variables = {}

        # 1. Add user custom variables (highest priority)
        all_variables.update(kwargs)

        # 2. Add tools information
        if agent and agent.tools:
            all_variables["tools"] = self._format_tools(agent.tools)
        elif "tools" not in all_variables:
            all_variables["tools"] = "*No tools available*"

        # 3. Add Agent attributes (if they exist)
        if agent:
            all_variables["role"] = agent.role if agent.role is not None else ""
            all_variables["goal"] = agent.goal if agent.goal is not None else ""
            all_variables["backstory"] = (
                agent.backstory if agent.backstory is not None else ""
            )
            all_variables["name"] = agent.name if agent.name is not None else ""

        # 4. Add task-related variables
        if task:
            all_variables["task_description"] = task.description
            all_variables["expected_output"] = task.expected_output

        # 5. Handle context
        if context:
            all_variables["context"] = f"**Context**: {context}"
        elif "context" not in all_variables:
            all_variables["context"] = ""

        # Build template and format messages directly
        template_messages = [self.system_template, self.user_template]
        template = ChatPromptTemplate.from_messages(template_messages)

        # partial will ignore variables not in template
        partial_template = template.partial(**all_variables)
        # Any remaining unfilled variables will stay as {variable}
        messages = partial_template.format_messages()

        # Inject current time into system message if enabled
        if messages:
            # Find and enhance the system message
            from langchain_core.messages import SystemMessage

            for i, message in enumerate(messages):
                if isinstance(message, SystemMessage) and hasattr(message, "content"):
                    # Inject time into system message content
                    enhanced_content = self._inject_current_time(message.content)
                    # Create new system message with enhanced content
                    messages[i] = SystemMessage(content=enhanced_content)
                    break  # Only modify the first system message
            for i, message in enumerate(messages):
                if isinstance(message, HumanMessage) and hasattr(message, "content"):
                    enhanced_content = str(message.content)

                    messages[i] = HumanMessage(content=enhanced_content)
        return messages