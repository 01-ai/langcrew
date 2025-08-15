import os

from langchain_openai import ChatOpenAI

from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task
from langcrew_tools.fetch.langchain_tools import WebFetchTool
from langcrew_tools.search.langchain_tools import WebSearchTool
from langcrew.tools.converter import convert_tools
from recruitment.tools.linkedin import LinkedInTool


# Simple tool conversion function
def get_research_tools():
    """Get converted research tools"""
    return convert_tools([LinkedInTool()]) + [WebFetchTool(), WebSearchTool()]


def get_matching_tools():
    """Get converted matching tools"""
    return [WebFetchTool(), WebSearchTool()]


@CrewBase
class RecruitmentCrew:
    """Recruitment crew"""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )

    @agent
    def researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["researcher"],
            tools=get_research_tools(),
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def matcher(self) -> Agent:
        return Agent(
            config=self.agents_config["matcher"],
            tools=get_matching_tools(),
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def communicator(self) -> Agent:
        return Agent(
            config=self.agents_config["communicator"],
            tools=get_matching_tools(),
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def reporter(self) -> Agent:
        return Agent(
            config=self.agents_config["reporter"],
            llm=self._get_default_llm(),
            verbose=True,
            # allow_delegation=False,
        )

    @task
    def research_candidates_task(self) -> Task:
        return Task(
            config=self.tasks_config["research_candidates_task"],
            agent=self.researcher(),
        )

    @task
    def match_and_score_candidates_task(self) -> Task:
        return Task(
            config=self.tasks_config["match_and_score_candidates_task"],
            agent=self.matcher(),
        )

    @task
    def outreach_strategy_task(self) -> Task:
        return Task(
            config=self.tasks_config["outreach_strategy_task"],
            agent=self.communicator(),
        )

    @task
    def report_candidates_task(self) -> Task:
        return Task(
            config=self.tasks_config["report_candidates_task"],
            agent=self.reporter(),
            context=[
                self.research_candidates_task(),
                self.match_and_score_candidates_task(),
                self.outreach_strategy_task(),
            ],
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Recruitment crew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            verbose=True,
        )
