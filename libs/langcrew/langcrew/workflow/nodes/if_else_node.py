"""
IfElse Node Implementation

Provides conditional branching in workflows.
"""

import logging
from typing import Any

from ..utils.expression_evaluator import ExpressionEvaluator
from .base import NodeRegistry, WorkflowNode

logger = logging.getLogger(__name__)


@NodeRegistry.register("builtins.IfElse")
class IfElseNode(WorkflowNode):
    """
    Conditional branching node.

    Evaluates conditions and routes execution to different branches.

    Configuration:
        - cases: List of condition cases
          - label: Case label
          - output_port_id: Port ID for routing
          - predicate: Condition expression (CEL)
        - fallback: Default case if no conditions match
          - label: Fallback label
          - output_port_id: Fallback port ID
        - continue_on_error: Whether to continue when condition evaluation fails (default: False)
          - If False: throws exception and stops workflow execution
          - If True: skips failed condition and continues to next case or fallback

    Returns:
        Dict with "__next__" key specifying the next edge port to follow
    """

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Execute conditional logic.

        Args:
            state: Current workflow state

        Returns:
            Dict with "__next__" key for routing

        Raises:
            Exception: If continue_on_error is False and condition evaluation fails
        """
        cases = self.config.get("cases", [])
        fallback = self.config.get("fallback", {})
        continue_on_error = self.config.get("continue_on_error", False)

        # Evaluate each case condition
        for case in cases:
            predicate = case.get("predicate")
            if not predicate:
                continue

            try:
                if ExpressionEvaluator.evaluate_condition(predicate, state):
                    # Condition matched
                    return {
                        "__next__": case.get("output_port_id"),
                        "output_parsed": {
                            "matched_case": case.get("label"),
                            "port_id": case.get("output_port_id"),
                        },
                    }
            except Exception as e:
                logger.error(
                    f"Error evaluating condition for case '{case.get('label')}': {e}"
                )

                if not continue_on_error:
                    # Default behavior: raise exception immediately
                    raise

                # Continue on error: skip this case and try next
                continue

        # No condition matched, use fallback
        return {
            "__next__": fallback.get("output_port_id", "fallback"),
            "output_parsed": {
                "matched_case": "fallback",
                "port_id": fallback.get("output_port_id", "fallback"),
            },
        }
