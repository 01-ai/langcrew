from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from langchain_core.runnables import RunnableConfig
from langgraph.graph import MessagesState
from langgraph.types import Command
from pydantic import BaseModel

if TYPE_CHECKING:
    from langcrew.task import Task


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


class CrewState(MessagesState):
    """Crew state that includes task and agent outputs.

    This state extends LangGraph's MessagesState to include additional
    fields for tracking task and agent execution results.
    """

    user_input: str | None = None
    config: RunnableConfig
    files: list[ImageFile | DocumentFile] | None = None
    # crew_msg_source: Optional[Dict[str, MsgSource]] = None
    command: Command | None = None  # Command object for interrupt/resume flow

    task_outputs: list[Any] = []
    _continue_execution: bool = True  # Control flag for agent execution flow


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
