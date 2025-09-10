from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator, Callable, Iterator, Sequence
from typing import (
    Any,
    Literal,
)

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.constants import END, START
from langgraph.graph import StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import All, StreamMode
from langgraph_supervisor.handoff import create_handoff_tool

from .agent import Agent
from .hitl import HITLConfig
from .memory import MemoryConfig

from .task import Task
from .types import CrewState

logger = logging.getLogger(__name__)


class Crew:
    def __init__(
        self,
        agents: list[Agent] | None = None,
        tasks: list[Task] | None = None,
        verbose: bool = False,
        graph: StateGraph | None = None,
        # Memory configuration
        memory: MemoryConfig | bool | None = None,
        # HITL configuration
        hitl: HITLConfig | None = None,
    ):
        self.agents = agents or []
        self.tasks = tasks or []
        self.verbose = verbose
        self.graph = graph

        # Memory configuration
        # Handle memory parameter conversion
        if isinstance(memory, bool):
            if memory:
                # memory=True: use default MemoryConfig
                from .memory import MemoryConfig

                self.memory_config = MemoryConfig()
            else:
                # memory=False: disable memory
                self.memory_config = None
        else:
            # memory is MemoryConfig instance or None
            self.memory_config = memory

        # Memory will be setup dynamically when needed

        # HITL configuration
        if hitl is None:
            self.hitl_config = None
        elif isinstance(hitl, HITLConfig):
            self.hitl_config = hitl
        else:
            raise ValueError(
                f"Invalid hitl parameter type: {type(hitl)}. Use HITLConfig instance."
            )

        # Setup HITL if configured
        if self.hitl_config is not None:
            self._setup_hitl()

        if self.graph is None and not self.tasks and not self.agents:
            raise ValueError("Either tasks, agents, or graph must be provided")

        # Setup agents memory configuration
        self._setup_agents_memory()

        # Setup handoff if needed (automatically detect based on agent configuration)
        self._setup_handoff_if_needed()

    def _prepare_tools(self, tools: list[BaseTool]) -> list[BaseTool]:
        """Prepare tools for execution.

        This method can be extended to inject dependencies or modify tools
        before they are used by agents or tasks.

        Args:
            tools: List of tools to prepare

        Returns:
            List of prepared tools
        """
        return tools

    def _sync_subgraph_message_deletions(
        self, state: CrewState, result: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Process messages in subgraph results to ensure deletion operations sync to parent graph.

        Design rationale:
        When LangGraph subgraph runs as a node, if messages are trimmed via pre_model_hook,
        the root namespace will not sync the RemoveMessage actions.
        Explicit message state synchronization at node level is required to avoid
        inconsistent message state between parent and child graphs.

        Args:
            state: Current CrewState
            result: Result dictionary returned from ainvoke/invoke
            item: The executing Task or Agent instance

        Returns:
            Processed result dictionary with synchronized message deletion operations
        """
        if "messages" not in result:
            return result

        # Extract message IDs that are preserved in the result
        result_message_ids = {
            msg.id
            for msg in result["messages"]
            if hasattr(msg, "id") and msg.id is not None
        }

        # Create RemoveMessage markers for original messages not in result
        from langchain_core.messages.modifier import RemoveMessage

        remove_messages = [
            RemoveMessage(id=msg.id)
            for msg in state.get("messages", [])
            if hasattr(msg, "id")
            and msg.id is not None
            and msg.id not in result_message_ids
        ]

        # Build final message list: deletion operations + preserved messages
        final_messages = remove_messages + result["messages"]

        if self.verbose and remove_messages:
            logger.info(
                f"Message cleanup: removing {len(remove_messages)} messages from state"
            )

        return {**result, "messages": final_messages}

    def _get_task_node_name(self, task: Task, index: int) -> str:
        """Unified task node naming rule with namespace isolation"""
        base_name = task.name if task.name else f"task_{index}"
        return f"task__{base_name}"

    def _get_agent_node_name(self, agent: Agent, index: int) -> str:
        """Unified agent node naming rule with namespace isolation"""
        base_name = agent.name if agent.name else f"agent_{index}"
        return f"agent__{base_name}"

    def _collect_interrupt_config(self) -> tuple[list[str], list[str]]:
        """Collect all interrupt configurations and convert to node-level interrupts"""
        interrupt_before = []
        interrupt_after = []

        if not self.hitl_config:
            return interrupt_before, interrupt_after

        # Task-level interrupts -> Node-level interrupts
        for i, task in enumerate(self.tasks):
            node_name = self._get_task_node_name(task, i)
            if task.name:
                if self.hitl_config.should_interrupt_before_task(task.name):
                    interrupt_before.append(node_name)
                if self.hitl_config.should_interrupt_after_task(task.name):
                    interrupt_after.append(node_name)

        # Agent-level interrupts -> Node-level interrupts
        for i, agent in enumerate(self.agents):
            node_name = self._get_agent_node_name(agent, i)
            if agent.name:
                if self.hitl_config.should_interrupt_before_agent(agent.name):
                    interrupt_before.append(node_name)
                if self.hitl_config.should_interrupt_after_agent(agent.name):
                    interrupt_after.append(node_name)

        # Add user-specified node-level interrupts
        interrupt_before.extend(self.hitl_config.get_interrupt_before_nodes())
        interrupt_after.extend(self.hitl_config.get_interrupt_after_nodes())

        return interrupt_before, interrupt_after

    def _compile_graph(
        self, builder: StateGraph, checkpointer=None, store=None
    ) -> CompiledStateGraph:
        """Compile graph with memory components and interrupt configuration applied"""
        interrupt_before, interrupt_after = self._collect_interrupt_config()

        compiled = builder.compile(
            checkpointer=checkpointer or self.checkpointer,
            store=store or self.store,
            interrupt_before=interrupt_before,
            interrupt_after=interrupt_after,
        )

        if self.verbose and (interrupt_before or interrupt_after):
            logger.info(
                f"Applied interrupts - Before: {interrupt_before}, After: {interrupt_after}"
            )

        return compiled

    def _create_generic_node_factory(
        self,
        is_async: bool,
        item_type: str,  # "task" or "agent"
        get_invoke_args_fn: Callable,
        process_result_fn: Callable | None = None,
    ):
        """Generic factory for creating node functions

        Args:
            is_async: Whether to create async nodes
            item_type: Type of item ("task" or "agent")
            get_invoke_args_fn: Function to get invoke arguments
            process_result_fn: Optional function to process results
        """
        if is_async:

            def create_async_node(item):
                async def async_node(state: CrewState) -> dict[str, Any]:
                    # Get invoke args
                    invoke_args = get_invoke_args_fn(item, state, is_async=True)

                    # Invoke the item
                    if item_type == "task":
                        result = await item.ainvoke(*invoke_args)
                    else:  # agent
                        result = await item.ainvoke(*invoke_args)

                    # Process result if needed
                    if process_result_fn:
                        result = process_result_fn(state, result, item)

                    return result

                return async_node

            return create_async_node
        else:

            def create_sync_node(item):
                def sync_node(state: CrewState) -> dict[str, Any]:
                    # Get invoke args
                    invoke_args = get_invoke_args_fn(item, state, is_async=False)

                    # Invoke the item
                    if item_type == "task":
                        result = item.invoke(*invoke_args)
                    else:  # agent
                        result = item.invoke(*invoke_args)

                    # Process result if needed
                    if process_result_fn:
                        result = process_result_fn(state, result, item)

                    return result

                return sync_node

            return create_sync_node

    def _create_task_node_factory(self, is_async: bool = False):
        """Factory for creating task node functions"""

        def get_task_invoke_args(task: Task, state: CrewState, is_async: bool):
            """Get invoke arguments for task"""
            # Basic validation - task must have an agent
            if not hasattr(task, "agent") or task.agent is None:
                raise ValueError("Task must have an agent to create executor")

            # Create config with langcrew metadata
            config = RunnableConfig(
                metadata={
                    "langcrew_agent": task.agent.name,
                    "langcrew_task": task.name or f"task_{self.tasks.index(task)}",
                }
            )
            return (state, config)

        def process_result_fn(state: CrewState, result: dict[str, Any], task: Task):
            # Process message synchronization (resolves subgraph message sync issues)
            result_with_cleanup = self._sync_subgraph_message_deletions(state, result)

            # Maintain original task_outputs functionality
            return {
                **result_with_cleanup,
                "task_outputs": state.get("task_outputs", []),
            }

        return self._create_generic_node_factory(
            is_async=is_async,
            item_type="task",
            get_invoke_args_fn=get_task_invoke_args,
            process_result_fn=process_result_fn,
        )

    def _build_task_sequential_graph(
        self, checkpointer=None, store=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a sequential graph from tasks with native interrupt support

        Args:
            checkpointer: Optional checkpointer to use. If not provided, uses self.checkpointer
            store: Optional store to use. If not provided, uses self.store
            is_async: Whether to create async task nodes
        """
        builder = StateGraph(CrewState)
        prev_node = START
        create_task_node = self._create_task_node_factory(is_async=is_async)

        for i, task in enumerate(self.tasks):
            node_name = self._get_task_node_name(task, i)  # Use unified naming
            # Prepare tools with state manager
            if hasattr(task, "agent") and hasattr(task.agent, "tools"):
                task.agent.tools = self._prepare_tools(task.agent.tools)
            builder.add_node(node_name, create_task_node(task))
            builder.add_edge(prev_node, node_name)
            prev_node = node_name

        builder.add_edge(prev_node, END)
        return self._compile_graph(
            builder, checkpointer, store
        )  # Use interrupt-aware compilation

    def _create_agent_node_factory(self, is_async: bool = False):
        """Factory for creating agent node functions"""

        def get_agent_invoke_args(agent: Agent, state: CrewState, is_async: bool):
            """Get invoke arguments for agent"""
            # Create config with langcrew metadata
            config = RunnableConfig(metadata={"langcrew_agent": agent.name})
            return (state, config)

        def process_result_fn(state: CrewState, result: dict[str, Any], agent: Agent):
            """Process Agent execution result with message synchronization functionality"""
            return self._sync_subgraph_message_deletions(state, result)

        return self._create_generic_node_factory(
            is_async=is_async,
            item_type="agent",
            get_invoke_args_fn=get_agent_invoke_args,
            process_result_fn=process_result_fn,
        )

    def _build_agent_sequential_graph(
        self, checkpointer=None, store=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a sequential graph from agents with native interrupt support

        Args:
            checkpointer: Optional checkpointer to use. If not provided, uses self.checkpointer
            store: Optional store to use. If not provided, uses self.store
            is_async: Whether to create async agent nodes
        """
        builder = StateGraph(CrewState)
        create_agent_node = self._create_agent_node_factory(is_async=is_async)

        # Add nodes and conditional edges
        prev_node = START

        for i, agent in enumerate(self.agents):
            node_name = self._get_agent_node_name(agent, i)  # Use unified naming
            # Prepare tools with state manager
            agent.tools = self._prepare_tools(agent.tools)

            builder.add_node(node_name, create_agent_node(agent))

            if prev_node == START:
                # First agent always executes
                builder.add_edge(prev_node, node_name)
            else:
                # Add conditional edge based on previous agent's decision
                # Use default parameter to capture current node_name value
                builder.add_conditional_edges(
                    prev_node,
                    lambda state, next_node=node_name: (
                        next_node if state.get("_continue_execution", True) else END
                    ),
                    {node_name: node_name, END: END},
                )

            prev_node = node_name

        # Last agent connects to END
        builder.add_edge(prev_node, END)
        return self._compile_graph(
            builder, checkpointer, store
        )  # Use interrupt-aware compilation

    def _has_agent_handoffs(self) -> bool:
        """Check if any agents are configured for handoff and validate configuration

        Returns:
            bool: True if any agents have handoff_to configured, False otherwise

        Raises:
            ValueError: If no agents are configured in the crew
        """
        if not self.agents:
            # If there are no agents, we can't have handoffs
            raise ValueError(
                "Cannot check for agent handoffs: No agents configured in the crew."
            )

        """Check if any agents are configured for handoff"""
        return any(agent.handoff_to for agent in self.agents)

    def _infer_entry_agent(self) -> str | None:
        """Infer entry agent using intelligent logic.

        Priority:
        1. Agent explicitly marked with is_entry=True
        2. First agent with handoff_to configuration
        3. None if no suitable candidate found
        """
        # Priority 1: Look for agents explicitly marked as entry points
        for agent in self.agents:
            if hasattr(agent, "is_entry") and agent.is_entry and agent.name:
                return agent.name

        # Priority 2: Use first agent with handoff_to configuration
        for agent in self.agents:
            if agent.handoff_to and agent.name:
                return agent.name

        # No suitable candidate found
        return None

    def _has_task_handoffs(self) -> bool:
        """Validate handoff configuration and return whether any tasks have handoff_to configured

        Returns:
            bool: True if any tasks have handoff_to configured, False otherwise
        """
        if not self.tasks:
            return False

        # Check if any tasks have handoff configuration
        has_handoff = any(task.handoff_to for task in self.tasks)

        if not has_handoff:
            return False

        # Validate all handoff targets using enhanced lookup
        for task in self.tasks:
            if not task.handoff_to:
                continue

            for target_task_name in task.handoff_to:
                self.get_task_by_name(target_task_name)

        return has_handoff

    def _setup_handoff_if_needed(self):
        """Setup handoff functionality if any agents or tasks have handoff configuration"""
        has_agent_handoff = self._has_agent_handoffs()
        has_task_handoff = self._has_task_handoffs()

        # Check for conflicting configurations
        if has_agent_handoff and has_task_handoff:
            raise ValueError(
                "Cannot configure both agent-level and task-level handoff in the same crew. "
                "Please choose one handoff mode:\n"
                "- Agent handoff: Configure handoff_to on Agent instances\n"
                "- Task handoff: Configure handoff_to on Task instances\n"
                f"Found agent handoff on: {[a.name for a in self.agents if a.handoff_to]}\n"
                f"Found task handoff on: {[t.name or f'task_{i}' for i, t in enumerate(self.tasks) if t.handoff_to]}"
            )

        if has_agent_handoff:
            self._setup_agent_handoff_tools()
            if self.verbose:
                logger.info("Agent handoff functionality enabled for crew")
        elif has_task_handoff:
            self._setup_task_handoff_tools()
            if self.verbose:
                logger.info("Task handoff functionality enabled for crew")

    def _setup_agent_handoff_tools(self):
        """Create handoff tools for agents based on their handoff_to configuration"""
        # Create mapping of agent names to agent objects and their indices
        agent_map = {}
        agent_node_map = {}  # Maps agent name to node name

        for i, agent in enumerate(self.agents):
            if agent.name:
                agent_map[agent.name] = agent
                agent_node_map[agent.name] = self._get_agent_node_name(agent, i)

        for agent in self.agents:
            if not agent.handoff_to:
                continue

            # Create handoff tools for each target agent
            for target_name in agent.handoff_to:
                if target_name not in agent_map:
                    if self.verbose:
                        logger.warning(
                            f"Handoff target '{target_name}' not found for agent '{agent.name}'"
                        )
                    continue

                target_agent = agent_map[target_name]
                target_node_name = agent_node_map[
                    target_name
                ]  # Use node name for routing

                # Create description using target agent's role, goal and backstory
                description_parts = []
                if target_agent.role:
                    description_parts.append(f"Role: {target_agent.role}")
                if target_agent.goal:
                    description_parts.append(f"Goal: {target_agent.goal}")
                if target_agent.backstory:
                    description_parts.append(f"Backstory: {target_agent.backstory}")

                description = (
                    f"Transfer to {target_name} - {'; '.join(description_parts)}"
                    if description_parts
                    else f"Transfer to {target_name}"
                )

                # Create handoff tool with node name for correct routing
                handoff_tool = create_handoff_tool(
                    agent_name=target_node_name, description=description
                )

                # Add tool to agent
                agent.tools.append(handoff_tool)

                if self.verbose:
                    logger.info(
                        f"Created handoff tool: {agent.name} -> {target_name} (node: {target_node_name})"
                    )

    def _setup_task_handoff_tools(self):
        """Create handoff tools for tasks based on their handoff_to configuration"""

        def create_handoff_tool_description(target_task):
            """Create description for handoff tool"""
            parts = []
            if target_task.description:
                parts.append(f"Description: {target_task.description}")
            if target_task.expected_output:
                parts.append(f"Expected output: {target_task.expected_output}")

            return (
                f"Transfer to task '{target_task.name}' - {'; '.join(parts)}"
                if parts
                else f"Transfer to task '{target_task.name}'"
            )

        for task in self.tasks:
            if not task.handoff_to:
                continue

            for target_name in task.handoff_to:
                target_task = self.get_task_by_name(target_name)
                # Find the target task's node name
                target_node_name = self._get_task_node_name(
                    target_task, self.tasks.index(target_task)
                )

                # Create and add handoff tool with node name for correct routing
                handoff_tool = create_handoff_tool(
                    agent_name=target_node_name,  # Use node name for routing
                    description=create_handoff_tool_description(target_task),
                )

                # Check if tool already exists to avoid duplicates
                existing_tool_names = {tool.name for tool in task.agent.tools}
                if handoff_tool.name not in existing_tool_names:
                    task.agent.tools.append(handoff_tool)

                    if self.verbose:
                        source_name = task.name or f"task_{self.tasks.index(task)}"
                        logger.info(
                            f"Created task handoff tool: {source_name} -> {target_name}"
                        )

    def _create_handoff_aware_agent_node(self, agent, is_async=False):
        """Create an agent node that can handle handoff Commands using generic factory

        Args:
            agent: The agent to create node for
            is_async: Whether to create async node
        """

        def get_handoff_invoke_args(agent: Agent, state: CrewState, is_async: bool):
            """Get invoke arguments for handoff agent"""
            # Create config with langcrew metadata
            config = RunnableConfig(metadata={"langcrew_agent": agent.name})
            return (state, config)

        def process_result_fn(state: CrewState, result: dict[str, Any], agent: Agent):
            """Process Handoff Agent execution result with message synchronization functionality"""
            return self._sync_subgraph_message_deletions(state, result)

        return self._create_generic_node_factory(
            is_async=is_async,
            item_type="agent",
            get_invoke_args_fn=get_handoff_invoke_args,
            process_result_fn=process_result_fn,
        )(agent)

    def _build_agent_handoff_graph(
        self, checkpointer=None, store=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a graph that supports handoff with dynamic routing

        Args:
            checkpointer: Optional checkpointer to use
            store: Optional store to use
            is_async: Whether to create async nodes
        """
        builder = StateGraph(CrewState)

        # Add all agent nodes using unified naming
        for i, agent in enumerate(self.agents):
            # Prepare tools with state manager for each agent
            agent.tools = self._prepare_tools(agent.tools)

            node_name = self._get_agent_node_name(agent, i)
            builder.add_node(
                node_name, self._create_handoff_aware_agent_node(agent, is_async)
            )

        # Set entry point using inferred entry agent
        entry_agent_name = self._infer_entry_agent()
        if not entry_agent_name:
            # Fallback to error if inference fails
            available_agents = [agent.name for agent in self.agents if agent.name]
            raise ValueError(
                "No entry agent found. Please mark an agent with is_entry=True or ensure at least one agent has handoff_to configured. "
                f"Available agents: {available_agents}"
            )

        # Find the node name for the entry agent
        entry_node_name = None
        for i, agent in enumerate(self.agents):
            if agent.name == entry_agent_name:
                entry_node_name = self._get_agent_node_name(agent, i)
                break

        if entry_node_name:
            builder.add_edge(START, entry_node_name)
        else:
            raise ValueError(
                f"Entry agent '{entry_agent_name}' not found in agents list"
            )

        # No conditional edges needed - LangGraph's Command mechanism handles routing
        # The handoff tools return Command(goto=agent_name) which LangGraph processes automatically

        return self._compile_graph(builder, checkpointer, store)

    def _build_task_handoff_graph(
        self, checkpointer=None, store=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a graph that supports task-to-task handoff with backbone+router architecture

        This method creates a graph with:
        1. Backbone tasks: non-handoff targets that execute sequentially
        2. Handoff subgraph tasks: handoff targets reachable via transfer commands
        3. Central router: checks for handoff commands and manages backbone flow

        Args:
            checkpointer: Optional checkpointer to use
            store: Optional store to use
            is_async: Whether to create async nodes
        """
        builder = StateGraph(CrewState)
        create_task_node = self._create_task_node_factory(is_async=is_async)

        # Use unified task naming
        def get_task_identifier(task):
            """Get consistent task identifier using unified naming"""
            return self._get_task_node_name(task, self.tasks.index(task))

        # Identify all handoff targets for validation
        handoff_target_names = set()
        for task in self.tasks:
            if task.handoff_to:
                for target_name in task.handoff_to:
                    self.get_task_by_name(target_name)  # Validates target exists
                    handoff_target_names.add(target_name)

        if self.verbose:
            logger.info(f"Handoff target tasks: {sorted(handoff_target_names)}")

        # Classify tasks into backbone and handoff subgraph
        backbone_tasks = []  # Main sequential execution chain
        handoff_subgraph_tasks = []  # Tasks reachable only via handoff

        for task in self.tasks:
            task_name = get_task_identifier(task)
            # Check if task's original name (not node name) is a handoff target
            if task.name and task.name in handoff_target_names:
                # This task is a handoff target → goes to handoff subgraph
                handoff_subgraph_tasks.append(task)
            else:
                # This task is not a handoff target → backbone task
                backbone_tasks.append(task)

            task.agent.tools = self._prepare_tools(task.agent.tools)
            builder.add_node(task_name, create_task_node(task))

        if self.verbose:
            backbone_names = [get_task_identifier(t) for t in backbone_tasks]
            subgraph_names = [get_task_identifier(t) for t in handoff_subgraph_tasks]
            logger.info(f"Backbone tasks: {backbone_names}")
            logger.info(f"Handoff subgraph tasks: {subgraph_names}")

        # Backbone task execution tracking
        backbone_execution_state = {"current_index": 0}

        # Central router node
        def router_node(state: CrewState):
            """Router: checks handoff commands in recent messages or continues backbone execution"""
            from langchain_core.messages import ToolMessage
            from langgraph.types import Command

            # Check for handoff commands in recent messages
            # We don't return a Command here to avoid conflicts with commands from handoff tools
            # In LangGraph, multiple Commands in the same step are grouped by task_id
            # When multiple Commands use the same NULL_TASK_ID, later ones override earlier ones
            # By having the router detect handoffs and avoid returning a Command, we ensure handoff commands aren't overridden
            if state.get("messages") and len(state["messages"]) > 0:
                # Check the last 2 messages for handoff commands
                # This handles race conditions between router_node and handoff tool calls
                # If handoff tool call executes first, it may add a HumanMessage after the ToolMessage
                # So we need to check both the last and second-to-last messages
                messages_to_check = min(2, len(state["messages"]))

                # Start from the last message and check backwards
                for i in range(messages_to_check):
                    message_index = -1 - i  # -1 for last message, -2 for second-to-last
                    message = state["messages"][message_index]
                    if isinstance(message, ToolMessage):
                        handoff_destination = message.response_metadata.get(
                            "__handoff_destination"
                        )
                        if handoff_destination:
                            if self.verbose:
                                logger.info(
                                    f"Router: handoff detected to {handoff_destination}, letting handoff handle routing"
                                )
                            return state

            # No handoff detected, continue backbone execution
            if backbone_execution_state["current_index"] < len(backbone_tasks):
                current_task = backbone_tasks[backbone_execution_state["current_index"]]
                task_name = get_task_identifier(current_task)
                backbone_execution_state["current_index"] += 1

                if self.verbose:
                    logger.info(
                        f"Router: continuing backbone execution with {task_name}"
                    )
                return Command(goto=task_name)

            # All backbone tasks completed
            if self.verbose:
                logger.info("Router: all backbone tasks completed")
            return Command(goto=END)

        builder.add_node("router", router_node)

        # Simple connections: START -> router, all tasks -> router
        builder.add_edge(START, "router")
        for task in self.tasks:
            node_name = get_task_identifier(task)
            builder.add_edge(node_name, "router")

        if self.verbose:
            logger.info(
                f"Task handoff graph built: {len(backbone_tasks)} backbone + {len(handoff_subgraph_tasks)} handoff + 1 router"
            )

        return self._compile_graph(builder, checkpointer, store)

    def _get_compiled_graph(
        self, checkpointer=None, store=None, is_async=False
    ) -> CompiledStateGraph:
        """Get the compiled graph for execution (unified sync/async version)"""
        # Handle custom graph if provided
        if self.graph is not None:
            # User provided StateGraph, compile it with passed checkpointer and store
            return self._compile_graph(self.graph, checkpointer, store)

        # Build graph based on configuration
        if any(task.handoff_to for task in self.tasks):
            # Build task-based handoff graph
            return self._build_task_handoff_graph(
                checkpointer, store, is_async=is_async
            )
        elif any(agent.handoff_to for agent in self.agents):
            # Build handoff-aware graph
            return self._build_agent_handoff_graph(
                checkpointer, store, is_async=is_async
            )
        elif self.tasks:
            # Build task-based sequential graph
            return self._build_task_sequential_graph(
                checkpointer, store, is_async=is_async
            )
        elif self.agents:
            # Build agent-based sequential graph
            return self._build_agent_sequential_graph(
                checkpointer, store, is_async=is_async
            )
        else:
            raise ValueError("No tasks or agents provided to build graph")

    async def _execute_with_memory_context_async(self, execution_func):
        """Execute function with proper async memory context management"""
        from .memory.factory import get_storage, get_checkpointer

        checkpointer_cm = None
        store_cm = None

        if self.memory_config:
            if self.memory_config.short_term.enabled:
                checkpointer_config = self.memory_config.to_checkpointer_config()
                checkpointer_cm = get_checkpointer(
                    self.memory_config.get_short_term_provider(),
                    checkpointer_config,
                    is_async=True,
                )

            if self.memory_config.long_term.enabled:
                store_config = self.memory_config.to_storage_config()
                store_cm = get_storage(
                    self.memory_config.get_long_term_provider(),
                    store_config,
                    is_async=True,
                )

        # Use appropriate context manager combination
        if checkpointer_cm and store_cm:
            async with checkpointer_cm as checkpointer, store_cm as store:
                return await execution_func(checkpointer, store)
        elif checkpointer_cm:
            async with checkpointer_cm as checkpointer:
                return await execution_func(checkpointer, None)
        elif store_cm:
            async with store_cm as store:
                return await execution_func(None, store)
        else:
            return await execution_func(None, None)

    async def _execute_with_memory_context_generator_async(self, execution_func):
        """Execute async generator function with proper memory context management"""
        from .memory.factory import get_storage, get_checkpointer

        checkpointer_cm = None
        store_cm = None

        if self.memory_config:
            if self.memory_config.short_term.enabled:
                checkpointer_config = self.memory_config.to_checkpointer_config()
                checkpointer_cm = get_checkpointer(
                    self.memory_config.get_short_term_provider(),
                    checkpointer_config,
                    is_async=True,
                )

            if self.memory_config.long_term.enabled:
                store_config = self.memory_config.to_storage_config()
                store_cm = get_storage(
                    self.memory_config.get_long_term_provider(),
                    store_config,
                    is_async=True,
                )

        # Use appropriate context manager combination
        if checkpointer_cm and store_cm:
            async with checkpointer_cm as checkpointer, store_cm as store:
                async for item in execution_func(checkpointer, store):
                    yield item
        elif checkpointer_cm:
            async with checkpointer_cm as checkpointer:
                async for item in execution_func(checkpointer, None):
                    yield item
        elif store_cm:
            async with store_cm as store:
                async for item in execution_func(None, store):
                    yield item
        else:
            async for item in execution_func(None, None):
                yield item

    def _execute_with_memory_context(self, execution_func):
        """Execute function with proper sync memory context management"""
        from .memory.factory import get_storage, get_checkpointer

        checkpointer_cm = None
        store_cm = None

        if self.memory_config:
            if self.memory_config.short_term.enabled:
                checkpointer_config = self.memory_config.to_checkpointer_config()
                checkpointer_cm = get_checkpointer(
                    self.memory_config.get_short_term_provider(),
                    checkpointer_config,
                    is_async=False,
                )

            if self.memory_config.long_term.enabled:
                store_config = self.memory_config.to_storage_config()
                store_cm = get_storage(
                    self.memory_config.get_long_term_provider(),
                    store_config,
                    is_async=False,
                )

        # Use appropriate context manager combination
        if checkpointer_cm and store_cm:
            with checkpointer_cm as checkpointer, store_cm as store:
                return execution_func(checkpointer, store)
        elif checkpointer_cm:
            with checkpointer_cm as checkpointer:
                return execution_func(checkpointer, None)
        elif store_cm:
            with store_cm as store:
                return execution_func(None, store)
        else:
            return execution_func(None, None)

    def _execute_with_memory_context_generator(self, execution_func):
        """Execute sync generator function with proper memory context management"""
        from .memory.factory import get_storage, get_checkpointer

        checkpointer_cm = None
        store_cm = None

        if self.memory_config:
            if self.memory_config.short_term.enabled:
                checkpointer_config = self.memory_config.to_checkpointer_config()
                checkpointer_cm = get_checkpointer(
                    self.memory_config.get_short_term_provider(),
                    checkpointer_config,
                    is_async=False,
                )

            if self.memory_config.long_term.enabled:
                store_config = self.memory_config.to_storage_config()
                store_cm = get_storage(
                    self.memory_config.get_long_term_provider(),
                    store_config,
                    is_async=False,
                )

        # Use appropriate context manager combination
        if checkpointer_cm and store_cm:
            with checkpointer_cm as checkpointer, store_cm as store:
                yield from execution_func(checkpointer, store)
        elif checkpointer_cm:
            with checkpointer_cm as checkpointer:
                yield from execution_func(checkpointer, None)
        elif store_cm:
            with store_cm as store:
                yield from execution_func(None, store)
        else:
            yield from execution_func(None, None)

    def _setup_agents_memory(self):
        """Setup memory configuration for agents"""
        if self.memory_config is None:
            return

        # Setup agents memory configuration
        for agent in self.agents:
            if not hasattr(agent, "memory_config") or agent.memory_config is None:
                agent.memory_config = self.memory_config
                # Only setup memory if agent hasn't been initialized yet
                if not agent.memory_tools:
                    agent._setup_memory(self.memory_config)

        if self.verbose:
            logger.info(
                f"Memory configuration applied to agents with provider: {self.memory_config.provider}"
            )

    def invoke(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        *,
        output_keys: str | Sequence[str] | None = None,
        interrupt_before: All | Sequence[str] | None = None,
        interrupt_after: All | Sequence[str] | None = None,
        **kwargs: Any,
    ) -> Any:
        """Execute crew with optional memory support and execution control.

        Args:
            input: The input to the graph
            config: The configuration to use for the run
            output_keys: The keys to return from output, defaults to all
            interrupt_before: Nodes to interrupt before executing
            interrupt_after: Nodes to interrupt after executing
            **kwargs: Additional keyword arguments passed to the graph

        Returns:
            The output of the graph run
        """

        def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=False
            )
            return compiled_graph.invoke(
                input,
                config=config,
                output_keys=output_keys,
                interrupt_before=interrupt_before,
                interrupt_after=interrupt_after,
                **kwargs,
            )

        return self._execute_with_memory_context(execute_with_memory)

    async def ainvoke(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        *,
        output_keys: str | Sequence[str] | None = None,
        interrupt_before: All | Sequence[str] | None = None,
        interrupt_after: All | Sequence[str] | None = None,
        **kwargs: Any,
    ) -> Any:
        """Asynchronously execute crew with memory and execution control support.

        Args:
            input: Data input to the graph
            config: Configuration used at runtime
            output_keys: Keys to return from output, defaults to all
            interrupt_before: Nodes to interrupt before execution
            interrupt_after: Nodes to interrupt after execution
            **kwargs: Additional keyword arguments passed to the graph

        Returns:
            Output from graph execution
        """

        async def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=True
            )
            return await compiled_graph.ainvoke(
                input,
                config=config,
                output_keys=output_keys,
                interrupt_before=interrupt_before,
                interrupt_after=interrupt_after,
                **kwargs,
            )

        return await self._execute_with_memory_context_async(execute_with_memory)

    def stream(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        *,
        stream_mode: StreamMode | Sequence[StreamMode] | None = None,
        output_keys: str | Sequence[str] | None = None,
        interrupt_before: All | Sequence[str] | None = None,
        interrupt_after: All | Sequence[str] | None = None,
        subgraphs: bool = False,
        **kwargs: Any,
    ) -> Iterator[dict[str, Any] | Any]:
        """
        Stream graph execution steps for a single input.

        Args:
            input: The input to the graph
            config: The configuration to use for the run
            stream_mode: The mode to stream output. Options:
                - "values": Emit all values in the state after each step
                - "updates": Emit only the node names and updates after each step
                - "custom": Emit custom data from inside nodes using StreamWriter
                - "messages": Emit LLM messages token-by-token
                - "debug": Emit debug events with maximum information
            output_keys: The keys to stream, defaults to all non-context channels
            interrupt_before: Nodes to interrupt before
            interrupt_after: Nodes to interrupt after
            subgraphs: Whether to stream events from inside subgraphs
            **kwargs: Additional keyword arguments

        Yields:
            The output of each step in the graph
        """

        def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=False
            )
            yield from compiled_graph.stream(
                input,
                config=config,
                stream_mode=stream_mode,
                output_keys=output_keys,
                interrupt_before=interrupt_before,
                interrupt_after=interrupt_after,
                subgraphs=subgraphs,
                **kwargs,
            )

        yield from self._execute_with_memory_context_generator(execute_with_memory)

    async def astream(
        self,
        input: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
        *,
        stream_mode: StreamMode | Sequence[StreamMode] | None = None,
        output_keys: str | Sequence[str] | None = None,
        interrupt_before: All | Sequence[str] | None = None,
        interrupt_after: All | Sequence[str] | None = None,
        subgraphs: bool = False,
        **kwargs: Any,
    ) -> AsyncIterator[dict[str, Any] | Any]:
        """
        Asynchronously stream graph execution steps for a single input.

        Args:
            input: The input to the graph
            config: The configuration to use for the run
            stream_mode: The mode to stream output. Options:
                - "values": Emit all values in the state after each step
                - "updates": Emit only the node names and updates after each step
                - "custom": Emit custom data from inside nodes using StreamWriter
                - "messages": Emit LLM messages token-by-token
                - "debug": Emit debug events with maximum information
            output_keys: The keys to stream, defaults to all non-context channels
            interrupt_before: Nodes to interrupt before
            interrupt_after: Nodes to interrupt after
            subgraphs: Whether to stream events from inside subgraphs
            **kwargs: Additional keyword arguments

        Yields:
            The output of each step in the graph
        """

        async def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=True
            )
            async for chunk in compiled_graph.astream(
                input,
                config=config,
                stream_mode=stream_mode,
                output_keys=output_keys,
                interrupt_before=interrupt_before,
                interrupt_after=interrupt_after,
                subgraphs=subgraphs,
                **kwargs,
            ):
                yield chunk

        async for chunk in self._execute_with_memory_context_generator_async(
            execute_with_memory
        ):
            yield chunk

    async def astream_events(
        self,
        input: Any,
        config: RunnableConfig | None = None,
        *,
        version: Literal["v1", "v2"] = "v2",
        include_names: Sequence[str] | None = None,
        include_types: Sequence[str] | None = None,
        include_tags: Sequence[str] | None = None,
        exclude_names: Sequence[str] | None = None,
        exclude_types: Sequence[str] | None = None,
        exclude_tags: Sequence[str] | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Generate a stream of fine-grained events during crew execution.

        This method provides detailed insights into the execution process, including
        events from LLMs, tools, agents, tasks, and other components. Useful for
        debugging, monitoring, and building real-time UIs.

        Args:
            input: The input to the crew
            config: Configuration for the run
            version: Event schema version ("v1" or "v2"). v2 is recommended
            include_names: Only include events from runnables with matching names
            include_types: Only include events from runnables with matching types
            include_tags: Only include events from runnables with matching tags
            exclude_names: Exclude events from runnables with matching names
            exclude_types: Exclude events from runnables with matching types
            exclude_tags: Exclude events from runnables with matching tags
            **kwargs: Additional keyword arguments

        Yields:
            StreamEvent dictionaries with the following structure:
            - event: Event name (e.g., "on_chat_model_start", "on_tool_end")
            - name: Name of the component that generated the event
            - run_id: Unique ID for this execution
            - parent_ids: IDs of parent runnables (v2 only)
            - tags: Tags associated with the component
            - metadata: Metadata about the component
            - data: Event-specific data (input, output, chunk, etc.)

        Examples:
            # Monitor all events
            async for event in crew.astream_events(input_data):
                print(f"{event['event']}: {event['name']}")

            # Only track LLM events
            async for event in crew.astream_events(
                input_data,
                include_types=["chat_model", "llm"]
            ):
                if event["event"] == "on_chat_model_stream":
                    print(event["data"]["chunk"])

            # Custom crew monitoring
            async for event in crew.astream_events(
                input_data,
                include_tags=["crew", "agent", "task"]
            ):
                if event["event"] == "on_crew_task_start":
                    print(f"Starting task: {event['data']['task_name']}")
        """

        async def execute_with_memory(checkpointer, store):
            compiled_graph = self._get_compiled_graph(
                checkpointer, store, is_async=True
            )
            async for event in compiled_graph.astream_events(
                input,
                config=config,
                version=version,
                include_names=include_names,
                include_types=include_types,
                include_tags=include_tags,
                exclude_names=exclude_names,
                exclude_types=exclude_types,
                exclude_tags=exclude_tags,
                **kwargs,
            ):
                yield event

        async for event in self._execute_with_memory_context_generator_async(
            execute_with_memory
        ):
            yield event

    # CrewAI compatibility methods
    def kickoff(
        self, inputs: dict[str, Any] | None = None, thread_id: str | None = None
    ) -> Any:
        """CrewAI compatible execution method with thread_id support.

        Args:
            inputs: Input data for the crew
            thread_id: Optional thread ID for maintaining conversation context

        Returns:
            Execution result with thread_id attribute
        """
        # Replace all placeholders in tasks if inputs provided
        if inputs:
            self._replace_all_placeholders(inputs)

        # Use provided thread_id or generate new one (local variable)
        current_thread_id = thread_id or str(uuid.uuid4())

        # Create config with thread_id
        config = RunnableConfig(configurable={"thread_id": current_thread_id})

        # Execute with empty state (task_outputs initialized by CrewState default)
        result = self.invoke({}, config)

        # Add thread_id to result for continuity
        if isinstance(result, dict):
            result["thread_id"] = current_thread_id
        else:
            # Create a wrapper if result is not dict
            result = {"output": result, "thread_id": current_thread_id}

        return result

    async def akickoff(
        self, inputs: dict[str, Any] | None = None, thread_id: str | None = None
    ) -> Any:
        """Async version of kickoff with thread_id support.

        Args:
            inputs: Input data for the crew
            thread_id: Optional thread ID for maintaining conversation context

        Returns:
            Execution result
        """
        # Replace all placeholders in tasks if inputs provided
        if inputs:
            self._replace_all_placeholders(inputs)

        # Use provided thread_id or generate new one (local variable)
        current_thread_id = thread_id or str(uuid.uuid4())

        # Create config with thread_id
        config = RunnableConfig(configurable={"thread_id": current_thread_id})

        # Execute with empty state (task_outputs initialized by CrewState default)
        result = await self.ainvoke({}, config)

        # Add thread_id to result for continuity
        if isinstance(result, dict):
            result["thread_id"] = current_thread_id
        else:
            # Create a wrapper if result is not dict
            result = {"output": result, "thread_id": current_thread_id}

        return result

    def _replace_all_placeholders(self, inputs: dict[str, Any]) -> None:
        """Replace all placeholders in task descriptions and expected outputs, and agent backstories.

        Args:
            inputs: Input parameters to substitute into task templates
        """
        if not inputs:
            return

        for task in self.tasks:
            if task._spec:
                # Replace placeholders in description
                if task._spec.description:
                    task._spec.description = self._replace_placeholders(
                        task._spec.description, inputs
                    )

                # Replace placeholders in expected_output
                if task._spec.expected_output:
                    task._spec.expected_output = self._replace_placeholders(
                        task._spec.expected_output, inputs
                    )

        # Replace placeholders in agent backstories
        for agent in self.agents:
            if agent.backstory:
                agent.backstory = self._replace_placeholders(agent.backstory, inputs)

    def _replace_placeholders(self, text: str, inputs: dict[str, Any]) -> str:
        """Replace placeholders in text with input values.

        Args:
            text: Text containing placeholders like {placeholder_name}
            inputs: Dictionary of input values

        Returns:
            Text with placeholders replaced
        """
        if not text or not inputs:
            return text

        result = text
        for key, value in inputs.items():
            placeholder = f"{{{key}}}"
            result = result.replace(placeholder, str(value))

        return result

    def _setup_hitl(self):
        """Setup HITL (Human-in-the-Loop) for all agents with configuration validation"""
        if self.verbose:
            logger.info("Setting up HITL tool approval for crew")

        # Determine execution mode and validate HITL configuration
        execution_mode = self._get_execution_mode()

        # Validate HITL configuration against execution mode
        if self.hitl_config:
            self.hitl_config.validate_config(execution_mode)

            if self.verbose:
                logger.info("HITL Configuration:")
                print(self.hitl_config.get_configuration_summary())

        # Apply crew-level HITL configuration to agents that don't have their own config
        for agent in self.agents:
            if not hasattr(agent, "hitl_config") or agent.hitl_config is None:
                agent.hitl_config = self.hitl_config
                agent._setup_hitl()

    def _get_execution_mode(self) -> str:
        """Determine the execution mode based on crew configuration

        Returns:
            "task_mode" if crew has tasks (regardless of agents or handoff)
            "agent_mode" if crew has only agents without tasks
        """
        if self.tasks:
            # Task mode takes priority when tasks are present (regardless of handoff)
            return "task_mode"
        elif self.agents:
            return "agent_mode"
        else:
            raise ValueError(
                "Cannot determine execution mode: no tasks or agents provided"
            )

    # Agent and task lookup methods

    def get_agent_by_name(self, name: str) -> Agent:
        """Get an agent by name

        Args:
            name: The name of the agent

        Returns:
            Agent instance

        Raises:
            ValueError: When the agent with the specified name is not found
        """
        for agent in self.agents:
            if agent.name == name:
                return agent

        raise ValueError(f"Agent with name '{name}' not found")

    def get_task_by_name(self, name: str) -> Task:
        """Get a task by name

        Args:
            name: The name of the task

        Returns:
            Task instance

        Raises:
            ValueError: When the task with the specified name is not found
        """
        for task in self.tasks:
            if task.name == name:
                return task

        raise ValueError(f"Task with name '{name}' not found")
