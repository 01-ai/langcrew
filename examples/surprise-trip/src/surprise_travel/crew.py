from langchain_community.document_loaders import WebBaseLoader
from langchain_community.tools import Tool
from langchain_community.utilities import GoogleSerperAPIWrapper
from langcrew import Agent, Crew, Task
from langcrew.llm_factory import LLMFactory
from langcrew.project import CrewBase, agent, crew, task

# Import tool converter
from pydantic import BaseModel, Field


# Simple tool conversion function
def get_research_tools():
    """Get converted research tools"""
    return [_create_web_fetch_tool(), _create_serper_search_tool()]


def get_serper_tools():
    """Get converted serper tools"""
    return [_create_serper_search_tool()]


def _create_serper_search_tool() -> Tool:
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


def _create_web_fetch_tool() -> Tool:
    def fetch_url(url: str) -> str:
        try:
            loader = WebBaseLoader(web_paths=[url])
            docs = loader.load()
            if docs:
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


class Activity(BaseModel):
    name: str = Field(..., description="Name of the activity")
    location: str = Field(..., description="Location of the activity")
    description: str = Field(..., description="Description of the activity")
    date: str = Field(..., description="Date of the activity")
    cuisine: str = Field(..., description="Cuisine of the restaurant")
    why_its_suitable: str = Field(..., description="Why it's suitable for the traveler")
    reviews: list[str] | None = Field(default=None, description="List of reviews")
    rating: float | None = Field(default=None, description="Rating of the activity")


class DayPlan(BaseModel):
    date: str = Field(..., description="Date of the day")
    activities: list[Activity] = Field(..., description="List of activities")
    restaurants: list[str] = Field(..., description="List of restaurants")
    flight: str | None = Field(None, description="Flight information")


class Itinerary(BaseModel):
    name: str = Field(..., description="Name of the itinerary, something funny")
    day_plans: list[DayPlan] = Field(..., description="List of day plans")
    hotel: str = Field(..., description="Hotel information")


@CrewBase
class SurpriseTravelCrew:
    """SurpriseTravel crew"""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return LLMFactory.create_llm({
            "provider": "openai",
            "model": "gpt-5-mini",
        })

    @agent
    def personalized_activity_planner(self) -> Agent:
        return Agent(
            config=self.agents_config["personalized_activity_planner"],
            tools=get_research_tools(),  # Example of custom tool, loaded at the beginning of file
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def restaurant_scout(self) -> Agent:
        return Agent(
            config=self.agents_config["restaurant_scout"],
            tools=get_research_tools(),
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def itinerary_compiler(self) -> Agent:
        return Agent(
            config=self.agents_config["itinerary_compiler"],
            tools=get_serper_tools(),
            llm=self._get_default_llm(),
            verbose=True,
        )

    @task
    def personalized_activity_planning_task(self) -> Task:
        return Task(
            config=self.tasks_config["personalized_activity_planning_task"],
            agent=self.personalized_activity_planner(),
        )

    @task
    def restaurant_scenic_location_scout_task(self) -> Task:
        return Task(
            config=self.tasks_config["restaurant_scenic_location_scout_task"],
            agent=self.restaurant_scout(),
        )

    @task
    def itinerary_compilation_task(self) -> Task:
        return Task(
            config=self.tasks_config["itinerary_compilation_task"],
            agent=self.itinerary_compiler(),
            output_json=Itinerary,
        )

    @crew
    def crew(self) -> Crew:
        """Creates the SurpriseTravel crew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            verbose=True,
        )
