# HITL Tools for LangChain - Independent and reusable HITL tools
# These tools can be used independently, without depending on HITLConfig

from typing import ClassVar

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.tools import BaseTool
from langgraph.types import interrupt
from pydantic import BaseModel, Field


class UserInputRequest(BaseModel):
    """Input for UserInputTool."""

    question: str = Field(..., description="The question to ask the user")
    options: list[str] | None = Field(
        None,
        description="Optional list of predefined options (max 4, each option max 10 characters or 5 Chinese characters, keep them short and clear)",
        max_length=4,
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
            )
        )
