from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task
from langcrew.llm_factory import LLMFactory
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_community.document_loaders import WebBaseLoader
from langchain_core.tools import Tool
import logging

# Setup logging
logger = logging.getLogger(__name__)


# Create Serper search tool
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


# Create web fetch tool
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


@CrewBase
class DeepResearchCrew:
    """Deep research crew with planning, evidence gathering, and synthesis."""

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
    def planner(self) -> Agent:
        return Agent(
            config=self.agents_config["planner"],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
        )

    @agent
    def researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["researcher"],
            llm=self._get_llm(),
            tools=[web_search_tool, web_fetch_tool],
            verbose=True,
            debug=True,
        )

    @agent
    def fact_checker(self) -> Agent:
        return Agent(
            config=self.agents_config["fact_checker"],
            llm=self._get_llm(),
            tools=[web_search_tool, web_fetch_tool],
            verbose=True,
            debug=True,
        )

    @agent
    def writer(self) -> Agent:
        return Agent(
            config=self.agents_config["writer"],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
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
        """Creates the DeepResearchCrew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            verbose=True,
        )
