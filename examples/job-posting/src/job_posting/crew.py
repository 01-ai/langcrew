from pydantic import BaseModel, Field

from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task
from langcrew.llm_factory import LLMFactory
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_community.document_loaders import WebBaseLoader
from langchain_core.tools import Tool
import logging

# Setup logging
logger = logging.getLogger(__name__)


# Create Serper search tool (replaces WebSearchTool)
def _create_serper_search_tool() -> Tool:
    """Create a web search tool based on Google Serper API"""
    search = GoogleSerperAPIWrapper()

    return Tool(
        name="web_search",
        description=(
            "Perform web search to obtain the latest information related to the query. "
            "Returns search results containing titles, URLs and snippets. "
            "Input should be a search query string."
        ),
        func=search.run,
    )


# Create web fetch tool (replaces WebFetchTool)
def _create_web_fetch_tool() -> Tool:
    """Create a web content fetching tool based on WebBaseLoader"""

    def fetch_url(url: str) -> str:
        """Fetch webpage content and return as text"""
        try:
            loader = WebBaseLoader(web_paths=[url])
            docs = loader.load()
            if docs:
                # Return page content, limit length to avoid excessive size
                content = docs[0].page_content
                if len(content) > 50000:
                    content = content[:50000] + "\n\n[Content truncated...]"
                return content
            return "No content extracted from the webpage."
        except Exception as e:
            return f"Error fetching webpage: {str(e)}"

    return Tool(
        name="web_fetch",
        description=(
            "Crawl a web page and extract its content in text format. "
            "Automatically filters out navigation, ads, and other irrelevant content. "
            "Input should be a valid URL string."
        ),
        func=fetch_url,
    )


# Initialize tools
web_search_tool = _create_serper_search_tool()
web_fetch_tool = _create_web_fetch_tool()


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

    def _get_llm(self):
        """Get default LLM for agents"""
        return LLMFactory.create_llm(
            {
                "provider": "openai",
                "model": "gpt-5-mini",
            }
        )

    @agent
    def research_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["research_agent"],
            tools=[web_search_tool, web_fetch_tool],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
        )

    @agent
    def writer_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["writer_agent"],
            tools=[web_search_tool, web_fetch_tool],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
        )

    @agent
    def review_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["review_agent"],
            tools=[web_search_tool, web_fetch_tool],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
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
