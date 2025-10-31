"""
Game Builder Crew - Task-based Workflow

This module defines a task-based sequential workflow where tasks are executed
in a predefined order with dependencies between them.
"""

import logging

from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task

# Setup logging
logger = logging.getLogger(__name__)


@CrewBase
class TasksCrew:
    """
    Game Builder crew using task-based sequential workflow.

    This crew demonstrates traditional task-based workflow where tasks are
    executed sequentially with predefined dependencies and task handoffs.
    """

    agents_config = "config/task/agents.yaml"
    tasks_config = "config/task/tasks.yaml"

    @agent
    def chief_qa_engineer_agent(self) -> Agent:
        """
        Chief QA Engineer - Workflow coordinator.

        Responsible for analyzing requirements and coordinating the development process.

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

        Handles the complete implementation of game code based on specifications.

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
        QA Engineer - Code review specialist.

        Reviews code for errors, bugs, and quality improvements.

        Returns:
            Agent: Configured QA engineer agent
        """
        return Agent(
            config=self.agents_config["qa_engineer_agent"],
            verbose=True,
            debug=True,
        )

    @agent
    def summary_agent(self) -> Agent:
        """
        Summary Agent - Project documentation specialist.

        Provides comprehensive summaries of completed development work.

        Returns:
            Agent: Configured summary agent
        """
        return Agent(
            config=self.agents_config["summary_agent"],
            verbose=True,
            debug=True,
        )

    @task
    def evaluate_task(self) -> Task:
        """
        Evaluate task - Initial analysis and coordination.

        Analyzes game requirements and coordinates the development workflow.
        Can handoff to code_task for implementation.

        Returns:
            Task: Configured evaluate task
        """
        return Task(
            config=self.tasks_config["evaluate_task"],
            agent=self.chief_qa_engineer_agent(),
        )

    @task
    def code_task(self) -> Task:
        """
        Code task - Game implementation.

        Implements the complete game code based on specifications.
        Hands off to review_task after completion.

        Returns:
            Task: Configured code task
        """
        return Task(
            config=self.tasks_config["code_task"],
            agent=self.senior_engineer_agent(),
        )

    @task
    def review_task(self) -> Task:
        """
        Review task - Code quality assurance.

        Reviews code for errors, syntax issues, and security vulnerabilities.

        Returns:
            Task: Configured review task
        """
        return Task(
            config=self.tasks_config["review_task"],
            agent=self.qa_engineer_agent(),
        )

    @task
    def end_task(self) -> Task:
        """
        End task - Final project summary.

        Provides a comprehensive summary of all completed work.

        Returns:
            Task: Configured end task
        """
        return Task(
            config=self.tasks_config["end_task"],
            agent=self.summary_agent(),
        )

    @crew
    def crew(self) -> Crew:
        """
        Creates the GameBuilderCrew with task-based workflow.

        This crew uses a sequential task workflow where tasks are executed
        in a predefined order with handoff capabilities between tasks.

        Returns:
            Crew: Configured crew with task-based workflow
        """
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True,
        )
