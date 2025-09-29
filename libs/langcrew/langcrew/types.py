from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from langgraph.graph import MessagesState
from pydantic import BaseModel

if TYPE_CHECKING:
    from langcrew.task import Task


class OrderCallback(BaseModel):
    order_id: int
    callback: Callable


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

        # Build current task section
        if self.current_step >= len(self.steps):
            current_task_section = "ALL TASKS COMPLETED\nAll planned steps have been successfully executed."
        else:
            current_task = self.steps[self.current_step]
            current_task_section = f"""YOUR CURRENT TASK:
{"━" * 50}
Task: {current_task}
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

{current_task_section}{history_section}

IMPORTANT: Focus on completing the current task before moving to the next step.{guidance_section}
</execution_context>"""


class CrewState(MessagesState):
    """Crew state that includes task and agent outputs.

    This state extends LangGraph's MessagesState to include additional
    fields for tracking task and agent execution results.
    """

    task_outputs: list[Any] = []
    _continue_execution: bool = True  # Control flag for agent execution flow

    # Execution plan management - now using ExecutionPlan class
    execution_plan: ExecutionPlan = field(default_factory=ExecutionPlan)

    # Summary state management
    running_summary: str | None = (
        None  # Store conversation summary string for context management
    )


@dataclass
class TaskSpec:
    """Task specification containing core task information.

    This data class represents the essential specification of a task,
    including what needs to be done (description) and what's expected
    as output. Used for prompt generation and task execution.
    """

    description: str
    expected_output: str | None = None
    name: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    context: Any | None = None
    form_task: Task | None = None

    def __post_init__(self):
        """Validate and set defaults."""
        if not self.description:
            raise ValueError("TaskSpec must have a description")

        if self.expected_output is None:
            self.expected_output = f"Result for: {self.description[:50]}..."

    @classmethod
    def from_string(cls, description: str) -> TaskSpec:
        """Create from string description."""
        return cls(description=description)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TaskSpec:
        """Create from dictionary."""
        # Only pass valid fields
        valid_fields = {"description", "expected_output", "name", "metadata", "context"}
        filtered = {k: v for k, v in data.items() if k in valid_fields}
        return cls(**filtered)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "description": self.description,
            "expected_output": self.expected_output,
            "name": self.name,
            "metadata": self.metadata,
            "context": self.context,
        }
