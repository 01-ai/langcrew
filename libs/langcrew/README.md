# 🚀 LangCrew

> **A LangChain-based crew management system for building intelligent multi-agent workflows**

[![PyPI version](https://badge.fury.io/py/langcrew.svg)](https://badge.fury.io/py/langcrew)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![Type checked with mypy](https://img.shields.io/badge/mypy-checked-blue)](https://mypy-lang.org/)

## 🔗 Related Projects

- **LangChain**: [github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain)
- **LangGraph**: [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- **CrewAI**: [github.com/joaomdmoura/crewAI](https://github.com/joaomdmoura/crewAI)

## ⚡ Quick Install

```bash
# Install from PyPI
pip install --extra-index-url="https://nexus.lingyiwanwu.net/repository/pypi-hosted/simple" langcrew

# Install with optional dependencies
pip install --extra-index-url="https://nexus.lingyiwanwu.net/repository/pypi-hosted/simple" "langcrew[redis,mongodb]"

# Install from source
git clone https://github.com/01-ai/langcrew.git
cd langcrew/libs/langcrew
pip install -e .
```

## 🤔 What is this?

LangCrew is a high-level multi-agent development framework built on LangGraph, offering out-of-the-box core capabilities to help construct complex agent collaboration systems.

### 🎯 Core Problems Solved
1. Beyond Traditional Flexible Paradigms: Provides a simple, highly configurable development experience, featuring powerful built-in mechanisms such as HITL (Human-in-the-Loop), dynamic workflow orchestration, and event-driven processes—empowering stronger agent collaboration.
2. Full-Stack Support for Productization: Comes with an accompanying Agent-UI protocol and React component library, enabling the frontend to clearly visualize agent planning, scheduling, execution processes, and tool invocation details. This significantly accelerates the journey from agent development to productization, allowing for rapid delivery to users.
3. Application Templates for Fast Launch: Offers a rich variety of ready-to-use templates, enabling rapid prototyping and deployment of multi-agent solutions across a wide range of industries and scenarios.
4. Integrated Development and Operations Support: Integrates free SaaS services, seamlessly covering system construction, deep observability, sandbox environments, and deployment resources—simplifying the entire lifecycle from development to operations.


### 🔗 Real-World Applications

- **Recruitment Systems**: [examples/recruitment/](https://github.com/01-ai/langcrew/tree/main/examples/recruitment)
- **Marketing Strategy**: [examples/marketing-strategy/](https://github.com/01-ai/langcrew/tree/main/examples/marketing-strategy)
- **Game Development**: [examples/game-builder-crew/](https://github.com/01-ai/langcrew/tree/main/examples/game-builder-crew)
- **Trip Planning**: [examples/surprise-trip/](https://github.com/01-ai/langcrew/tree/main/examples/surprise-trip)
- **Jop Posting**: [examples/job-posting/](https://github.com/01-ai/langcrew/tree/main/examples/job-posting)


## 🚀 What can this help with?

### 🟢 **Beginner Level** - Basic Multi-Agent Workflows
- **Simple Agent Creation**: Define agents with roles, goals, and backstories
- **Task Orchestration**: Create sequential or parallel task workflows
- **Basic Tool Integration**: Use built-in tools for common operations
- **CrewAI Compatibility**: Familiar CrewAI-style decorators and patterns

### 🟡 **Intermediate Level** - Advanced Workflow Features
- **Memory Management**: Persistent short-term and long-term memory
- **Custom Executors**: ReAct, Plan-and-Execute, and custom execution strategies
- **State Management**: Built-in checkpointing with multiple backend support
- **Error Handling**: Robust error handling and recovery mechanisms

### 🔴 **Advanced Level** - Enterprise-Grade Features
- **MCP Integration**: Connect to external tools and services via Model Context Protocol
- **Human-in-the-Loop**: Add approval workflows and human oversight
- **Security & Guardrails**: Input/output validation and security checks

## 🎯 Application Scenarios

### 📊 **Business Applications**
- **Content Creation**: Multi-agent content generation workflows
- **Data Analysis**: Coordinated data processing and reporting
- **Customer Service**: Intelligent customer support automation
- **Project Management**: AI-powered project planning and execution

### 🔧 **Technical Applications**
- **API Orchestration**: Coordinate multiple external services
- **Data Pipelines**: Build intelligent ETL workflows
- **Testing Automation**: Multi-agent testing and quality assurance
- **DevOps Automation**: Intelligent infrastructure management

### 🎮 **Creative Applications**
- **Game Development**: AI-driven game content generation
- **Storytelling**: Collaborative story creation workflows
- **Design Systems**: AI-powered design and prototyping
- **Music Composition**: Multi-agent musical composition

## 🚀 Getting Started Examples

### **Basic Multi-Agent Workflow**
To create a new LangCrew project, like this:

```
my_project/
├── .gitignore
├── pyproject.toml
├── README.md
├── .env
└── src/
    └── my_project/
        ├── __init__.py
        ├── main.py
        ├── crew.py
        ├── tools/
        │   ├── custom_tool.py
        │   └── __init__.py
        └── config/
            ├── agents.yaml
            └── tasks.yaml
```

You can now start developing your crew by editing the files in the `src/my_project` folder. The `main.py` file is the entry point of the project, the `crew.py` file is where you define your crew, the `agents.yaml` file is where you define your agents, and the `tasks.yaml` file is where you define your tasks.

#### To customize your project, you can:

- Modify `src/my_project/config/agents.yaml` to define your agents.
- Modify `src/my_project/config/tasks.yaml` to define your tasks.
- Modify `src/my_project/crew.py` to add your own logic, tools, and specific arguments.
- Modify `src/my_project/main.py` to add custom inputs for your agents and tasks.
- Add your environment variables into the `.env` file.

#### Example of a simple crew with a sequential process:

Instantiate your crew:

```shell
crewai create crew game-builder-crew
```

Modify the files as needed to fit your use case:

**agents.yaml**

```yaml
# src/my_project/config/agents.yaml
personalized_activity_planner:
  role: >
    Activity Planner
  goal: >
    Research and find cool things to do at the destination, including activities and events that match the traveler's interests and age group
  backstory: >
    You are skilled at creating personalized itineraries that cater to the specific preferences and demographics of travelers.

restaurant_scout:
  role: >
    Restaurant Scout
  goal: >
    Find highly-rated restaurants and dining experiences at the destination, and recommend scenic locations and fun activities
  backstory: >
    As a food lover, you know the best spots in town for a delightful culinary experience. You also have a knack for finding picturesque and entertaining locations.

itinerary_compiler:
  role: >
    Itinerary Compiler
  goal: >
    Compile all researched information into a comprehensive day-by-day itinerary, ensuring the integration of flights and hotel information
  backstory: >
    With an eye for detail, you organize all the information into a coherent and enjoyable travel plan.
```

**tasks.yaml**

```yaml
# src/my_project/config/tasks.yaml
personalized_activity_planning_task:
  description: >
    Research and find cool things to do at {destination}.
    Focus on activities and events that match the traveler's interests and age group.
    Utilize internet search tools and recommendation engines to gather the information.

    Traveler's information:

    - origin: {origin}

    - destination: {destination}

    - age of the traveler: {age}

    - hotel localtion: {hotel_location}

    - flight infromation: {flight_information}

    - how long is the trip: {trip_duration}
  expected_output: >
    A list of recommended activities and events for each day of the trip.
    Each entry should include the activity name, location, a brief description, and why it's suitable for the traveler.
    And potential reviews and ratings of the activities.

restaurant_scenic_location_scout_task:
  description: >
    Find highly-rated restaurants and dining experiences at {destination}.
    Recommend scenic locations and fun activities that align with the traveler's preferences.
    Use internet search tools, restaurant review sites, and travel guides.
    Make sure to find a variety of options to suit different tastes and budgets, and ratings for them.

    Traveler's information:

    - origin: {origin}

    - destination: {destination}

    - age of the traveler: {age}

    - hotel localtion: {hotel_location}

    - flight infromation: {flight_information}

    - how long is the trip: {trip_duration}
  expected_output: >
    A list of recommended restaurants, scenic locations, and fun activities for each day of the trip.
    Each entry should include the name, location (address), type of cuisine or activity, and a brief description and ratings.

itinerary_compilation_task:
  description: >
    Compile all researched information into a comprehensive day-by-day itinerary for the trip to {destination}.
    Ensure the itinerary integrates flights, hotel information, and all planned activities and dining experiences.
    Use text formatting and document creation tools to organize the information.
  expected_output: >
    A detailed itinerary document, the itinerary should include a day-by-day
    plan with flights, hotel details, activities, restaurants, and scenic locations.
```

**tools/custom_tool.py**
```python
# src/my_project/tools/custom_tool.py
from crewai_tools import BaseTool


class MyCustomTool(BaseTool):
    name: str = "Name of my tool"
    description: str = (
        "Clear description for what this tool is useful for, you agent will need this information to use it."
    )

    def _run(self, argument: str) -> str:
        # Implementation goes here
        return "this is an example of a tool output, ignore it and move along."
```

**crew.py**

```python
# src/my_project/crew.py
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
    return [WebFetchTool(),WebSearchTool()]

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
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )
        
    @agent
    def personalized_activity_planner(self) -> Agent:
        return Agent(
            config=self.agents_config['personalized_activity_planner'],
            tools=get_research_tools(), # Example of custom tool, loaded at the beginning of file
            llm=self._get_default_llm(),
            verbose=True,
            
        )

    @agent
    def restaurant_scout(self) -> Agent:
        return Agent(
            config=self.agents_config['restaurant_scout'],
            tools=get_research_tools(),
            llm=self._get_default_llm(),
            verbose=True,
            
        )

    @agent
    def itinerary_compiler(self) -> Agent:
        return Agent(
            config=self.agents_config['itinerary_compiler'],
            tools=get_serper_tools(),
            llm=self._get_default_llm(),
            verbose=True,
            
        )

    @task
    def personalized_activity_planning_task(self) -> Task:
        return Task(
            config=self.tasks_config['personalized_activity_planning_task'],
            agent=self.personalized_activity_planner()
        )

    @task
    def restaurant_scenic_location_scout_task(self) -> Task:
        return Task(
            config=self.tasks_config['restaurant_scenic_location_scout_task'],
            agent=self.restaurant_scout()
        )

    @task
    def itinerary_compilation_task(self) -> Task:
        return Task(
            config=self.tasks_config['itinerary_compilation_task'],
            agent=self.itinerary_compiler(),
            output_json=Itinerary
        )

    @crew
    def crew(self) -> Crew:
        """Creates the SurpriseTravel crew"""
        return Crew(
            agents=self.agents, # Automatically created by the @agent decorator
            tasks=self.tasks, # Automatically created by the @task decorator
            verbose=True,
        )
```

**main.py**

```python
#!/usr/bin/env python
# src/my_project/main.py
from dotenv import load_dotenv
from surprise_travel.crew import SurpriseTravelCrew

load_dotenv()


def run():
    # Replace with your inputs, it will automatically interpolate any tasks and agents information
    inputs = {
        "origin": "São Paulo, GRU",
        "destination": "New York, JFK",
        "age": 31,
        "hotel_location": "Brooklyn",
        "flight_information": "GOL 1234, leaving at June 30th, 2024, 10:00",
        "trip_duration": "14 days",
    }
    result = SurpriseTravelCrew().crew().kickoff(inputs=inputs)
    print(result)


if __name__ == "__main__":
    run()
```


## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### **Ways to Contribute**
- 🐛 **Report Bugs**: Open issues for bugs or feature requests
- 💡 **Suggest Features**: Propose new features or improvements
- 📝 **Improve Documentation**: Help make our docs better
- 🔧 **Submit Code**: Contribute bug fixes or new features
- 🧪 **Test**: Help test and validate new releases

### **Development Setup**
```bash
# Clone the repository
git clone https://github.com/01-ai/langcrew.git
cd langcrew/libs/langcrew

# Install development dependencies
pip install -e "."

# Run linting
ruff check .

# Run type checking
mypy langcrew/
```

How to run the test [libs/langcrew/tests/] (https://github.com/01-ai/langcrew/tree/main/libs/langcrew/tests/)

### **Community Resources**
- 🐛 **Issues**: [GitHub Issues](https://github.com/01-ai/langcrew/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/langcrew/langcrew/discussions)
- 📧 **Email**: [btm@langcrew.ai](mailto:btm@langcrew.ai)


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the LangCrew Team**
