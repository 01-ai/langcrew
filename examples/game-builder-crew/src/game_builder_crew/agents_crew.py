"""
Game Builder Crew - Agent-based Workflow

This module defines an agent-based workflow using LangGraph's handoff mechanism.
Agents can dynamically transfer control to each other based on task requirements.
"""

import logging

from langcrew import Agent, Crew
from langcrew.project import CrewBase, agent, crew

# Setup logging
logger = logging.getLogger(__name__)


@CrewBase
class AgentsCrew:
    """
    Game Builder crew using agent-based workflow with handoff support.

    This crew demonstrates LangGraph's agent handoff capabilities where agents
    can dynamically coordinate and transfer tasks among themselves.
    """

    agents_config = "config/agent/agents.yaml"

    @agent
    def chief_qa_engineer_agent(self) -> Agent:
        """
        Chief QA Engineer - Entry point and coordinator.

        This agent manages the overall workflow and can handoff tasks to:
        - senior_engineer_agent: For code implementation
        - qa_engineer_agent: For code review

        Returns:
            Agent: Configured chief QA engineer agent
        """
        return Agent(
            config=self.agents_config["chief_qa_engineer_agent"],
            verbose=True,
            debug=True,
        )

    @agent
    def senior_engineer_agent(self) -> Agent:
        """
        Senior Software Engineer - Code implementation specialist.

        This agent handles code writing tasks and can handoff to:
        - qa_engineer_agent: For code review after implementation

        Returns:
            Agent: Configured senior engineer agent
        """
        return Agent(
            config=self.agents_config["senior_engineer_agent"],
            verbose=True,
            debug=True,
        )

    @agent
    def qa_engineer_agent(self) -> Agent:
        """
        QA Engineer - Code review and quality assurance specialist.

        This agent reviews code for errors, bugs, and quality improvements.

        Returns:
            Agent: Configured QA engineer agent
        """
        return Agent(
            config=self.agents_config["qa_engineer_agent"],
            verbose=True,
            debug=True,
        )

    @crew
    def crew(self) -> Crew:
        """
        Creates the GameBuilderCrew with handoff support.

        This crew uses LangGraph's handoff mechanism for dynamic task coordination.
        The workflow starts with the chief_qa_engineer_agent (marked as is_entry: true)
        and proceeds based on agent handoff decisions.

        Returns:
            Crew: Configured crew with agent handoff support
        """
        return Crew(
            agents=self.agents,
            verbose=True,
        )
