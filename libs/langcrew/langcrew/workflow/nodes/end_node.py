"""
End Node Implementation

Workflow exit point node with output handling.
"""

import logging
from typing import Any

from .base import NodeRegistry, WorkflowNode

logger = logging.getLogger(__name__)


@NodeRegistry.register("builtins.End")
class EndNode(WorkflowNode):
    """
    Workflow end node.

    Marks the exit point of the workflow.
    Can evaluate a final expression to set output.

    Configuration:
        - expr: Expression to evaluate for final output (CEL format)
          Example: {"expression": "input.output_parsed", "format": "cel"}
        - continue_on_error: Whether to continue when expression evaluation fails (default: False)
          - If False: throws exception and stops workflow execution
          - If True: returns empty output on error

    Output Behavior:
        - If expr is provided: Evaluates and returns the result
        - If expr is None: Returns empty (no automatic output)
        - Supports both structured (dict) and text (str) outputs
        - Always returns output_parsed for consistency

    Output Fields:
        - output_parsed: Structured data (dict, present only when expr is configured)

    Examples:
        # Return structured output
        expr: {"expression": '{"status": "completed", "result": input.output_parsed}'}

        # Return previous node output text
        expr: {"expression": "input.output_text"}

        # Return previous node parsed data
        expr: {"expression": "input.output_parsed"}

        # Return custom message
        expr: {"expression": '{"message": "Task completed successfully"}'}

        # No output (workflow ends silently)
        expr: None or {}
    """

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Finalize the workflow state.

        Args:
            state: Current workflow state

        Returns:
            Dict with output_parsed if expression is configured, otherwise empty dict

        Raises:
            Exception: If continue_on_error is False and expression evaluation fails

        Note:
            End node requires explicit expression configuration to produce output.
            This prevents unintended output and avoids duplicating content that
            was already displayed by previous nodes (e.g., Agent messages).
        """
        expr_config = self.config.get("expr", {})
        continue_on_error = self.config.get("continue_on_error", False)

        result = None

        # Only evaluate if expression is configured
        if expr_config and expr_config.get("expression"):
            from ..utils.expression_evaluator import ExpressionEvaluator

            try:
                result = ExpressionEvaluator.evaluate(expr_config, state)
            except Exception as e:
                logger.error(f"Error evaluating end node expression: {e}")

                if not continue_on_error:
                    # Default behavior: raise exception immediately
                    raise

                # Continue on error: return empty
                logger.warning("Expression evaluation failed, returning empty output")

        # If no expression or evaluation failed, return empty
        if result is None:
            return {}

        # Format output based on type
        return self._format_output(result)

    def _format_output(self, result: Any) -> dict[str, Any]:
        """
        Format output for OpenAI compatibility and display.

        Args:
            result: Raw result from expression evaluation

        Returns:
            Dict with:
            - output_parsed: dict (always wrapped for consistency)
            - output_display: str (formatted for UI display)
        """
        import json

        # Determine output_parsed (structured data)
        if isinstance(result, dict):
            output_parsed = result
        else:
            output_parsed = {"result": str(result)}

        # Format output_display (UI display content)
        if isinstance(result, dict):
            # Structured output - format as JSON code block
            json_str = json.dumps(result, indent=2, ensure_ascii=False)
            output_display = f"```json\n{json_str}\n```"
        else:
            # Plain text output
            output_display = str(result)

        return {
            "output_parsed": output_parsed,
            "output_display": output_display,
        }
