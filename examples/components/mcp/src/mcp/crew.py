import os

from langcrew.llm_factory import LLMFactory

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.task import Task
from langcrew.project import CrewBase, agent, crew, task


@CrewBase
class MapCrew:
    """Map crew"""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return LLMFactory.create_llm(
            {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.1}
        )

    @agent
    def planner(self) -> Agent:
        server_config = {
            "url": f"https://mcp.amap.com/sse?key={os.getenv('AMAP_TOKEN')}",
            "transport": "sse",
        }
        mcp_server_configs = {"amap-sse": server_config}
        return Agent(
            config=self.agents_config["planner"],
            mcp_servers=mcp_server_configs,
            mcp_tool_filter=["xxx"],  # 只引入固定的tool
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def router(self) -> Agent:
        return Agent(
            config=self.agents_config["router"],
            tools=[],
            llm=self._get_default_llm(),
            verbose=True,
        )

    @task
    def plan_route_task(self) -> Task:
        return Task(config=self.tasks_config["plan_route_task"], agent=self.planner())

    @task
    def execute_route_task(self) -> Task:
        return Task(config=self.tasks_config["execute_route_task"], agent=self.router())

    @crew
    def crew(self) -> Crew:
        """Creates the Map crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True,
        )


@CrewBase
class MapStreamHttpCrew:
    """Map stream http crew"""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return LLMFactory.create_llm(
            {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.1}
        )

    @agent
    def planner(self) -> Agent:
        server_config = {
            "url": f"https://mcp.amap.com/mcp?key={os.getenv('AMAP_TOKEN')}",
            "transport": "streamable_http",
        }

        mcp_server_configs = {"amap-streamable_http": server_config}
        return Agent(
            config=self.agents_config["planner"],
            mcp_servers=mcp_server_configs,
            llm=self._get_default_llm(),
            verbose=True,
        )

    @agent
    def router(self) -> Agent:
        return Agent(
            config=self.agents_config["router"],
            tools=[],
            llm=self._get_default_llm(),
            verbose=True,
        )

    @task
    def plan_route_task(self) -> Task:
        return Task(config=self.tasks_config["plan_route_task"], agent=self.planner())

    @task
    def execute_route_task(self) -> Task:
        return Task(config=self.tasks_config["execute_route_task"], agent=self.router())

    @crew
    def crew(self) -> Crew:
        """Creates the Map crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True,
        )


@CrewBase
class CalculatorCrew:
    """Calculator crew"""

    agents_config = "config/calculator/agents.yaml"
    tasks_config = "config/calculator/tasks.yaml"

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return LLMFactory.create_llm(
            {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.1}
        )

    @agent
    def calculator(self) -> Agent:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        calculator_script = os.path.join(current_dir, "tools", "calculator_stdio.py")
        server_config = {
            "command": "python3",
            "args": [calculator_script],
            "transport": "stdio",
        }
        mcp_server_configs = {"calculator-stdio": server_config}
        return Agent(
            config=self.agents_config["calculator"],
            mcp_servers=mcp_server_configs,
            llm=self._get_default_llm(),
            verbose=True,
        )

    @task
    def calculator_task(self) -> Task:
        return Task(
            config=self.tasks_config["calculator_task"], agent=self.calculator()
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Map crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True,
        )
