import asyncio
from concurrent.futures import ThreadPoolExecutor
import os

from langchain_openai import ChatOpenAI

from langcrew.agent import Agent
from langcrew.crew import Crew
from langcrew.task import Task
from langcrew.project import CrewBase, agent, crew, task
from langcrew.mcp.adapter import MCPToolAdapter
from langchain_core.tools import BaseTool

def _add_mcp_tools(tools: list[BaseTool]) -> None:
    """Add MCP tools if configured.
     mcp_server_configs = {"amap-sse": server_config,"search-sse":server_search_config}
    """
    server_config = {
        "url": f"https://mcp.amap.com/sse?key={os.getenv('AMAP_TOKEN')}",
        "transport": "sse",
    }
    mcp_server_configs = {"amap-sse": server_config}
    mcp_adapter = MCPToolAdapter()
    
    try:
        # Check if already in an event loop
        asyncio.get_running_loop()
         # Run async code in a new thread
        with ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, mcp_adapter.from_servers(mcp_server_configs))
            mcp_tools = future.result()
    except RuntimeError:
        # No running event loop, use asyncio.run()
        mcp_tools = asyncio.run(mcp_adapter.from_servers(mcp_server_configs))
    
    tools.extend(mcp_tools)
    return tools


def _add_stream_mcp_tools(tools: list[BaseTool]) -> None:
    """Add MCP tools if configured."""
    server_config = {
        "url": f"https://mcp.amap.com/mcp?key={os.getenv('AMAP_TOKEN')}",
        "transport": "streamable_http",
    }
    mcp_server_configs = {"amap-streamable_http": server_config}
    mcp_adapter = MCPToolAdapter()
    
    try:
        # Check if already in an event loop
        asyncio.get_running_loop()
         # Run async code in a new thread
        with ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, mcp_adapter.from_servers(mcp_server_configs))
            mcp_tools = future.result()
    except RuntimeError:
        # No running event loop, use asyncio.run()
        mcp_tools = asyncio.run(mcp_adapter.from_servers(mcp_server_configs))
    
    tools.extend(mcp_tools)
    return tools

@CrewBase
class MapCrew:
    """Map crew"""
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )

    @agent
    def planner(self) -> Agent:
        tools = []
        return Agent(
            config=self.agents_config['planner'],
            tools=_add_mcp_tools(tools),  # Use lazy-loaded tools
            llm=self._get_default_llm(),
            verbose=True,
            
        )

    @agent
    def router(self) -> Agent:
        return Agent(
            config=self.agents_config['router'],
            tools=[],
            llm=self._get_default_llm(),
            verbose=True,
            
        )


    @task
    def plan_route_task(self) -> Task:
        return Task(
            config=self.tasks_config['plan_route_task'],
            agent= self.planner()
        )

    @task
    def execute_route_task(self) -> Task:
        return Task(
            config=self.tasks_config['execute_route_task'],
            agent= self.router()
        )

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
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )

    @agent
    def planner(self) -> Agent:
        tools = []
        return Agent(
            config=self.agents_config['planner'],
            tools=_add_stream_mcp_tools(tools),  # Use lazy-loaded tools
            llm=self._get_default_llm(),
            verbose=True,
            
        )

    @agent
    def router(self) -> Agent:
        return Agent(
            config=self.agents_config['router'],
            tools=[],
            llm=self._get_default_llm(),
            verbose=True,
            
        )


    @task
    def plan_route_task(self) -> Task:
        return Task(
            config=self.tasks_config['plan_route_task'],
            agent= self.planner()
        )

    @task
    def execute_route_task(self) -> Task:
        return Task(
            config=self.tasks_config['execute_route_task'],
            agent= self.router()
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Map crew"""
        return Crew(
            agents=self.agents, 
            tasks=self.tasks, 
            verbose=True,
            
        )
        

def _add_calculator_mcp_tools(tools: list[BaseTool]) -> None:
    """Add MCP tools if configured."""
    # Use relative path based on current file location
    current_dir = os.path.dirname(os.path.abspath(__file__))
    calculator_script = os.path.join(current_dir, "tools", "calculator_stdio.py")
    
    server_config = {
        "command": "python3", 
        "args": [calculator_script],
        "transport": "stdio",
    }
    mcp_server_configs = {"calculator-stdio": server_config}
    mcp_adapter = MCPToolAdapter()
    
    try:
        # Check if already in an event loop
        asyncio.get_running_loop()
         # Run async code in a new thread
        with ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, mcp_adapter.from_servers(mcp_server_configs))
            mcp_tools = future.result()
    except RuntimeError:
        # No running event loop, use asyncio.run()
        mcp_tools = asyncio.run(mcp_adapter.from_servers(mcp_server_configs))
    
    tools.extend(mcp_tools)
    return tools
    

@CrewBase
class CalculatorCrew:
    """Calculator crew"""
    agents_config = 'config/calculator/agents.yaml'
    tasks_config = 'config/calculator/tasks.yaml'

    def _get_default_llm(self):
        """Get default LLM for agents"""
        return ChatOpenAI(
            model="gpt-4o-mini", temperature=0.1, api_key=os.getenv("OPENAI_API_KEY")
        )

    @agent
    def calculator(self) -> Agent:
        tools = []
        return Agent(
            config=self.agents_config['calculator'],
            tools=_add_calculator_mcp_tools(tools),  # Use lazy-loaded tools
            llm=self._get_default_llm(),
            verbose=True,
            
        )

    @task
    def calculator_task(self) -> Task:
        return Task(
            config=self.tasks_config['calculator_task'],
            agent= self.calculator()
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Map crew"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            verbose=True,
            
        )