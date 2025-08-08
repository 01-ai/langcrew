import os

from crewai_tools import (
    FileReadTool,
    WebsiteSearchTool,
)
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task
from langcrew_tools.search.langchain_tools import WebSearchTool
from langcrew.tools.tool_converter import ToolConverter
from dotenv import load_dotenv

load_dotenv()

web_search_tool = ToolConverter.convert_tool(WebsiteSearchTool())
seper_dev_tool = WebSearchTool()
file_read_tool = ToolConverter.convert_tool(
    FileReadTool(
        file_path="job_description_example.md",
        description="A tool to read the job description example file.",
    )
)


class ResearchRoleRequirements(BaseModel):
    """Research role requirements model"""

    skills: list[str] = Field(
        ...,
        description="List of recommended skills for the ideal candidate aligned with the company's culture, ongoing projects, and the specific role's requirements.",
    )
    experience: list[str] = Field(
        ...,
        description="List of recommended experience for the ideal candidate aligned with the company's culture, ongoing projects, and the specific role's requirements.",
    )
    qualities: list[str] = Field(
        ...,
        description="List of recommended qualities for the ideal candidate aligned with the company's culture, ongoing projects, and the specific role's requirements.",
    )


@CrewBase
class JobPostingCrew:
    """JobPosting crew"""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )

    @agent
    def research_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["research_agent"],
            tools=[web_search_tool, seper_dev_tool],
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def writer_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["writer_agent"],
            tools=[web_search_tool, seper_dev_tool, file_read_tool],
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def review_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["review_agent"],
            tools=[web_search_tool, seper_dev_tool, file_read_tool],
            llm=self._get_default_llm(),
            verbose=True,
        )

    @task
    def research_company_culture_task(self) -> Task:
        return Task(
            config=self.tasks_config["research_company_culture_task"],
            agent=self.research_agent(),
        )

    @task
    def research_role_requirements_task(self) -> Task:
        return Task(
            config=self.tasks_config["research_role_requirements_task"],
            agent=self.research_agent(),
            output_json=ResearchRoleRequirements,
        )

    @task
    def draft_job_posting_task(self) -> Task:
        return Task(
            config=self.tasks_config["draft_job_posting_task"],
            agent=self.writer_agent(),
        )

    @task
    def review_and_edit_job_posting_task(self) -> Task:
        return Task(
            config=self.tasks_config["review_and_edit_job_posting_task"],
            agent=self.review_agent(),
        )

    @task
    def industry_analysis_task(self) -> Task:
        return Task(
            config=self.tasks_config["industry_analysis_task"],
            agent=self.research_agent(),
        )

    @crew
    def crew(self) -> Crew:
        """Creates the JobPostingCrew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            verbose=True,
        )
