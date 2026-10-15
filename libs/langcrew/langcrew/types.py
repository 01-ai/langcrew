from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from langgraph.graph import MessagesState
from pydantic import BaseModel

# File type definitions
class BaseFile(BaseModel):
    """Base file type defining common properties"""

    filename: str
    file_md5: str
    file_type: str | None = None  # e.g., "pdf", "png", "jpeg", etc.
    size: int | None = None
    url: str | None = None


class ImageFile(BaseFile):
    """Image file, accessed via URL"""

    # Optional fields for base64 data
    data: str | None = None  # Base64 encoded image data
    mime_type: str | None = None  # MIME type (e.g., "image/jpeg", "image/png")


class DocumentFile(BaseFile):
    """Document file (PDF/DOCX), accessed via MD5"""


@dataclass
class ExecutionPlan:
    """Execution plan management for multi-step workflows.

    This class encapsulates all execution plan related data and operations,
    providing a clean interface for managing multi-step execution contexts.
    """

    # Data fields for execution plan management
    steps: list[str] = field(default_factory=list)
    overview: str = ""
    current_step: int = 0
    completed_steps: list[int] = field(default_factory=list)

    def initialize(self, plan: list[str], overview: str = None):
        """
        Initialize execution plan in state.

        Args:
            plan: List of execution plan step descriptions
            overview: Optional overview description of the plan
        """
        self.steps = plan
        self.current_step = 0
        self.completed_steps = []

        # Set overview
        self.overview = overview or f"Execution plan with {len(plan)} steps"

    def update_progress(self):
        """
        Update execution progress in state.
        """
        # Check if already completed all steps
        if self.current_step >= len(self.steps):
            return

        current = self.current_step

        # Mark current step as completed
        if current not in self.completed_steps:
            self.completed_steps.append(current)

        # Advance to next step
        self.current_step = current + 1

    def build_context_prompt(self) -> str:
        """
        Build formatted execution context prompt from current state.

        Returns:
            Formatted string for direct use in prompts
        """
        if not self.steps:
            return ""

        # Build current step section
        if self.current_step >= len(self.steps):
            current_step_section = (
                "ALL STEPS COMPLETED\nAll planned steps have been successfully executed."
            )
        else:
            current_step_desc = self.steps[self.current_step]
            current_step_section = f"""YOUR CURRENT STEP:
{"━" * 50}
Step: {current_step_desc}
{"━" * 50}"""

        # Build execution history section
        execution_history_section = ""
        if self.completed_steps:
            history_parts = ["CONTEXT FROM PREVIOUS STEPS:"]
            for step_idx in sorted(self.completed_steps):
                if 0 <= step_idx < len(self.steps):
                    step_desc = self.steps[step_idx]
                    history_parts.append(f"• Step {step_idx + 1} (✓): {step_desc}")
            execution_history_section = "\n".join(history_parts)

        # Build next step guidance
        next_step_guidance = ""
        if self.current_step + 1 < len(self.steps):
            next_desc = self.steps[self.current_step + 1]
            next_step_guidance = f"Next planned step will be: {next_desc}"
        elif self.current_step == len(self.steps) - 1:
            next_step_guidance = "NOTE: This is the final step in the execution plan."

        # Build final context using f-string
        history_section = (
            f"\n\n{execution_history_section}" if execution_history_section else ""
        )
        guidance_section = f"\n{next_step_guidance}" if next_step_guidance else ""

        return f"""<execution_context>
You are currently executing a multi-step plan with {len(self.steps)} total steps.
Overall objective: {self.overview}

CURRENT PROGRESS: Step {self.current_step + 1} of {len(self.steps)}

{current_step_section}{history_section}

IMPORTANT: Focus on completing the current step before moving to the next step.{guidance_section}
</execution_context>"""


class CrewState(MessagesState):
    """Unified state for all Crew execution modes.

    This state supports agent and workflow execution.
    Fields are categorized by mode, but all modes share the same state
    to enable seamless composition (e.g., workflows calling agents).

    Unused fields are lightweight (None or empty containers) and don't
    impact performance.
    """

    # ===== Agent mode fields =====

    _continue_execution: bool = True
    """Control flag for agent execution flow (Agent mode)"""

    execution_plan: ExecutionPlan = field(default_factory=ExecutionPlan)
    """Execution plan for multi-step agent coordination (Agent mode)"""

    running_summary: str | None = None
    """Conversation summary for context management (Agent mode)"""

    # ===== Workflow mode fields =====
    previous_node_output: dict[str, Any] = field(default_factory=dict)
    """Previous node's output data (Workflow mode).
    
    Structure:
        {
            "output_text": str,         # Text output (from agent/workflow messages)
            "output_parsed": dict,      # Structured output (for CEL conditions)
            "output_display": str,      # Formatted display content (UI only, optional)
            "safe_text": str,           # Guardrail sanitized text (optional)
            "input_text": str,          # Guardrail original input (optional)
            "guardrails": dict,         # Guardrail check results (optional)
        }
    
    This field is automatically managed by WorkflowNode.create_handler().
    Only the last executed node's output is kept to minimize state size
    and reduce checkpoint/database storage.
    
    OpenAI-compatible: CEL expressions access via 'input.*' namespace.
    
    Example:
        # In CEL expression (OpenAI-compatible)
        input.output_text                    # Text output
        input.output_parsed.classification   # Structured field
        input.output_display                 # Display content (if set by node)
        input.safe_text                      # Guardrail output
    """

    workflow_input: str | None = None
    """Initial user input for current workflow run (Workflow mode)"""

    user_state: dict[str, Any] = field(default_factory=dict)
    """User-defined state variables from Start node (Workflow mode)"""
