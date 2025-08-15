# Add default LLM import
import os

# Uncomment the following line to use an example of a custom tool
# from surprise_travel.tools.custom_tool import MyCustomTool
# Check our tools documentations for more information on how to use them
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task

# Import tool converter
from langcrew_tools.fetch.langchain_tools import WebFetchTool
from langcrew_tools.search.langchain_tools import WebSearchTool


# Simple tool conversion function
def get_research_tools():
    """Get converted research tools"""
    return [WebFetchTool(), WebSearchTool()]


def get_serper_tools():
    """Get converted serper tools"""
    return [WebSearchTool()]


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
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )

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
