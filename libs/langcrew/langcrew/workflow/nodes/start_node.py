"""
Start Node Implementation

Workflow entry point node.
"""

from typing import Any

from ...utils import extract_text_content
from .base import NodeRegistry, WorkflowNode


@NodeRegistry.register("builtins.Start")
class StartNode(WorkflowNode):
    """
    Workflow start node.

    Marks the entry point of the workflow.
    Initializes user-defined state variables and captures workflow input.

    Configuration:
        - state_variable_json_schema: JSON Schema for state variables
          Example: {
              "type": "object",
              "properties": {
                  "customer": {
                      "type": "object",
                      "default": {"tier": "gold"}
                  }
              }
          }
          Access in CEL: state.customer.tier

    Framework Behavior:
        Automatically captures workflow.input_as_text from latest human message
        and stores in workflow_input field. Also collects all user state variables
        into user_state field for clean CEL namespace separation.
    """

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Initialize workflow state for new run.

        Args:
            state: Initial workflow state (may include historical messages)

        Returns:
            Dict with:
            - user_state: User-defined state variables (from state_variable_json_schema)
            - workflow_input: Initial input for this workflow run

        Note:
            Does NOT manage nodes/previous_node_id - those are automatically
            managed by WorkflowNode.create_handler() during execution.
        """
        schema = self.config.get("state_variable_json_schema", {})

        # 1. Collect user-defined state variables from JSON Schema
        user_state = {}
        if isinstance(schema, dict):
            properties = schema.get("properties", {})
            for var_name, var_schema in properties.items():
                # Read default value from JSON Schema
                default_value = var_schema.get("default")
                user_state[var_name] = default_value

        # 2. Extract workflow input from latest human message
        # Start node only executes on new workflow runs, so this correctly
        # identifies the initial input even in multi-turn conversations
        workflow_input = None
        messages = state.get("messages", [])
        if messages:
            for msg in reversed(messages):
                if (
                    hasattr(msg, "type")
                    and msg.type == "human"
                    and hasattr(msg, "content")
                ):
                    workflow_input = extract_text_content(msg.content)
                    break

        # Return workflow-level state fields
        return {
            "user_state": user_state,
            "workflow_input": workflow_input,
        }
