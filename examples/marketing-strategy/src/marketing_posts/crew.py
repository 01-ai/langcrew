from typing import List
from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task

# Uncomment the following line to use an example of a custom tool
# from marketing_posts.tools.custom_tool import MyCustomTool

# Check our tools documentations for more information on how to use them
from crewai_tools import SerperDevTool, ScrapeWebsiteTool
from pydantic import BaseModel, Field

# Add default LLM import
import os
from langchain_openai import ChatOpenAI

# Import tool converter
from langcrew.tools.tool_converter import convert_tools


# Simple tool conversion function
def get_research_tools():
    """Get converted research tools"""
    return convert_tools([SerperDevTool(), ScrapeWebsiteTool()])


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

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )

    @agent
    def lead_market_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config["lead_market_analyst"],
            tools=get_research_tools(),
            llm=self._get_default_llm(),
            verbose=True,
            debug=True,
        )

    @agent
    def chief_marketing_strategist(self) -> Agent:
        return Agent(
            config=self.agents_config["chief_marketing_strategist"],
            tools=get_research_tools(),
            llm=self._get_default_llm(),
            verbose=True,
            debug=True,
        )

    @agent
    def creative_content_creator(self) -> Agent:
        return Agent(
            config=self.agents_config["creative_content_creator"],
            llm=self._get_default_llm(),
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
            memory=True,  # Enable memory system
        )
