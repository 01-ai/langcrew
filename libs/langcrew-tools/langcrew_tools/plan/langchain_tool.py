"""Plan management tools for structured task planning and organization."""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any, Literal

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class PlanItem(BaseModel):
    """A single plan item with status tracking."""

    id: str = Field(
        description="Unique identifier for the plan item (e.g., '1', '2', '3')"
    )
    content: str = Field(min_length=1, description="The plan item description")
    status: Literal["pending", "running", "done"] = Field(
        ..., description="The current status of the plan item (pending/running/done)"
    )


class PlanInput(BaseModel):
    """Input for Plan tool."""

    plans: list[PlanItem] = Field(
        description='The updated plan list (e.g., [{"id": "1", "content": "plan 1", "status": "pending"}, {"id": "2", "content": "plan 2", "status": "pending"}])'
    )


class PlanTool(BaseTool):
    """
    Tool for creating and managing a structured plan list for task.

    This tool helps track progress, organize complex tasks, and demonstrate thoroughness.
    It should be used proactively for multi-step tasks and complex operations.
    """

    name: str = "plan"
    description: str = """Create and manage a structured task list to track progress and organize work.
        **When to use:**
        - Complex task requiring 2+ steps
        - User requests plans list or provides multiple tasks
        - Before starting work (mark as 'running') and after completion (mark as 'done')

        **When NOT to use:**
        - Single, straightforward task
        - Simple task with <2 simple steps
        - Purely conversational requests

        **Task States:**
        - pending: Not started
        - running: Currently working (ONE plan item only)
        - done: Completed successfully

        **Key Rules:**
        - IMPORTANT: Always set the FIRST STEP to 'running' state when creating a new plan
        - Only ONE item can be 'running' at a time
        - Must mark current 'running' as 'done' or 'pending' before starting another
        - Only mark 'done' when fully accomplished
        - Update status in real-time
        - Break complex tasks into specific, actionable items"""

    args_schema: type[PlanInput] = PlanInput

    callback: (
        Callable[[list[PlanItem]], None]
        | Callable[[list[PlanItem]], Awaitable[None]]
        | None
    ) = None

    def __init__(
        self,
        callback: Callable[[list[PlanItem]], None]
        | Callable[[list[PlanItem]], Awaitable[None]]
        | None = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.callback = callback

    async def _arun(self, plans: list[PlanItem], **kwargs: Any) -> str:
        """Execute the plan operation."""
        try:
            result = ""
            if plans:
                for i, plan in enumerate(plans, 1):
                    result += f"{i}. {plan.content} [{plan.status}] (ID: {plan.id})\n"
            logger.info(f"PlanTool: {result}")
            if self.callback:
                try:
                    if asyncio.iscoroutinefunction(self.callback):
                        await self.callback(plans)
                    else:
                        self.callback(plans)
                except Exception as e:
                    logger.error(f"Error: callback on_plan_update: {str(e)}")
            return result.rstrip()

        except Exception as e:
            return f"Error: updating plan list: {str(e)}"

    def _run(self, plans: list[PlanItem], **kwargs: Any) -> str:
        """Execute the plan operation."""
        try:
            result = ""
            if plans:
                for i, plan in enumerate(plans, 1):
                    result += f"{i}. {plan.content} [{plan.status}] (ID: {plan.id})\n"
            logger.info(f"PlanTool: {result}")
            if self.callback:
                if asyncio.iscoroutinefunction(self.callback):
                    logger.warning(
                        "Async callback cannot be called in sync context. "
                        "Use async execution or provide sync callback."
                    )
                else:
                    self.callback(plans)
            return result.rstrip()

        except Exception as e:
            return f"Error: updating plan list: {str(e)}"
