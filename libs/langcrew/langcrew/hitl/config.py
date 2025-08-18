"""HITL configuration for LangCrew - Unified interrupt management"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class HITLConfig:
    """Unified HITL Configuration for interrupt management"""

    # Task-level interrupt configuration
    interrupt_before_tasks: list[str] | None = None
    interrupt_after_tasks: list[str] | None = None
    
    # Agent-level interrupt configuration  
    interrupt_before_agents: list[str] | None = None
    interrupt_after_agents: list[str] | None = None

    # Tool-level interrupt configuration
    interrupt_before_tools: list[str] | None = None
    # Note: Only works within single execution session, not across restarts
    interrupt_after_tools: list[str] | None = None

    # Node-level interrupt configuration (LangGraph native)
    interrupt_before_nodes: list[str] | None = None
    interrupt_after_nodes: list[str] | None = None

    def should_interrupt_before_task(self, task_name: str) -> bool:
        """Check if task requires interrupt before execution"""
        return self.interrupt_before_tasks and task_name in self.interrupt_before_tasks

    def should_interrupt_after_task(self, task_name: str) -> bool:
        """Check if task requires interrupt after execution"""
        return self.interrupt_after_tasks and task_name in self.interrupt_after_tasks

    def should_interrupt_before_agent(self, agent_name: str) -> bool:
        """Check if agent requires interrupt before execution"""
        return self.interrupt_before_agents and agent_name in self.interrupt_before_agents

    def should_interrupt_after_agent(self, agent_name: str) -> bool:
        """Check if agent requires interrupt after execution"""
        return self.interrupt_after_agents and agent_name in self.interrupt_after_agents

    def should_interrupt_before_tool(self, tool_name: str) -> bool:
        """Check if tool requires interrupt before execution"""
        return self.interrupt_before_tools and tool_name in self.interrupt_before_tools

    def should_interrupt_after_tool(self, tool_name: str) -> bool:
        """Check if tool requires interrupt after execution

        IMPORTANT: interrupt_after_tools only works within a single execution session.
        After a workflow restart (e.g., from checkpointed state), the tool result is
        already cached and won't trigger after-interrupts again. This is by design
        to prevent duplicate user interactions for the same tool execution.
        """
        return self.interrupt_after_tools and tool_name in self.interrupt_after_tools

    def get_interrupt_before_nodes(self) -> list[str]:
        """Get list of nodes to interrupt before execution (LangGraph native)"""
        return self.interrupt_before_nodes or []

    def get_interrupt_after_nodes(self) -> list[str]:
        """Get list of nodes to interrupt after execution (LangGraph native)"""
        return self.interrupt_after_nodes or []
