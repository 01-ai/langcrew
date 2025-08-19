"""HITL configuration for LangCrew - Unified interrupt management"""

import logging
import warnings
from dataclasses import dataclass, field


logger = logging.getLogger(__name__)


@dataclass
class HITLConfig:
    """Unified HITL Configuration for interrupt management

    IMPORTANT: The effectiveness of interrupt configurations depends on your execution mode:

    🔹 TASK MODE (when you provide both agents and tasks):
       ✅ interrupt_before_tasks / interrupt_after_tasks - EFFECTIVE
       ❌ interrupt_before_agents / interrupt_after_agents - IGNORED

    🔹 AGENT MODE (when you provide only agents, no tasks):
       ✅ interrupt_before_agents / interrupt_after_agents - EFFECTIVE
       ❌ interrupt_before_tasks / interrupt_after_tasks - IGNORED

    💡 TIP: Use validate_config() method to check your configuration before execution.
    """

    # Task-level interrupt configuration
    interrupt_before_tasks: list[str] | None = field(
        default=None,
        metadata={
            "description": "Tasks to interrupt before execution. Only works in TASK MODE.",
            "effective_in": "task_mode",
        },
    )
    interrupt_after_tasks: list[str] | None = field(
        default=None,
        metadata={
            "description": "Tasks to interrupt after execution. Only works in TASK MODE.",
            "effective_in": "task_mode",
        },
    )

    # Agent-level interrupt configuration
    interrupt_before_agents: list[str] | None = field(
        default=None,
        metadata={
            "description": "Agents to interrupt before execution. Only works in AGENT MODE.",
            "effective_in": "agent_mode",
        },
    )
    interrupt_after_agents: list[str] | None = field(
        default=None,
        metadata={
            "description": "Agents to interrupt after execution. Only works in AGENT MODE.",
            "effective_in": "agent_mode",
        },
    )

    # Tool-level interrupt configuration
    interrupt_before_tools: list[str] | None = field(
        default=None,
        metadata={
            "description": "Tools to interrupt before execution. Works in all execution modes.",
            "effective_in": "all",
        },
    )
    interrupt_after_tools: list[str] | None = field(
        default=None,
        metadata={
            "description": "Tools to interrupt after execution. Only works within single session.",
            "effective_in": "all",
            "limitation": "Does not work across workflow restarts due to tool result caching",
        },
    )

    # Node-level interrupt configuration (LangGraph native)
    interrupt_before_nodes: list[str] | None = field(
        default=None,
        metadata={
            "description": "LangGraph nodes to interrupt before execution. Advanced usage.",
            "effective_in": "all",
        },
    )
    interrupt_after_nodes: list[str] | None = field(
        default=None,
        metadata={
            "description": "LangGraph nodes to interrupt after execution. Advanced usage.",
            "effective_in": "all",
        },
    )

    def should_interrupt_before_task(self, task_name: str) -> bool:
        """Check if task requires interrupt before execution"""
        return self.interrupt_before_tasks and task_name in self.interrupt_before_tasks

    def should_interrupt_after_task(self, task_name: str) -> bool:
        """Check if task requires interrupt after execution"""
        return self.interrupt_after_tasks and task_name in self.interrupt_after_tasks

    def should_interrupt_before_agent(self, agent_name: str) -> bool:
        """Check if agent requires interrupt before execution"""
        return (
            self.interrupt_before_agents and agent_name in self.interrupt_before_agents
        )

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

    def validate_config(self, execution_mode: str) -> None:
        """Validate HITL configuration against execution mode and provide helpful warnings

        Args:
            execution_mode: The detected execution mode of the crew (e.g., "task_mode", "agent_mode", etc.)

        Raises:
            UserWarning: When configurations may not work as expected
        """
        ineffective_configs = []

        # Check each field's metadata to determine if it's effective in current mode
        for field_info in self.__dataclass_fields__.values():
            field_value = getattr(self, field_info.name)
            if field_value:  # Only check non-empty configurations
                metadata = field_info.metadata
                effective_in = metadata.get("effective_in", "all")

                # Skip fields that work in all modes
                if effective_in == "all":
                    continue

                # Check if current mode matches the required mode
                if effective_in != execution_mode:
                    ineffective_configs.append(field_info.name)

        if ineffective_configs:
            self._show_configuration_warning(ineffective_configs, execution_mode)

    def _show_configuration_warning(
        self, ineffective_configs: list[str], execution_mode: str
    ) -> None:
        """Show detailed warning message for ineffective configurations"""
        config_list = ", ".join(ineffective_configs)
        mode_display = execution_mode.replace("_", " ").upper()

        warning_message = f"""
🚨 HITL Configuration Warning:

Your crew is running in {mode_display}, but you have configured interrupt settings that will be IGNORED:
❌ {config_list}

💡 SOLUTION:"""

        if execution_mode == "task_mode":
            warning_message += """
- Use interrupt_before_tasks / interrupt_after_tasks instead
- Example: HITLConfig(interrupt_after_tasks=["planning_task"])"""
        elif execution_mode == "agent_mode":
            warning_message += """
- Use interrupt_before_agents / interrupt_after_agents instead  
- Example: HITLConfig(interrupt_after_agents=["research_agent"])"""
        else:
            # Future execution modes
            warning_message += f"""
- Check documentation for {mode_display} compatible interrupt configurations"""

        warning_message += """

📖 Learn more about execution modes:
- TASK MODE: You provided both agents and tasks → Tasks are execution units
- AGENT MODE: You provided only agents → Agents are execution units

🔧 Current effective configurations:"""

        effective_configs = self._get_effective_configurations(execution_mode)
        if effective_configs:
            warning_message += "\n✅ " + "\n✅ ".join(effective_configs)
        else:
            warning_message += "\n⚠️  No effective interrupt configurations found!"

        warnings.warn(warning_message, UserWarning, stacklevel=4)
        logger.warning(
            f"HITL config validation: {config_list} will be ignored in {mode_display}"
        )

    def _get_effective_configurations(self, execution_mode: str) -> list[str]:
        """Get list of effective configurations for the given execution mode"""
        effective_configs = []

        for field_info in self.__dataclass_fields__.values():
            field_value = getattr(self, field_info.name)
            if field_value:  # Only check non-empty configurations
                metadata = field_info.metadata
                effective_in = metadata.get("effective_in", "all")

                # Include if it works in all modes or matches current mode
                if effective_in == "all" or effective_in == execution_mode:
                    effective_configs.append(f"{field_info.name}: {field_value}")

        return effective_configs

    def get_configuration_summary(self) -> str:
        """Get a human-readable summary of the current configuration"""
        summary = "🔧 HITL Configuration Summary:\n"

        # Group configurations by category for better readability
        categories = {
            "Task Interrupts": ["interrupt_before_tasks", "interrupt_after_tasks"],
            "Agent Interrupts": ["interrupt_before_agents", "interrupt_after_agents"],
            "Tool Interrupts": ["interrupt_before_tools", "interrupt_after_tools"],
            "Node Interrupts": ["interrupt_before_nodes", "interrupt_after_nodes"],
        }

        for category, field_names in categories.items():
            summary += f"\n📋 {category}:\n"
            has_config = False

            for field_name in field_names:
                value = getattr(self, field_name)
                if value:
                    summary += f"  ✅ {field_name}: {value}\n"
                    has_config = True

            if not has_config:
                summary += "  ❌ No configurations set\n"

        return summary
