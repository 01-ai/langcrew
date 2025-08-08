import logging
from typing import TYPE_CHECKING, Any

from langchain_core.runnables import Runnable, RunnableConfig
from langchain_core.runnables.utils import Input, Output
from pydantic import BaseModel

from .guardrail import GuardrailFunc, with_guardrails
from .types import TaskSpec

if TYPE_CHECKING:
    from .agent import Agent


logger = logging.getLogger(__name__)


class Task(Runnable):
    def __init__(
        self,
        agent: "Agent",
        description: str | None = None,
        expected_output: str | None = None,
        name: str | None = None,
        verbose: bool = False,
        metadata: dict[str, Any] | None = None,
        # CrewAI compatibility
        config: dict[str, Any] | None = None,
        # Structured output support
        output_json: type[BaseModel] | None = None,
        context: list["Task"] | list[str] | None = None,
        # Handoff configuration
        handoff_to: list[str] | None = None,
        # Guardrail support
        input_guards: list[GuardrailFunc] | None = None,
        output_guards: list[GuardrailFunc] | None = None,
    ):
        # Handle CrewAI-style config
        if config:
            description = description or config.get("description")
            expected_output = expected_output or config.get("expected_output")
            # Handle handoff configuration
            if handoff_to is None and config.get("handoff_to"):
                handoff_to = config.get("handoff_to")
            # Other config options can be added here as needed

        # Validate required fields
        if not description:
            raise ValueError("description is required")
        if not expected_output:
            raise ValueError("expected_output is required")
        if not agent:
            raise ValueError("agent is required")

        # Store core task data in TaskSpec
        self._spec = TaskSpec(
            description=description,
            expected_output=expected_output,
            name=name,
            metadata=metadata or {},
            form_task=self,
        )

        # Task specific attributes
        self.agent = agent
        self.verbose = verbose
        self.output_json = output_json  # Store for Crew to use
        self.context = context or []

        # Handoff configuration
        self.handoff_to = handoff_to or []
        
        # Guardrail configuration
        self.input_guards = input_guards or []
        self.output_guards = output_guards or []

    # Properties delegated to TaskSpec
    @property
    def description(self) -> str:
        return self._spec.description

    @property
    def expected_output(self) -> str | None:
        return self._spec.expected_output

    @property
    def name(self) -> str | None:
        return self._spec.name
    
    @name.setter
    def name(self, value: str | None) -> None:
        self._spec.name = value

    @property
    def metadata(self) -> dict[str, Any]:
        return self._spec.metadata

    def _get_context_from_state(self, state: dict[str, Any]) -> str:
        """Extract context from LangGraph state"""
        if not self.context:
            return ""

        task_outputs = state.get("task_outputs", [])

        # Build lookup map
        output_map = {}
        for output in task_outputs:
            # Unified handling for both dict and object types
            if isinstance(output, dict):
                name, content = output.get("name"), output.get("raw", "")
            else:
                name = getattr(output, "name", None)
                content = getattr(output, "raw", str(output))

            if name:
                output_map[name] = content

        # Build context from dependencies
        context_parts = []
        for context_item in self.context:
            if isinstance(context_item, str):
                # String-based context dependency
                task_name = context_item
            else:
                # Object-based context dependency
                task_name = getattr(context_item, "name", None)
            
            if task_name and task_name in output_map:
                context_parts.append(
                    f"**Output from {task_name}:**\n{output_map[task_name]}"
                )

        return "\n\n".join(context_parts)

    def _extract_result_content(self, result: dict[str, Any]) -> str:
        """Extract result content"""
        if isinstance(result, str):
            return result
        elif isinstance(result, dict):
            if "messages" in result and result["messages"]:
                # Get the content of the last AI message
                for msg in reversed(result["messages"]):
                    if hasattr(msg, "content") and msg.content:
                        if isinstance(msg.content, list):
                            # Handle list format content, extract text parts
                            text_parts = []
                            for item in msg.content:
                                if isinstance(item, dict) and "text" in item:
                                    text_parts.append(item["text"])
                                else:
                                    text_parts.append(str(item))
                            return "".join(text_parts)
                        else:
                            return str(msg.content)
                        break
            elif "output" in result:
                return str(result["output"])
            return str(result)
        return str(result)

    def _save_task_output_to_state(self, state: dict[str, Any], result: dict[str, Any]):
        """Save task output to state"""
        # Extract result content
        result_content = self._extract_result_content(result)

        # Create task output object
        task_output = {
            "name": self.name,
            "description": self.description,
            "expected_output": self.expected_output,
            "raw": result_content,
            "agent": getattr(self.agent, "role", "Unknown"),
        }

        if "task_outputs" not in state:
            state["task_outputs"] = []
        state["task_outputs"].append(task_output)

        if self.verbose:
            logger.info(
                f"Task '{self.name}' output saved to state. Length: {len(result_content)}"
            )

    @with_guardrails
    def _executor_invoke(
        self,
        processed_input: Input,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> Output:
        """Executor invoke method with guardrails applied to processed input.
        
        This method is called after input processing (context addition) and applies 
        guardrails to the processed input before calling the agent.
        
        Args:
            processed_input: Input data after context processing
            config: Optional runnable configuration
            **kwargs: Additional arguments
            
        Returns:
            Output from agent execution
        """
        # Call Agent - pass the task instance so Agent can handle all message processing
        result = self.agent.invoke(processed_input, config, task=self, **kwargs)

        # Save task output to state
        if isinstance(processed_input, dict):
            self._save_task_output_to_state(processed_input, result)

        return result

    @with_guardrails
    async def _executor_ainvoke(
        self,
        processed_input: Input,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> Output:
        """Executor async invoke method with guardrails applied to processed input.
        
        This method is called after input processing (context addition) and applies 
        guardrails to the processed input before calling the agent.
        
        Args:
            processed_input: Input data after context processing
            config: Optional runnable configuration
            **kwargs: Additional arguments
            
        Returns:
            Output from agent execution
        """
        # Call Agent - pass the task instance so Agent can handle all message processing
        result = await self.agent.ainvoke(processed_input, config, task=self, **kwargs)

        # Save task output to state
        if isinstance(processed_input, dict):
            self._save_task_output_to_state(processed_input, result)

        return result

    def invoke(
        self,
        input: Input,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> Output:
        # Extract context and add to input
        if isinstance(input, dict):
            context_str = self._get_context_from_state(input)
            if context_str:
                input = input.copy()
                input["context"] = context_str
                if self.verbose:
                    logger.info(
                        f"Task '{self.name}' found context: {len(context_str)} characters"
                    )

        # Call executor method with guardrails applied to processed input
        return self._executor_invoke(input, config, **kwargs)

    async def ainvoke(
        self,
        input: Input,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> Output:
        # Extract context and add to input
        if isinstance(input, dict):
            context_str = self._get_context_from_state(input)
            if context_str:
                input = input.copy()
                input["context"] = context_str
                if self.verbose:
                    logger.info(
                        f"Task '{self.name}' found context: {len(context_str)} characters"
                    )

        # Call executor method with guardrails applied to processed input
        return await self._executor_ainvoke(input, config, **kwargs)
