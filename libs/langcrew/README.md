# LangCrew

> **A high-level multi-agent development framework built on LangGraph for building intelligent workflows with ease**

[![PyPI version](https://badge.fury.io/py/langcrew.svg)](https://badge.fury.io/py/langcrew)
[![Downloads](https://static.pepy.tech/badge/langcrew/month)](https://pepy.tech/project/langcrew)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![Type checked with mypy](https://img.shields.io/badge/mypy-checked-blue)](https://mypy-lang.org/)
[![Tests](https://img.shields.io/badge/tests-passing-green.svg)](https://github.com/01-ai/langcrew/actions)

LangCrew simplifies multi-agent development by providing powerful built-in capabilities like human-in-the-loop workflows, dynamic orchestration, and event-driven processes—making complex agent collaboration accessible to developers at any skill level.

## Quick Start

Install LangCrew:

```bash
pip install --extra-index-url="https://nexus.lingyiwanwu.net/repository/pypi-hosted/simple" langcrew
```

Create your first multi-agent workflow:

```python
import os
# Note: You'll need to install: pip install langchain-openai
from langchain_openai import ChatOpenAI
from langcrew import Agent, Task, Crew

# Create agents
researcher = Agent(
    role="Research Analyst",
    goal="Find and analyze information about any topic",
    backstory="You excel at finding key information and insights",
    llm=ChatOpenAI(model="gpt-4.1", api_key=os.getenv("OPENAI_API_KEY"))
)

writer = Agent(
    role="Content Writer", 
    goal="Create engaging content based on research",
    backstory="You're skilled at turning complex information into clear, compelling content",
    llm=ChatOpenAI(model="gpt-4.1", api_key=os.getenv("OPENAI_API_KEY"))
)

# Define tasks
research_task = Task(
    description="Research the latest trends in {topic}",
    agent=researcher,
    expected_output="A comprehensive analysis of current trends"
)

write_task = Task(
    description="Write a blog post about the research findings",
    agent=writer,
    expected_output="A well-structured blog post"
)

# Create and run crew
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task]
)

result = crew.kickoff(inputs={"topic": "AI agents"})
print(result)
```

That's it! Your agents will collaborate to research and write about any topic you choose.

## Why Choose LangCrew?

LangCrew bridges the gap between the flexibility of LangGraph and the simplicity of CrewAI, giving you the best of both worlds.

### **Rapid Development**
Go from idea to working multi-agent system in minutes, not hours. Our intuitive API and pre-built components eliminate boilerplate code while maintaining full customization power.

### **Advanced Workflows**
Built on LangGraph's robust foundation, LangCrew supports complex workflows including conditional routing, parallel execution, human-in-the-loop processes, and persistent memory.

### **Production Ready**
Complete with Agent-UI protocol and React components for visualizing agent workflows. Deploy confidently with built-in error handling, monitoring, and scaling capabilities.

### **Developer Experience**
Familiar CrewAI-style decorators and patterns, extensive documentation, and rich ecosystem of tools and templates make development enjoyable and productive.




## Core Capabilities

**For Beginners**: Start with simple agent creation, basic task orchestration, and familiar CrewAI-style patterns

**For Teams**: Add memory management, custom execution strategies, state persistence, and robust error handling

**For Enterprise**: Deploy with MCP integration, human-in-the-loop workflows, security guardrails, and production monitoring

## Documentation

### Core Concepts
- **[Agents](../../docs/src/content/docs/concepts/agents.mdx)**: Learn about intelligent agent creation and configuration
- **[Tasks](../../docs/src/content/docs/concepts/tasks.mdx)**: Understand task definition and orchestration
- **[Crews](../../docs/src/content/docs/concepts/crews.mdx)**: Master multi-agent coordination and workflows

## Related Projects

LangCrew builds on the shoulders of giants:
- **LangChain**: [github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain) - The foundation for LLM applications
- **LangGraph**: [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) - Our underlying orchestration engine
- **CrewAI**: [github.com/joaomdmoura/crewAI](https://github.com/joaomdmoura/crewAI) - Inspiration for our agent patterns

## Advanced Examples

### **Complete Project Structure**
For more complex applications, create a structured project:

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

Create your project structure manually or use your preferred project template. Then modify the files as needed to fit your use case:

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

    - hotel location: {hotel_location}

    - flight information: {flight_information}

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

    - hotel location: {hotel_location}

    - flight information: {flight_information}

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
from langcrew.tools import BaseTool


class MyCustomTool(BaseTool):
    name: str = "Name of my tool"
    description: str = (
        "Clear description for what this tool is useful for, your agent will need this information to use it."
    )

    def _run(self, argument: str) -> str:
        # Implementation goes here
        return "This is an example of a tool output, ignore it and move along."
```

**crew.py**

```python
# src/my_project/crew.py
import os

# Core LangCrew imports
from langcrew import Agent, Crew, Task
from langcrew.project import CrewBase, agent, crew, task

# External dependencies (install separately)
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field


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
    """Travel planning crew"""
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4.1", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )
        
    @agent
    def personalized_activity_planner(self) -> Agent:
        return Agent(
            config=self.agents_config['personalized_activity_planner'],
            # tools=[], # Add your custom tools here
            llm=self._get_default_llm(),
            verbose=True
        )

    @agent
    def restaurant_scout(self) -> Agent:
        return Agent(
            config=self.agents_config['restaurant_scout'],
            # tools=[], # Add your custom tools here
            llm=self._get_default_llm(),
            verbose=True
        )

    @agent
    def itinerary_compiler(self) -> Agent:
        return Agent(
            config=self.agents_config['itinerary_compiler'],
            # tools=[], # Add your custom tools here
            llm=self._get_default_llm(),
            verbose=True
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
        """Creates the travel planning crew"""
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
from my_project.crew import SurpriseTravelCrew

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


## Contributing

We welcome contributions from the community! Here's how you can help:

### **Ways to Contribute**
- **Report Bugs**: Open issues for bugs or feature requests
- **Suggest Features**: Propose new features or improvements
- **Improve Documentation**: Help make our docs better
- **Submit Code**: Contribute bug fixes or new features
- **Test**: Help test and validate new releases

### **Development Setup**
```bash
# Clone the repository
git clone https://github.com/01-ai/langcrew.git
cd langcrew/libs/langcrew

# Install development dependencies
pip install -e ".[dev]"

# Run tests
python -m pytest

# Run linting
ruff check .

# Run type checking
mypy langcrew/
```

Run tests: `python -m pytest libs/langcrew/tests/`

### **Community Resources**
- **Issues**: [GitHub Issues](https://github.com/01-ai/langcrew/issues)
- **Discussions**: [GitHub Discussions](https://github.com/01-ai/langcrew/discussions)
- **Email**: [btm@langcrew.ai](mailto:btm@langcrew.ai)


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Real-World Applications

See LangCrew in action across different industries:

- **[Recruitment Systems](https://github.com/01-ai/langcrew/tree/main/examples/recruitment)**: Multi-agent candidate screening and evaluation
- **[Marketing Strategy](https://github.com/01-ai/langcrew/tree/main/examples/marketing-strategy)**: Collaborative campaign planning and execution
- **[Game Development](https://github.com/01-ai/langcrew/tree/main/examples/game-builder-crew)**: AI-driven game content generation
- **[Trip Planning](https://github.com/01-ai/langcrew/tree/main/examples/surprise-trip)**: Intelligent travel itinerary creation
- **[Job Posting](https://github.com/01-ai/langcrew/tree/main/examples/job-posting)**: Automated job description generation

## Learning Resources

### **Getting Started**
- **[Quick Examples](https://github.com/01-ai/langcrew/tree/main/examples)**: Ready-to-run examples for common use cases
- **[Documentation](https://github.com/01-ai/langcrew/tree/main/docs)**: Complete guides and API reference
- **[Video Tutorials](https://github.com/01-ai/langcrew/tree/main/docs/tutorials)**: Step-by-step video guides

### **Advanced Topics**
- **[Custom Tools](https://github.com/01-ai/langcrew/tree/main/docs/tools)**: Building and integrating custom tools
- **[Memory Systems](https://github.com/01-ai/langcrew/tree/main/docs/memory)**: Implementing persistent agent memory
- **[Workflows](https://github.com/01-ai/langcrew/tree/main/docs/workflows)**: Designing complex multi-agent workflows

### **Production**
- **[Deployment Guide](https://github.com/01-ai/langcrew/tree/main/docs/deployment)**: Production deployment strategies
- **[Monitoring](https://github.com/01-ai/langcrew/tree/main/docs/monitoring)**: Observability and performance tracking
- **[Security](https://github.com/01-ai/langcrew/tree/main/docs/security)**: Security best practices and guidelines

---

**Built by the LangCrew Team**
