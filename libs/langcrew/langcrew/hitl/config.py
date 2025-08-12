"""HITL configuration for LangCrew - Unified interrupt management"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class HITLConfig:
    """Unified HITL Configuration for interrupt management"""

    enabled: bool = True

    # Tool-level interrupt configuration
    interrupt_before_tools: list[str] | None = None
    interrupt_after_tools: list[str] | None = (
        None  # Note: Only works within single execution session, not across restarts
    )
    interrupt_tool_mode: Literal["all", "specified", "none"] = "none"
    excluded_tools: list[str] | None = field(default_factory=lambda: ["user_input"])

    # Node-level interrupt configuration (LangGraph native)
    interrupt_before_nodes: list[str] | None = None
    interrupt_after_nodes: list[str] | None = None

    def __post_init__(self):
        """Auto-infer interrupt_tool_mode based on provided parameters"""
        # If interrupt_before_tools or interrupt_after_tools is provided but mode is still "none", auto-set to "specified"
        if (
            self.interrupt_before_tools or self.interrupt_after_tools
        ) and self.interrupt_tool_mode == "none":
            self.interrupt_tool_mode = "specified"

    def should_interrupt_before_tool(self, tool_name: str) -> bool:
        """Check if tool requires interrupt before execution"""
        if not self.enabled or self.interrupt_tool_mode == "none":
            return False

        # Check exclusion list first
        if self.excluded_tools and tool_name in self.excluded_tools:
            return False

        if self.interrupt_tool_mode == "all":
            return True

        return self.interrupt_before_tools and tool_name in self.interrupt_before_tools

    def should_interrupt_after_tool(self, tool_name: str) -> bool:
        """Check if tool requires interrupt after execution

        IMPORTANT: interrupt_after_tools only works within a single execution session.
        After a workflow restart (e.g., from checkpointed state), the tool result is
        already cached and won't trigger after-interrupts again. This is by design
        to prevent duplicate user interactions for the same tool execution.
        """
        if not self.enabled or self.interrupt_tool_mode == "none":
            return False

        # Check exclusion list first
        if self.excluded_tools and tool_name in self.excluded_tools:
            return False

        if self.interrupt_tool_mode == "all":
            return True

        return self.interrupt_after_tools and tool_name in self.interrupt_after_tools

    def add_excluded_tool(self, tool_name: str):
        """Dynamically add tool to exclusion list"""
        if self.excluded_tools is None:
            self.excluded_tools = []
        if tool_name not in self.excluded_tools:
            self.excluded_tools.append(tool_name)

    def get_interrupt_before_nodes(self) -> list[str]:
        """Get list of nodes to interrupt before execution (LangGraph native)"""
        return self.interrupt_before_nodes or []

    def get_interrupt_after_nodes(self) -> list[str]:
        """Get list of nodes to interrupt after execution (LangGraph native)"""
        return self.interrupt_after_nodes or []
