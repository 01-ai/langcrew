from typing import List
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


# Create Serper search tool (replaces SerperDevTool)
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


# Create web scrape tool (replaces ScrapeWebsiteTool)
def _create_web_scrape_tool() -> Tool:
    """Create a web content scraping tool based on WebBaseLoader"""

    def scrape_url(url: str) -> str:
        """Scrape webpage content and return as text"""
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
            return f"Error scraping webpage: {str(e)}"

    return Tool(
        name="web_scrape",
        description=(
            "Scrape a web page and extract its content in text format. "
            "Automatically filters out navigation, ads, and other irrelevant content. "
            "Input should be a valid URL string."
        ),
        func=scrape_url,
    )


# Initialize tools
web_search_tool = _create_serper_search_tool()
web_scrape_tool = _create_web_scrape_tool()


class MarketStrategy(BaseModel):
    """Market strategy model"""

    name: str = Field(description="Name of the market strategy")
    tatics: List[str] = Field(
        description="List of tactics to be used in the market strategy"
    )
    channels: List[str] = Field(
        description="List of channels to be used in the market strategy"
    )
    KPIs: List[str] = Field(
        description="List of KPIs to be used in the market strategy"
    )


class CampaignIdea(BaseModel):
    """Campaign idea model"""

    name: str = Field(description="Name of the campaign idea")
    description: str = Field(description="Description of the campaign idea")
    audience: str = Field(description="Audience of the campaign idea")
    channel: str = Field(description="Channel of the campaign idea")


class Copy(BaseModel):
    """Copy model"""

    title: str = Field(description="Title of the copy")
    body: str = Field(description="Body of the copy")


@CrewBase
class MarketingPostsCrew:
    """MarketingPosts crew"""

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
    def lead_market_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config["lead_market_analyst"],
            tools=[web_search_tool, web_scrape_tool],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
        )

    @agent
    def chief_marketing_strategist(self) -> Agent:
        return Agent(
            config=self.agents_config["chief_marketing_strategist"],
            tools=[web_search_tool, web_scrape_tool],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
        )

    @agent
    def creative_content_creator(self) -> Agent:
        return Agent(
            config=self.agents_config["creative_content_creator"],
            llm=self._get_llm(),
            verbose=True,
            debug=True,
        )

    @task
    def research_task(self) -> Task:
        return Task(
            config=self.tasks_config["research_task"],
            agent=self.lead_market_analyst(),
        )

    @task
    def project_understanding_task(self) -> Task:
        return Task(
            config=self.tasks_config["project_understanding_task"],
            agent=self.chief_marketing_strategist(),
        )

    @task
    def marketing_strategy_task(self) -> Task:
        return Task(
            config=self.tasks_config["marketing_strategy_task"],
            agent=self.chief_marketing_strategist(),
            output_json=MarketStrategy,
        )

    @task
    def campaign_idea_task(self) -> Task:
        return Task(
            config=self.tasks_config["campaign_idea_task"],
            agent=self.creative_content_creator(),
            output_json=CampaignIdea,
        )

    @task
    def copy_creation_task(self) -> Task:
        return Task(
            config=self.tasks_config["copy_creation_task"],
            agent=self.creative_content_creator(),
            context=[self.marketing_strategy_task(), self.campaign_idea_task()],
            output_json=Copy,
        )

    @crew
    def crew(self) -> Crew:
        """Creates the MarketingPosts crew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            verbose=True,
        )
