from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task


@CrewBase
class TasksCrew:
    """GameBuilder crew"""

    agents_config = "config/task/agents.yaml"
    tasks_config = "config/task/tasks.yaml"

    @agent
    def chief_qa_engineer_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["chief_qa_engineer_agent"],
            verbose=True,
        )

    @agent
    def senior_engineer_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["senior_engineer_agent"],
            verbose=True,
        )

    @agent
    def qa_engineer_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["qa_engineer_agent"],
            verbose=True,
        )

    @agent
    def summary_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["summary_agent"],
            verbose=True,
        )

    @task
    def evaluate_task(self) -> Task:
        return Task(
            config=self.tasks_config["evaluate_task"],
            agent=self.chief_qa_engineer_agent(),
        )

    @task
    def code_task(self) -> Task:
        return Task(
            config=self.tasks_config["code_task"],
            agent=self.senior_engineer_agent(),
        )

    @task
    def review_task(self) -> Task:
        return Task(
            config=self.tasks_config["review_task"],
            agent=self.qa_engineer_agent(),
        )

    @task
    def end_task(self) -> Task:
        return Task(
            config=self.tasks_config["end_task"],
            agent=self.summary_agent(),
        )

    @crew
    def crew(self) -> Crew:
        """Creates the GameBuilderCrew with task handoff support"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Enable task handoff mode
            verbose=True,
        )
