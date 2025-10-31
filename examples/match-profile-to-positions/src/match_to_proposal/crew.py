"""Match Profile to Positions Crew"""

from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task
from langcrew.llm_factory import LLMFactory
from .tools.custom_tools import FileReadTool, CSVAnalyzerTool
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Initialize tools
file_read_tool = FileReadTool()
csv_analyzer_tool = CSVAnalyzerTool()


@CrewBase
class MatchProfileCrew:
    """Crew for matching CV profiles to job positions"""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _get_llm(self):
        """Get default LLM for agents"""
        return LLMFactory.create_llm(
            {
                "provider": "openai",
                "model": "gpt-5-mini",
            }
        )

    @agent
    def cv_analyzer(self) -> Agent:
        return Agent(
            config=self.agents_config["cv_analyzer"],
            tools=[file_read_tool],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
        )

    @agent
    def job_matcher(self) -> Agent:
        return Agent(
            config=self.agents_config["job_matcher"],
            tools=[file_read_tool, csv_analyzer_tool],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
        )

    @task
    def analyze_cv(self) -> Task:
        return Task(
            config=self.tasks_config["analyze_cv"],
            agent=self.cv_analyzer(),
        )

    @task
    def match_positions(self) -> Task:
        return Task(
            config=self.tasks_config["match_positions"],
            agent=self.job_matcher(),
        )

    @crew
    def crew(self) -> Crew:
        """Creates the MatchProfileCrew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            verbose=True,
        )
