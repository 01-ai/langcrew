"""HITL configuration for LangCrew - Focus on static interrupt management"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class HITLConfig:
    """HITL Configuration for tool approval"""

    enabled: bool = True

    approval_tool_mode: Literal["all", "specified", "none"] = "none"
    approval_tools: list[str] | None = None
    excluded_tools: list[str] | None = field(default_factory=lambda: ["user_input"])

    def __post_init__(self):
        """Auto-infer approval_tool_mode based on provided parameters"""
        # If approval_tools is provided but mode is still "none", auto-set to "specified"
        if self.approval_tools and self.approval_tool_mode == "none":
            self.approval_tool_mode = "specified"

    def should_approve_tool(self, tool_name: str) -> bool:
        """Check if tool requires approval"""
        if not self.enabled or self.approval_tool_mode == "none":
            return False

        # Check exclusion list first
        if self.excluded_tools and tool_name in self.excluded_tools:
            return False

        if self.approval_tool_mode == "all":
            return True
        return self.approval_tools and tool_name in self.approval_tools

    def add_excluded_tool(self, tool_name: str):
        """Dynamically add tool to exclusion list"""
        if self.excluded_tools is None:
            self.excluded_tools = []
        if tool_name not in self.excluded_tools:
            self.excluded_tools.append(tool_name)
