"""LangCrew HITL Tools - Independent and reusable HITL tools

These tools can be used independently, without depending on HITLConfig configuration:

1. UserInputTool - LLM actively asks for user input (based on LangGraph official pattern)

Usage example:
    from langcrew.hitl import UserInputTool

    agent = Agent(
        tools=[WebSearchTool(), UserInputTool()],
        hitl=HITLConfig(approval_tools=["web_search"])  # Tool approval through static interrupt
    )
"""

from .langchain_tools import UserInputTool

__all__ = [
    "UserInputTool",
]
