"""
While Loop Node Implementation

Simple loop control node - body is handled by Builder as subgraph.
"""

import logging
from typing import Any

from ..utils.expression_evaluator import ExpressionEvaluator
from .base import NodeRegistry, WorkflowNode

logger = logging.getLogger(__name__)


@NodeRegistry.register("builtins.While")
class WhileNode(WorkflowNode):
    """
    While loop node for conditional iteration.

    Simple logic:
    1. Evaluate condition
    2. Return routing decision: "body" (continue) or "out" (exit)

    Builder will:
    - Construct body as a subgraph node (for proper state sharing)
    - Add conditional edges for routing
    - Add loop-back edge from body to While node

    Configuration (OpenAI compatible):
        - condition: CEL expression for loop condition (required)
          Example: {"expression": "state.counter < 10", "format": "cel"}
        - max_iterations: Maximum number of iterations (default: 100)
        - continue_on_error: Whether to exit loop when condition evaluation fails (default: False)
          - If False: throws exception and stops workflow execution
          - If True: exits loop with error information in output
        - body: Sub-workflow definition (optional)
          - nodes: List of body node configurations
          - edges: List of body edge configurations (only internal connections)
          - start_node_id: Entry point of body (optional, defaults to first node)

    The body subgraph (built by Builder):
    - Uses same CrewState (seamless state sharing via add_node)
    - Inherits parent checkpointer automatically
    - Executes its internal nodes/edges
    - Returns to While node after completion

    Edges (handled by Builder):
    - While → body subgraph (when condition true)
    - body subgraph → While (loop back)
    - While → out target (when condition false)
    """

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Evaluate loop condition and return routing decision.

        Args:
            state: Current workflow state (CrewState)

        Returns:
            State updates with __next__ for routing:
            - "__next__": "body" - Continue loop (enter body)
            - "__next__": "out" - Exit loop

        Raises:
            Exception: If continue_on_error is False and condition evaluation fails
        """
        # Get loop configuration
        condition = self.config.get("condition", {})
        max_iterations = self.config.get("max_iterations", 100)
        continue_on_error = self.config.get("continue_on_error", False)

        # Get loop counter from user_state (persists across subgraph calls)
        loop_key = f"__loop_{self.id}"
        user_state = state.get("user_state", {})
        current_count = user_state.get(loop_key, 0)

        # Check max iterations
        if current_count >= max_iterations:
            return {
                "__next__": "out",
                "output_parsed": {
                    "reason": "max_iterations_reached",
                    "iterations": current_count,
                },
            }

        # Evaluate condition
        try:
            should_continue = ExpressionEvaluator.evaluate_condition(condition, state)
        except Exception as e:
            logger.error(f"Error evaluating while loop condition: {e}")

            if not continue_on_error:
                # Default behavior: raise exception immediately
                raise

            # Continue on error: exit loop with error information
            return {
                "__next__": "out",
                "output_parsed": {
                    "reason": "condition_error",
                    "error": str(e),
                    "iterations": current_count,
                },
            }

        if should_continue:
            # Increment counter and enter loop body
            new_user_state = user_state.copy()
            new_user_state[loop_key] = current_count + 1
            return {
                "user_state": new_user_state,
                "__next__": "body",
            }
        else:
            # Exit loop
            return {
                "__next__": "out",
                "output_parsed": {
                    "reason": "condition_false",
                    "iterations": current_count,
                },
            }
