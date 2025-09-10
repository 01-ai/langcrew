from __future__ import annotations

import asyncio
import inspect
import logging
import uuid
from collections.abc import AsyncIterator, Callable, Iterator, Sequence
from typing import (
    Any,
    Literal,
)

from langchain_core.runnables import RunnableConfig, ensure_config
from langchain_core.tools import BaseTool
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.constants import END, START
from langgraph.graph import StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.base import BaseStore
from langgraph.types import All, StreamMode
from langgraph_supervisor.handoff import create_handoff_tool

from .agent import Agent
from .hitl import HITLConfig
from .memory import MemoryConfig

from .memory import EntityMemory, LongTermMemory, MemoryConfig, ShortTermMemory
from .memory.storage import get_checkpointer, get_storage
from .task import Task
from .tools import ToolCallback
from .types import CrewState, OrderCallback

logger = logging.getLogger(__name__)


class Crew:
    def __init__(
        self,
        agents: list[Agent] | None = None,
        tasks: list[Task] | None = None,
        verbose: bool = False,
        graph: StateGraph | None = None,
        # Memory configuration
        memory_config: MemoryConfig | None = None,
        embedder: dict[str, Any] | None = None,
        # LangGraph enhancements
        checkpointer: BaseCheckpointSaver | None = None,
        store: BaseStore | None = None,
        # Async components - for advanced users
        async_checkpointer: BaseCheckpointSaver | None = None,
        async_store: BaseStore | None = None,
        # HITL configuration
        hitl: HITLConfig | None = None,
    ):
        self.agents = agents or []
        self.tasks = tasks or []
        self.verbose = verbose
        self.graph = graph

        # Memory configuration
        self.memory_config = memory_config
        self.embedder = embedder

        self.checkpointer = checkpointer
        self.store = store
        self._compiled_graph = None

        # Setup memory for agents without memory config
        if memory_config:
            self._setup_memory(memory_config)

        self._thread_id = None

        # Async components for async methods
        self._async_store = async_store
        self._async_checkpointer = async_checkpointer
        self._async_compiled_graph = None
        self._async_components_initialized = False

        # tools for crew
        self._tools: list[BaseTool] = []
        self.register_after_execute_callback: list[OrderCallback] = []

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

        # Setup memory if enabled (check final config, not original parameter)
        # if self.memory_config is not None:
        # Memory setup is now handled in constructor

        if self.graph is None and not self.tasks and not self.agents:
            raise ValueError("Either tasks, agents, or graph must be provided")

        # Setup handoff if needed (automatically detect based on agent configuration)
        self._setup_handoff_if_needed()

        # Inject checkpointer and store into all agents for executor creation
        for agent in self.agents:
            agent.checkpointer = self.checkpointer
            agent.store = self.store

    def add_after_execute_callbacks(self, callbacks: list[Callable | OrderCallback]):
        """Add after execute callbacks to the crew"""
        register_callback = self.register_after_execute_callback.copy()
        for callback in callbacks:
            if isinstance(callback, OrderCallback):
                register_callback.append(callback)
            else:
                register_callback.append(
                    OrderCallback(order_id=len(register_callback), callback=callback)
                )

        register_callback.sort(key=lambda x: x.order_id)
        self.register_after_execute_callback = register_callback

    async def _aprocess_output(self, output: Any) -> Any:
        """
        Asynchronously process output data through callback functions

        This method processes any output data through registered callback functions.
        It can handle both final results and streaming data.

        Args:
            output: Output data to be processed

        Returns:
            Processed output data
        """
        if not isinstance(output, dict):
            return output

        result = output
        prev_result = result
        callbacks = [c.callback for c in self.register_after_execute_callback]
        # Execute function callbacks
        for callback_fn in callbacks:
            try:
                if prev_result:
                    # Handle the case where prev_result might be a list
                    if isinstance(prev_result, list):
                        # Process each item in the list through the callback
                        processed_items = []
                        for item in prev_result:
                            if inspect.iscoroutinefunction(callback_fn):
                                processed_item = await callback_fn(item)
                            else:
                                processed_item = callback_fn(item)
                            if processed_item:
                                # If processed_item is also a list, extend instead of append
                                if isinstance(processed_item, list):
                                    processed_items.extend(processed_item)
                                else:
                                    processed_items.append(processed_item)
                        prev_result = processed_items
                    else:
                        # Original logic for dict input
                        if inspect.iscoroutinefunction(callback_fn):
                            prev_result = await callback_fn(prev_result)
                        else:
                            prev_result = callback_fn(prev_result)
            except Exception as e:
                logger.error(f"Error in output processing callback: {e}")

        return prev_result

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
        self._register_tools()

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

    def _register_tools(self):
        """Register tools to the crew"""
        after_execute_callbacks = []
        for tool in self._tools:
            if isinstance(tool, ToolCallback):
                order_id, callback = tool.tool_order_callback()
                if order_id:
                    after_execute_callbacks.append(
                        OrderCallback(order_id=order_id, callback=callback)
                    )
                else:
                    after_execute_callbacks.append(callback)
        # order by order_id
        self.add_after_execute_callbacks(after_execute_callbacks)

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
            config = ensure_config()
            # Create config with langcrew metadata
            if "metadata" not in config:
                config["metadata"] = {}
            config["metadata"]["langcrew_agent"] = task.agent.name
            config["metadata"]["langcrew_task"] = (
                task.name or f"task_{self.tasks.index(task)}"
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
        self, checkpointer=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a sequential graph from tasks with native interrupt support

        Args:
            checkpointer: Optional checkpointer to use. If not provided, uses self.checkpointer
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
            builder, checkpointer
        )  # Use interrupt-aware compilation

    def _create_agent_node_factory(self, is_async: bool = False):
        """Factory for creating agent node functions"""

        def get_agent_invoke_args(agent: Agent, state: CrewState, is_async: bool):
            """Get invoke arguments for agent"""
            config = ensure_config()
            # Create config with langcrew metadata
            if "metadata" not in config:
                config["metadata"] = {}
            config["metadata"]["langcrew_agent"] = agent.name
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
        self, checkpointer=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a sequential graph from agents with native interrupt support

        Args:
            checkpointer: Optional checkpointer to use. If not provided, uses self.checkpointer
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
            builder, checkpointer
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
            config = ensure_config()
            # Create config with langcrew metadata
            if "metadata" not in config:
                config["metadata"] = {}
            config["metadata"]["langcrew_agent"] = agent.name
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

    def _prepare_tools(self, tools: list[BaseTool]) -> list[BaseTool]:
        """Prepare tools for execution"""
        if tools:
            for tool in tools:
                if tool not in self._tools:
                    self._tools.append(tool)
        return tools

    def _build_agent_handoff_graph(
        self, checkpointer=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a graph that supports handoff with dynamic routing

        Args:
            checkpointer: Optional checkpointer to use
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

        return self._compile_graph(builder, checkpointer)

    def _build_task_handoff_graph(
        self, checkpointer=None, is_async=False
    ) -> CompiledStateGraph:
        """Build a graph that supports task-to-task handoff with backbone+router architecture

        This method creates a graph with:
        1. Backbone tasks: non-handoff targets that execute sequentially
        2. Handoff subgraph tasks: handoff targets reachable via transfer commands
        3. Central router: checks for handoff commands and manages backbone flow

        Args:
            checkpointer: Optional checkpointer to use
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

        return self._compile_graph(builder, checkpointer)

    def _get_compiled_graph(self) -> CompiledStateGraph:
        """Get the compiled graph for execution with caching"""
        # Handle custom graph if provided
        if self.graph is not None:
            # User provided StateGraph, compile it with crew's checkpointer
            return self._compile_graph(self.graph)

        # Use cached compiled graph if available
        if self._compiled_graph is not None:
            return self._compiled_graph

        # Check if handoff is needed and build appropriate graph
        if any(task.handoff_to for task in self.tasks):
            # Build task-based handoff graph with mixed sequential and dynamic routing
            self._compiled_graph = self._build_task_handoff_graph()
        elif any(agent.handoff_to for agent in self.agents):
            # Build handoff-aware graph with dynamic routing
            self._compiled_graph = self._build_agent_handoff_graph()
        elif self.tasks:
            # Build task-based sequential graph
            self._compiled_graph = self._build_task_sequential_graph(is_async=False)
        elif self.agents:
            # Build agent-based sequential graph
            self._compiled_graph = self._build_agent_sequential_graph(is_async=False)
        else:
            raise ValueError("No tasks or agents provided to build graph")

        return self._compiled_graph

    async def _get_async_compiled_graph(self) -> CompiledStateGraph:
        """Get the async compiled graph with async components"""
        # Handle custom graph if provided
        if self.graph is not None:
            # User provided StateGraph, compile it with async checkpointer
            return self._compile_graph(self.graph, self._async_checkpointer)

        # Use cached async compiled graph if available
        if self._async_compiled_graph is not None:
            return self._async_compiled_graph

        # Ensure async components are set up
        await self._setup_async_components()

        # Build graph with async checkpointer
        # Check if handoff is needed and build appropriate graph
        if any(task.handoff_to for task in self.tasks):
            # Build task-based handoff graph with mixed sequential and dynamic routing
            self._async_compiled_graph = self._build_task_handoff_graph(
                checkpointer=self._async_checkpointer, is_async=True
            )
        elif any(agent.handoff_to for agent in self.agents):
            # Build handoff-aware graph with dynamic routing
            self._async_compiled_graph = self._build_agent_handoff_graph(
                checkpointer=self._async_checkpointer, is_async=True
            )
        elif self.tasks:
            # Build task-based sequential graph with async support
            self._async_compiled_graph = self._build_task_sequential_graph(
                checkpointer=self._async_checkpointer, is_async=True
            )
        elif self.agents:
            # Build agent-based sequential graph with async support
            self._async_compiled_graph = self._build_agent_sequential_graph(
                checkpointer=self._async_checkpointer, is_async=True
            )
        else:
            raise ValueError("No tasks or agents provided to build graph")

        return self._async_compiled_graph

    def _setup_memory(self, config: MemoryConfig):
        """Setup memory system for crew and agents"""
        # 1. Create checkpointer at Crew level (if not explicitly provided)
        if self.checkpointer is None and config.short_term.enabled:
            from langcrew.memory.factory import get_checkpointer

            self.checkpointer = get_checkpointer(
                provider=config.get_short_term_provider(),
                config={
                    "connection_string": config.short_term.connection_string
                    or config.connection_string
                },
            )

        # 2. Create store at Crew level (if not explicitly provided)
        if self.store is None and config.long_term.enabled:
            from langcrew.memory.factory import get_storage

            self.store = get_storage(
                provider=config.get_long_term_provider(),
                config={
                    "connection_string": config.long_term.connection_string
                    or config.connection_string
                },
            )

        # 3. Unify memory_config for all agents and inject store
        for agent in self.agents:
            # Use crew's memory_config to ensure consistency
            agent.memory_config = config
            # Inject crew-level store so agent's executor can access it
            agent.store = self.store
            # Setup agent's memory (only handles long_term memory tools)
            agent._setup_memory(config, is_async=False)

        if self.verbose:
            logger.info(
                f"Memory system applied to crew and agents with provider: {config.provider}"
            )

    async def _setup_async_components(self):
        """Setup async components for async methods"""
        if self.memory_config is None:
            return

        # Skip if already initialized
        if self._async_components_initialized:
            return

        # Re-initialize all agents with async memory setup
        for agent in self.agents:
            if agent.memory_config:
                agent.memory_tools.clear()
                agent._setup_memory(agent.memory_config, is_async=True)
                agent._async_memory_initialized = True

        self._async_components_initialized = True

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

        # Enhance config with crew-level settings if needed
        if config is None and (self.memory_config or self.checkpointer):
            config = RunnableConfig()

        # Get compiled graph and execute
        compiled_graph = self._get_compiled_graph()
        result = compiled_graph.invoke(
            input,
            config=config,
            output_keys=output_keys,
            interrupt_before=interrupt_before,
            interrupt_after=interrupt_after,
            **kwargs,
        )

        return result

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

        # Enhance config as needed
        if config is None and (self.memory_config or self.checkpointer):
            config = RunnableConfig()

        # Get compiled graph and execute asynchronously
        compiled_graph = await self._get_async_compiled_graph()
        result = await compiled_graph.ainvoke(
            input,
            config=config,
            output_keys=output_keys,
            interrupt_before=interrupt_before,
            interrupt_after=interrupt_after,
            **kwargs,
        )

        return result

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

        # Get compiled graph
        compiled_graph = self._get_compiled_graph()

        # Stream from the compiled graph
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

        # Get async compiled graph with async components
        compiled_graph = await self._get_async_compiled_graph()

        # Stream from the compiled graph
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
            processed_event = await self._aprocess_output(chunk)
            if processed_event:
                if isinstance(processed_event, list):
                    for item in processed_event:
                        yield item
                else:
                    yield processed_event

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
        # Get async compiled graph with async components
        compiled_graph = await self._get_async_compiled_graph()
        # Stream events from the compiled graph
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
            processed_event = await self._aprocess_output(event)
            if processed_event:
                if isinstance(processed_event, list):
                    for item in processed_event:
                        yield item
                else:
                    yield processed_event

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

        # Use provided thread_id or generate new one
        self._thread_id = thread_id or str(uuid.uuid4())

        # Create config with thread_id
        config = RunnableConfig(configurable={"thread_id": self._thread_id})

        # Execute with empty state (task_outputs initialized by CrewState default)
        result = self.invoke({}, config)

        # Add thread_id to result for continuity
        if isinstance(result, dict):
            result["thread_id"] = self._thread_id
        else:
            # Create a wrapper if result is not dict
            result = {"output": result, "thread_id": self._thread_id}

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

        # Use provided thread_id or generate new one
        self._thread_id = thread_id or str(uuid.uuid4())

        # Ensure async components are set up
        if self.memory_config:
            await self._setup_async_components()

        # Create config with thread_id
        config = RunnableConfig(configurable={"thread_id": self._thread_id})

        # Execute with empty state (task_outputs initialized by CrewState default)
        result = await self.ainvoke({}, config)

        # Add thread_id to result for continuity
        if isinstance(result, dict):
            result["thread_id"] = self._thread_id
        else:
            # Create a wrapper if result is not dict
            result = {"output": result, "thread_id": self._thread_id}

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

    # Memory access properties (CrewAI compatibility)
    @property
    def memory(self):
        """Access memory configuration status"""
        return self.memory_config is not None

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
