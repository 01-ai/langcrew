"""
LangCrew Project Module - CrewAI-style decorators for easy migration

This module provides CrewAI-compatible decorators that allow users to define
agents, tasks, and crews using a familiar decorator-based approach.
"""

import functools
import inspect
import logging
from collections.abc import Callable
from pathlib import Path
from typing import Any, TypeVar, cast

import yaml

from .agent import Agent
from .context.config import ContextConfig, create_context_config
from .crew import Crew
from .task import Task

T = TypeVar("T", bound=type)


def CrewBase(cls: T) -> T:
    """Wraps a class with crew functionality and configuration management."""

    class WrappedClass(cls):  # type: ignore
        is_crew_class: bool = True  # type: ignore

        # Get the directory of the class being decorated
        base_directory = Path(inspect.getfile(cls)).parent

        original_agents_config_path = getattr(
            cls, "agents_config", "config/agents.yaml"
        )
        original_tasks_config_path = getattr(cls, "tasks_config", "config/tasks.yaml")

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._cached_agents = None
            self.load_configurations()
            self.map_all_agent_variables()
            self.map_all_task_variables()

            # Preserve all decorated functions
            self._original_functions = {
                name: method
                for name, method in cls.__dict__.items()
                if any(
                    hasattr(method, attr)
                    for attr in [
                        "is_task",
                        "is_agent",
                        "_is_langcrew_task",
                        "_is_langcrew_agent",
                        "_is_langcrew_crew",
                    ]
                )
            }

            # Store specific function types
            self._original_tasks = self._filter_functions(
                self._original_functions, ["is_task", "_is_langcrew_task"]
            )
            self._original_agents = self._filter_functions(
                self._original_functions, ["is_agent", "_is_langcrew_agent"]
            )
            self._crew_methods = self._filter_functions(
                self._original_functions, ["_is_langcrew_crew"]
            )

        def load_configurations(self):
            """Load agent and task configurations from YAML files."""
            if isinstance(self.original_agents_config_path, str):
                agents_config_path = (
                    self.base_directory / self.original_agents_config_path
                )
                try:
                    self.agents_config = self.load_yaml(agents_config_path)
                except FileNotFoundError:
                    logging.warning(
                        f"Agent config file not found at {agents_config_path}. "
                        "Proceeding with empty agent configurations."
                    )
                    self.agents_config = {}
            else:
                logging.warning(
                    "No agent configuration path provided. Proceeding with empty agent configurations."
                )
                self.agents_config = {}

            if isinstance(self.original_tasks_config_path, str):
                tasks_config_path = (
                    self.base_directory / self.original_tasks_config_path
                )
                try:
                    self.tasks_config = self.load_yaml(tasks_config_path)
                except FileNotFoundError:
                    logging.warning(
                        f"Task config file not found at {tasks_config_path}. "
                        "Proceeding with empty task configurations."
                    )
                    self.tasks_config = {}
            else:
                logging.warning(
                    "No task configuration path provided. Proceeding with empty task configurations."
                )
                self.tasks_config = {}

        @staticmethod
        def load_yaml(config_path: Path):
            try:
                with open(config_path, encoding="utf-8") as file:
                    return yaml.safe_load(file)
            except FileNotFoundError:
                print(f"File not found: {config_path}")
                raise

        def _get_all_functions(self):
            return {
                name: getattr(self, name)
                for name in dir(self)
                if callable(getattr(self, name))
            }

        def _filter_functions(
            self, functions: dict[str, Callable], attributes: list[str]
        ) -> dict[str, Callable]:
            return {
                name: func
                for name, func in functions.items()
                if any(hasattr(func, attr) for attr in attributes)
            }

        def map_all_agent_variables(self) -> None:
            """Map agent variables from configuration."""
            # For now, we don't need complex variable mapping like CrewAI
            # since our agents are created directly in methods
            pass

        def map_all_task_variables(self) -> None:
            """Map task variables from configuration."""
            # For now, we don't need complex variable mapping like CrewAI
            # since our tasks are created directly in methods
            pass

        @property
        def agents(self) -> list[Agent]:
            """Get all collected agents."""
            # Return cached agents if available
            if self._cached_agents is not None:
                return self._cached_agents

            instantiated_agents = []
            agent_roles = set()

            for agent_name, agent_method in self._original_agents.items():
                agent_instance = agent_method(self)

                # Apply smart name extraction: function parameter > YAML config > YAML key
                if not agent_instance.name:
                    # Check if name can be extracted from YAML config by looking up the method name
                    config_name = None
                    if (
                        hasattr(self, "agents_config")
                        and self.agents_config
                        and agent_name in self.agents_config
                    ):
                        config_name = self.agents_config[agent_name].get("name")

                    # Priority: YAML config name > YAML key (method name)
                    if config_name:
                        agent_instance.name = config_name
                    else:
                        agent_instance.name = agent_name

                if (
                    hasattr(agent_instance, "role")
                    and agent_instance.role not in agent_roles
                ):
                    instantiated_agents.append(agent_instance)
                    agent_roles.add(agent_instance.role)
                elif not hasattr(agent_instance, "role"):
                    instantiated_agents.append(agent_instance)

            # Second, create agents from YAML configuration (if no decorated methods exist)
            if (
                not instantiated_agents
                and hasattr(self, "agents_config")
                and self.agents_config
            ):
                instantiated_agents = self._create_agents_from_config()

            # Cache the result
            self._cached_agents = instantiated_agents
            return instantiated_agents

        def _clear_agents_cache(self) -> None:
            """Clear the cached agents list to force re-creation on next access."""
            self._cached_agents = None

        @property
        def tasks(self) -> list[Task]:
            """Get all collected tasks in dependency order (topological sort)."""
            # First collect all tasks
            all_tasks = {}
            for task_name, task_method in self._original_tasks.items():
                task_instance = task_method(self)

                # Apply smart name extraction: function parameter > YAML config > YAML key
                if not task_instance.name:
                    # Check if name can be extracted from YAML config by looking up the method name
                    config_name = None
                    if (
                        hasattr(self, "tasks_config")
                        and self.tasks_config
                        and task_name in self.tasks_config
                    ):
                        config_name = self.tasks_config[task_name].get("name")

                    # Priority: YAML config name > YAML key (method name)
                    if config_name:
                        task_instance.name = config_name
                    else:
                        task_instance.name = task_name

                all_tasks[task_name] = task_instance

            # Second, create tasks from YAML configuration (if no decorated methods exist)
            if not all_tasks and hasattr(self, "tasks_config") and self.tasks_config:
                all_tasks = self._create_tasks_from_config()

            # If only one task or no dependencies, return directly
            if len(all_tasks) <= 1:
                return list(all_tasks.values())

            # Perform dependency-based sorting
            return self._sort_tasks_by_dependencies(all_tasks)

        def _sort_tasks_by_dependencies(self, tasks_dict: dict[str, Any]) -> list[Any]:
            """Sort tasks based on their dependencies using topological sorting algorithm"""
            from collections import defaultdict, deque

            # Handle empty case
            if not tasks_dict:
                return []

            # Build dependency graph
            graph = defaultdict(list)  # task -> [list of tasks that depend on it]
            in_degree = defaultdict(int)  # in-degree of each task

            # Initialize in-degree of all tasks to 0
            for task_name in tasks_dict:
                in_degree[task_name] = 0

            # Build dependencies using name-based matching
            for task_name, task in tasks_dict.items():
                if hasattr(task, "context") and task.context:
                    for context_item in task.context:
                        if isinstance(context_item, str):
                            # String-based context dependency
                            context_task_name = context_item
                        else:
                            # Object-based context dependency
                            context_task_name = getattr(context_item, "name", None)

                        if context_task_name and context_task_name in tasks_dict:
                            # context_task_name -> task_name has dependency relationship
                            graph[context_task_name].append(task_name)
                            in_degree[task_name] += 1
                        elif context_task_name:
                            # Log warning for unknown context task
                            logging.warning(
                                f"Task '{task_name}' has context dependency on unknown task '{context_task_name}'. "
                                "This might indicate a misconfiguration."
                            )

            # Kahn's algorithm for topological sorting
            queue = deque([task for task in tasks_dict if in_degree[task] == 0])
            result = []

            while queue:
                current_task_name = queue.popleft()
                result.append(tasks_dict[current_task_name])

                # Update in-degree of neighboring tasks
                for neighbor in graph[current_task_name]:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        queue.append(neighbor)

            # Check for circular dependencies
            if len(result) != len(tasks_dict):
                # Find tasks involved in cycles for better error message
                result_task_names = {getattr(task, "name", "") for task in result}
                remaining_tasks = [
                    name for name in tasks_dict if name not in result_task_names
                ]
                raise ValueError(
                    f"Circular dependency detected in tasks. Tasks involved in cycle: {', '.join(remaining_tasks)}"
                )

            return result

        def _create_agents_from_config(self) -> list[Agent]:
            """Create agents from YAML configuration."""
            agents = []

            for agent_name, agent_config in self.agents_config.items():
                # Extract all possible agent parameters, let Agent class handle validation
                name = agent_config.get("name", agent_name)
                role = agent_config.get("role")
                goal = agent_config.get("goal")
                backstory = agent_config.get("backstory")
                prompt = agent_config.get("prompt")

                # Process tools configuration
                tools = []
                if "tools" in agent_config:
                    tools = self._load_tools_from_config(agent_config["tools"])

                # Process LLM configuration
                llm = None
                if "llm" in agent_config:
                    llm = self._create_llm_from_config(agent_config["llm"])

                # Process context configuration
                # Note: ContextConfig.pre_model supports:
                # - Single strategy: ContextConfigType (current implementation)
                # - Multiple strategies: list[ContextConfigType] (future enhancement)
                # - None: No context management
                context_config = None
                if "context" in agent_config:
                    context_data = agent_config["context"]

                    # Handle single strategy configuration (current implementation)
                    if isinstance(context_data, dict):
                        strategy_config = create_context_config(context_data)
                        if strategy_config:
                            context_config = ContextConfig(pre_model=strategy_config)

                    # Handle multiple strategies configuration
                    elif isinstance(context_data, list):
                        strategy_configs = [
                            create_context_config(config) for config in context_data
                        ]
                        strategy_configs = [
                            config for config in strategy_configs if config
                        ]
                        if strategy_configs:
                            context_config = ContextConfig(pre_model=strategy_configs)

                # Create agent instance - Agent.__init__ handles mutual exclusivity validation
                agent_instance = Agent(
                    name=name,
                    role=role,
                    goal=goal,
                    backstory=backstory,
                    prompt=prompt,
                    tools=tools,
                    llm=llm,
                    config=agent_config,  # Pass full config for other properties
                    context_config=context_config,
                )

                agents.append(agent_instance)

            return agents

        def _load_tools_from_config(self, tools_config: list[str]) -> list:
            """Load tools using ToolRegistry based on configuration."""
            from langcrew.tools.registry import ToolRegistry

            tools = []
            for tool_name in tools_config:
                tool_instance = ToolRegistry.get_tool(tool_name)
                if tool_instance:
                    tools.append(tool_instance)
            return tools

        def _discover_and_register_local_tool(self, tool_name: str, ToolRegistry):
            """Discover and register a tool from local tools directory."""
            tools_dir = self.base_directory / "tools"

            if not tools_dir.exists():
                logging.debug(f"Local tools directory not found: {tools_dir}")
                return None

            # Scan all Python files in tools directory
            for py_file in tools_dir.glob("**/*.py"):
                if py_file.name.startswith("_") or py_file.name == "__init__.py":
                    continue

                # Import the module dynamically
                tool_class = self._find_tool_class_in_file(py_file, tool_name)
                if tool_class:
                    # Register the tool and return instance
                    ToolRegistry.register(tool_name, tool_class)
                    return ToolRegistry.get_tool(tool_name)

            return None

        def _find_tool_class_in_file(self, py_file: Path, tool_name: str):
            """Find a tool class in a Python file by tool name."""
            import importlib.util

            # Create module spec from file
            spec = importlib.util.spec_from_file_location(
                f"local_tools_{py_file.stem}", py_file
            )
            if not spec or not spec.loader:
                return None

            # Load the module
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Find tool classes
            from langchain_core.tools import BaseTool

            for name, obj in inspect.getmembers(module):
                if (
                    inspect.isclass(obj)
                    and issubclass(obj, BaseTool)
                    and obj != BaseTool
                    and not name.startswith("_")
                ):
                    # Check if this tool matches the requested name
                    # Try to get the tool name from class attribute or instance
                    if hasattr(obj, "name"):
                        # Class attribute
                        if obj.name == tool_name:
                            return obj
                    else:
                        # Try to instantiate and check name
                        instance = obj()
                        if hasattr(instance, "name") and instance.name == tool_name:
                            return obj

            return None

        def _create_llm_from_config(self, llm_config: dict):
            """Create LLM instance from configuration."""
            try:
                from langcrew.llm_factory import LLMFactory

                return LLMFactory.create_llm(llm_config)
            except Exception as e:
                logging.warning(f"Failed to create LLM from config: {e}")
                return None

        def _create_tasks_from_config(self) -> dict[str, Any]:
            """Create tasks from YAML configuration."""
            all_tasks = {}

            # First pass: create all tasks without context
            for task_name, task_config in self.tasks_config.items():
                # Extract basic task properties
                description = task_config.get("description", "")
                expected_output = task_config.get("expected_output", "")
                agent_name = task_config.get("agent")

                # Find the agent by name
                agent = self._find_agent_by_name(agent_name) if agent_name else None

                # Create Task instance (without context for now)
                task_instance = Task(
                    description=description,
                    expected_output=expected_output,
                    agent=agent,
                    name=task_config.get("name", task_name),
                )

                all_tasks[task_name] = task_instance

            # Second pass: set context dependencies
            for task_name, task_config in self.tasks_config.items():
                if "context" in task_config and task_name in all_tasks:
                    context_list = []
                    context_names = task_config["context"]

                    # Ensure context is a list
                    if isinstance(context_names, str):
                        context_names = [context_names]

                    # Find context tasks
                    for context_name in context_names:
                        if context_name in all_tasks:
                            context_list.append(all_tasks[context_name])
                        else:
                            logging.warning(
                                f"Context task '{context_name}' not found for task '{task_name}'"
                            )

                    # Set the context on the task
                    if context_list:
                        all_tasks[task_name].context = context_list

            return all_tasks

        def _find_agent_by_name(self, agent_name: str):
            """Find agent by name from the agents list."""
            if not agent_name:
                return None

            # Get agents (will create them if needed)
            agents = self.agents

            for agent in agents:
                # Check both name and role for matching
                if (hasattr(agent, "name") and agent.name == agent_name) or (
                    hasattr(agent, "role") and agent.role == agent_name
                ):
                    return agent

            return None

    # Now add the crew method to WrappedClass, handling the original decorated method
    def crew_method(self) -> Crew:
        """Get or create the crew instance."""
        # Check if there's a crew method in the original class
        for crew_name, crew_func in self._crew_methods.items():
            # Call the original decorated crew method
            return crew_func(self)

        # Fallback: create a basic crew with collected agents and tasks
        return Crew(agents=self.agents, tasks=self.tasks)

    # Add the crew method to the class
    WrappedClass.crew = crew_method

    # Include base class (qual)name in the wrapper class (qual)name.
    WrappedClass.__name__ = f"CrewBase({cls.__name__})"
    WrappedClass.__qualname__ = f"CrewBase({cls.__name__})"
    WrappedClass._crew_name = cls.__name__

    return cast(T, WrappedClass)


def agent(func):
    """
    Decorator to mark a method as an agent creator.

    The decorated method should return an Agent instance.
    """
    func.is_agent = True
    func._is_langcrew_agent = True

    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        return func(self, *args, **kwargs)

    wrapper.is_agent = True
    wrapper._is_langcrew_agent = True
    return wrapper


def task(func):
    """
    Decorator to mark a method as a task creator.

    The decorated method should return a Task instance.
    """
    func.is_task = True
    func._is_langcrew_task = True

    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        result = func(self, *args, **kwargs)
        # Try to set name if it's available and empty
        if hasattr(result, "name") and not result.name:
            try:
                result.name = func.__name__
            except AttributeError:
                # name property might be read-only, skip setting it
                pass
        return result

    wrapper.is_task = True
    wrapper._is_langcrew_task = True
    return wrapper


def crew(func) -> Callable[..., Crew]:
    """
    Decorator to mark a method as the main crew execution point.
    """
    func._is_langcrew_crew = True

    @functools.wraps(func)
    def wrapper(self, *args, **kwargs) -> Crew:
        result = func(self, *args, **kwargs)

        # If the result is already a Crew, return it
        if isinstance(result, Crew):
            return result

        # If the result is a dict of kwargs, create a Crew with them
        if isinstance(result, dict):
            return Crew(agents=self.agents, tasks=self.tasks, **result)

        # Otherwise, create a basic Crew
        return Crew(agents=self.agents, tasks=self.tasks)

    wrapper._is_langcrew_crew = True
    return wrapper
