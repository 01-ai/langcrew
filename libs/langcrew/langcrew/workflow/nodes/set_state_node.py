"""
SetState Node Implementation

Allows direct manipulation of workflow state.
"""

import logging
from typing import Any

from ..utils.expression_evaluator import ExpressionEvaluator
from .base import NodeRegistry, WorkflowNode

logger = logging.getLogger(__name__)


@NodeRegistry.register("builtins.SetState")
class SetStateNode(WorkflowNode):
    """
    Set state variables node.

    Directly sets or updates user-defined workflow state variables.

    Configuration (OpenAI-compatible):
        - assignments: List of variable assignments
          - name: Variable name (stored in user_state)
          - expression: Value expression (supports CEL)
        - continue_on_error: Whether to continue when expression evaluation fails (default: False)
          - If False: throws exception and stops workflow execution
          - If True: sets failed variable to None and continues with other assignments

    Example:
        {
            "assignments": [
                {
                    "name": "counter",
                    "expression": {
                        "expression": "state.counter + 1",
                        "format": "cel"
                    }
                },
                {
                    "name": "last_result",
                    "expression": {
                        "expression": "input.output",
                        "format": "cel"
                    }
                }
            ],
            "continue_on_error": false
        }

    All variables are stored in user_state and accessible via CEL as state.varname
    """

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Set state variables.

        Args:
            state: Current workflow state

        Returns:
            Dict with user_state updates

        Raises:
            Exception: If continue_on_error is False and expression evaluation fails
        """
        # Read config
        assignments = self.config.get("assignments", [])
        continue_on_error = self.config.get("continue_on_error", False)

        # Get current user_state
        current_user_state = state.get("user_state", {})

        # Create a copy to update
        updated_user_state = current_user_state.copy()

        # Track updated variables and errors
        updated_vars = []
        errors = []

        # Process each assignment
        for assignment in assignments:
            if not isinstance(assignment, dict):
                continue

            var_name = assignment.get("name")
            expr_config = assignment.get("expression")

            if not var_name or not expr_config:
                continue

            try:
                # Evaluate the expression
                value = ExpressionEvaluator.evaluate(expr_config, state)
                # Update user_state
                updated_user_state[var_name] = value
                updated_vars.append(var_name)
                logger.debug(f"SetState: {var_name} = {value}")
            except Exception as e:
                logger.error(f"Error evaluating assignment for '{var_name}': {e}")

                if not continue_on_error:
                    # Default behavior: raise exception immediately
                    raise

                # Continue on error: set to None and record error
                updated_user_state[var_name] = None
                errors.append({
                    "variable": var_name,
                    "error": str(e),
                    "expression": (
                        expr_config.get("expression")
                        if isinstance(expr_config, dict)
                        else str(expr_config)
                    ),
                })

        # Build output
        output_parsed = {"updated_variables": updated_vars}
        if errors:
            output_parsed["errors"] = errors

        # Return updated user_state
        return {
            "user_state": updated_user_state,
            "output_parsed": output_parsed,
        }
