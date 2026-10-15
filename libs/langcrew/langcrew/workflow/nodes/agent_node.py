"""
Agent Node Implementation

Represents an LLM agent node in the workflow.
Supports MCP tools and widgets.
"""

import logging
import re
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import ensure_config

from ...agent import Agent
from ...citation import CitationConfig, CitationMiddleware
from ...citation.config import resolve_citation_config
from ..utils.expression_evaluator import ExpressionEvaluator
from .base import NodeRegistry, WorkflowNode, create_llm_from_config

logger = logging.getLogger(__name__)


@NodeRegistry.register("builtins.Agent")
class AgentNode(WorkflowNode):
    """
    Agent node for LLM-powered reasoning and tool use.

    Configuration:
        - prompt: Custom prompt (overrides label-based default)
        - instructions: Custom instructions (OpenAI style, alias for prompt)
        - model: Model name (supports CEL)
        - llm: LLM configuration (supports CEL, can be string or dict)
        - messages: List of message templates
        - tools: List of tool configurations (including MCP)
        - widgets: List of widget configurations
        - mcp_servers: MCP server configurations
        - citation: Source citation config (boolean or enabled/prompt object)
        - response_format: Response format (LangCrew style, null for text, JSON Schema dict for structured output)
        - text: Response text configuration (OpenAI style, contains format field)
        - variable_mapping: Input variable mappings
        - continue_on_error: Whether to continue when errors occur (default: False)
          - If False: throws exception and stops workflow execution
          - If True: returns error information in output_parsed and continues workflow
    """

    citation_default = CitationConfig()

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Execute the agent node.

        Args:
            state: Current workflow state

        Returns:
            Dict with "messages" containing agent response

        Raises:
            Exception: If continue_on_error is False and any operation fails
        """
        continue_on_error = self.config.get("continue_on_error", False)

        # Build agent configuration
        try:
            llm = create_llm_from_config(self.config, state)
            tools = self.config.get("tools", [])
            widgets = self.config.get("widgets", [])
            mcp_servers = self.config.get("mcp_servers")
            middleware = self.config.get("middleware", ())
            response_format = self._get_response_format()
            citation = resolve_citation_config(
                self.config.get("citation") if "citation" in self.config else None,
                self.citation_default,
            )
            middleware = tuple(
                item
                for item in middleware
                if not isinstance(item, CitationMiddleware)
            )
            if citation.enabled:
                middleware = (*middleware, CitationMiddleware(citation))

            prompt = self._get_prompt(state)

            # Build messages for agent input
            input_messages = self._build_messages(state)
        except Exception as e:
            logger.error(f"Error preparing agent configuration: {e}")
            if not continue_on_error:
                raise

            # Return error information
            return {
                "output_parsed": {
                    "error": str(e),
                    "error_type": "configuration_error",
                }
            }

        # Create agent instance
        try:
            if not prompt:
                prompt = f"You are {self.label}. Perform tasks as instructed."

            agent = Agent(
                prompt=prompt,
                llm=llm,
                tools=tools,
                middleware=middleware,
                widgets=widgets,
                mcp_servers=mcp_servers,
                response_format=response_format,
                verbose=state.get("verbose", False),
            )

            # Execute agent with config from parent workflow
            # This passes execution control parameters (recursion_limit, callbacks, etc.)
            # while Agent's internal ReAct graph remains stateless (no checkpointer)
            config = ensure_config()
            result = await agent.ainvoke({"messages": input_messages}, config=config)

            # Return messages (LangGraph standard) + output_parsed (OpenAI compatible)
            return_dict = {
                "messages": result.get("messages", []),
            }

            # Add output_parsed if structured_response exists (OpenAI-compatible)
            if "structured_response" in result:
                return_dict["output_parsed"] = result["structured_response"]

            return return_dict

        except Exception as e:
            logger.error(f"Error executing agent: {e}")
            if not continue_on_error:
                raise

            # Return error information
            return {
                "output_parsed": {
                    "error": str(e),
                    "error_type": "execution_error",
                }
            }

    def _get_prompt(self, state: dict[str, Any]) -> str | None:
        """
        Get custom prompt, evaluating expressions if needed.

        Supports both LangCrew 'prompt' and OpenAI 'instructions' fields.

        Raises:
            Exception: If expression evaluation fails (caller should handle)
        """
        # Support both 'prompt' (LangCrew) and 'instructions' (OpenAI)
        prompt = self.config.get("prompt") or self.config.get("instructions")
        if not prompt:
            return None
        result = ExpressionEvaluator.evaluate(prompt, state)
        # Prompt must be string, convert if needed
        return str(result) if result else None

    def _get_response_format(self) -> dict | None:
        """
        Get response format, supporting both LangCrew and OpenAI formats.

        LangCrew format: response_format (direct JSON schema)
        OpenAI format: text.format.schema (nested structure)

        Returns:
            JSON schema dict or None for text output
        """
        # LangCrew format: response_format
        if "response_format" in self.config:
            return self.config["response_format"]

        # OpenAI format: text.format
        text_config = self.config.get("text", {})
        format_config = text_config.get("format", {})

        if format_config.get("type") == "json_schema":
            # Convert OpenAI format to LangCrew format
            return format_config.get("schema")
        elif format_config.get("type") == "text":
            # Text format - no structured output
            return None

        return None

    def _build_messages(self, state: dict[str, Any]) -> list:
        """
        Build messages for agent input.

        Default behavior (no 'messages' config):
            Returns all messages from workflow state, including:
            - Original user input
            - Previous agents' outputs
            - Tool calls and results from previous agents

            This allows the agent to see full conversation context.

        Custom behavior (with 'messages' config):
            Builds messages from templates with CEL variable substitution.
            Use this to:
            - Extract specific information from previous_node_output
            - Reduce token usage by passing only necessary context
            - Format input in a specific way

            Example config:
                messages:
                  - role: user
                    content:
                      - type: input_text
                        text: "Based on intent {{input.intent}}, perform action"

        Args:
            state: Current workflow state

        Returns:
            List of messages to pass to the agent

        Raises:
            Exception: If message template evaluation fails critically
        """
        messages_config = self.config.get("messages", [])
        result = []

        # If no messages configured, use state messages
        if not messages_config:
            return state.get("messages", [])

        for msg in messages_config:
            role = msg.get("role", "user")
            content_items = msg.get("content", [])

            # Build content from items
            content_parts = []
            for item in content_items:
                item_type = item.get("type", "")
                # Handle both input_text (user messages) and output_text (assistant messages)
                if item_type in ("input_text", "output_text"):
                    text = item.get("text", "")
                    # Evaluate template variables using CEL
                    # Simple {{variable}} replacement for now

                    def replace_var(match):
                        var_expr = match.group(1).strip()
                        try:
                            return str(
                                ExpressionEvaluator.evaluate(
                                    {"expression": var_expr, "format": "cel"}, state
                                )
                            )
                        except Exception as e:
                            logger.warning(
                                f"Failed to evaluate template variable '{var_expr}': {e}"
                            )
                            return match.group(0)  # Keep original if eval fails

                    text = re.sub(r"\{\{(.+?)\}\}", replace_var, text)
                    content_parts.append(text)

            content = "\n".join(content_parts)

            # Create message based on role
            if role == "system":
                result.append(SystemMessage(content=content))
            elif role == "user":
                result.append(HumanMessage(content=content))
            elif role == "assistant":
                result.append(AIMessage(content=content))

        return result
