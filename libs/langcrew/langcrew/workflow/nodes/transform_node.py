"""
Transform Node Implementation

Provides data transformation capabilities in workflows.
"""

import logging
from typing import Any

from ..utils.expression_evaluator import ExpressionEvaluator
from .base import NodeRegistry, WorkflowNode

logger = logging.getLogger(__name__)


@NodeRegistry.register("builtins.Transform")
class TransformNode(WorkflowNode):
    """
    Data transformation node (OpenAI-compatible).

    Transforms data by evaluating a single CEL expression that returns an object.
    Similar to End node but for intermediate data transformations.

    Configuration (OpenAI-compatible):
        - expr: CEL expression that returns an object
          - expression: CEL expression string
          - format: "cel"
        - continue_on_error: Whether to continue when expression evaluation fails (default: False)
          - If False: throws exception and stops workflow execution
          - If True: returns error in output_parsed and continues workflow

    Example:
        {
            "expr": {
                "expression": "{\"formatted_name\": input.output.name.upper(), \"age_next_year\": input.output.age + 1}",
                "format": "cel"
            },
            "continue_on_error": false
        }

    The expression should return an object (dict) with key-value pairs.

    Output:
        Result is stored in the "output_parsed" field, accessible via input.output_parsed.key
        Does NOT update user_state - use SetState node for that.
    """

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Execute transformation.

        Args:
            state: Current workflow state

        Returns:
            Dict with transformed data in "output_parsed" field

        Raises:
            Exception: If continue_on_error is False and expression evaluation fails
        """
        expr_config = self.config.get("expr", {})
        continue_on_error = self.config.get("continue_on_error", False)

        # If there's an expression, evaluate it
        if expr_config and expr_config.get("expression"):
            try:
                result = ExpressionEvaluator.evaluate(expr_config, state)

                # Result should be a dict (object from CEL)
                if isinstance(result, dict):
                    logger.debug(f"Transform output: {result}")
                    return {"output_parsed": result}
                else:
                    # If not a dict, wrap it
                    logger.debug(f"Transform output (wrapped): {result}")
                    return {"output_parsed": {"result": result}}
            except Exception as e:
                logger.error(f"Transform expression evaluation error: {e}")

                if not continue_on_error:
                    # Default behavior: raise exception immediately
                    raise

                # Continue on error: return error in output
                return {
                    "output_parsed": {
                        "error": str(e),
                        "expression": expr_config.get("expression"),
                    }
                }

        # No expression, return empty output
        logger.warning("Transform node has no expression configured")
        return {"output_parsed": {}}
