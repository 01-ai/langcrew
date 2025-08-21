import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task

from langcrew_tools.search.langchain_tools import WebSearchTool
from langcrew_tools.fetch.langchain_tools import WebFetchTool


load_dotenv()

# Tools
web_search_tool = WebSearchTool()
web_fetch_tool = WebFetchTool()


@CrewBase
class DeepResearchCrew:
    """Deep research crew with planning, evidence gathering, and synthesis."""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )

    @agent
    def planner(self) -> Agent:
        return Agent(
            config=self.agents_config["planner"],
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["researcher"],
            llm=self._get_default_llm(),
            tools=[
                web_search_tool,
                web_fetch_tool,
            ],
            verbose=True,
        )

    @agent
    def fact_checker(self) -> Agent:
        return Agent(
            config=self.agents_config["fact_checker"],
            llm=self._get_default_llm(),
            tools=[web_search_tool, web_fetch_tool],
            verbose=True,
        )

    @agent
    def writer(self) -> Agent:
        return Agent(
            config=self.agents_config["writer"],
            llm=self._get_default_llm(),
            verbose=True,
        )

    @task
    def planning_task(self) -> Task:
        return Task(
            config=self.tasks_config["planning_task"],
            agent=self.planner(),
        )

    @task
    def gather_evidence_task(self) -> Task:
        return Task(
            config=self.tasks_config["gather_evidence_task"],
            agent=self.researcher(),
        )

    @task
    def analyze_and_summarize_task(self) -> Task:
        return Task(
            config=self.tasks_config["analyze_and_summarize_task"],
            agent=self.researcher(),
        )

    @task
    def fact_check_task(self) -> Task:
        return Task(
            config=self.tasks_config["fact_check_task"],
            agent=self.fact_checker(),
        )

    @task
    def write_report_task(self) -> Task:
        return Task(
            config=self.tasks_config["write_report_task"],
            agent=self.writer(),
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True,
        )
