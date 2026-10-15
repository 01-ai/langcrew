"""
Expression Evaluator

Provides expression evaluation for workflow conditions and transformations.
Supports multiple expression formats through a registry pattern.
"""

import logging
from collections.abc import Callable
from typing import Any

logger = logging.getLogger(__name__)


class ExpressionEvaluator:
    """
    Expression evaluator supporting multiple formats.

    Currently supported:
    - string: Static string value (default)
    - cel: Common Expression Language (CEL)

    Expression formats:
    1. String: "some_value" - returned as-is (static value)
    2. Dict with format="string": Static string value
    3. Dict with format="cel": CEL expression evaluated against context
    4. Dict with format="python": Python expression (future)

    Example:
        # CEL expression
        expr = {"expression": "state['count'] > 10", "format": "cel"}
        result = ExpressionEvaluator.evaluate(expr, state)

        # Static string
        expr = {"expression": "gpt-4", "format": "string"}
        result = ExpressionEvaluator.evaluate(expr, state)

        # Legacy string format
        expr = "gpt-4"
        result = ExpressionEvaluator.evaluate(expr, state)
    """

    # Format registry: format_name -> evaluator_function
    _evaluators: dict[str, Callable[[str, dict], Any]] = {}

    @classmethod
    def register_format(
        cls, format_name: str, evaluator_func: Callable[[str, dict], Any]
    ):
        """
        Register a new expression format evaluator.

        Args:
            format_name: Name of the format (e.g., "python", "jinja2")
            evaluator_func: Function that evaluates expressions of this format
                           Signature: (expression: str, context: dict) -> Any
        """
        cls._evaluators[format_name] = evaluator_func

    @classmethod
    def evaluate(cls, expression: str | dict | Any, context: dict) -> Any:
        """
        Evaluate an expression against a context.

        Args:
            expression: Expression to evaluate (string, dict, or other type)
            context: Context dict containing workflow state

        Returns:
            Evaluation result (any type)

        Raises:
            ValueError: If expression format is unsupported
        """
        # String - static value (legacy support)
        if isinstance(expression, str):
            return expression

        # Dict with format specification
        if isinstance(expression, dict):
            # Only treat as expression config if it has "format" or "expression" key
            if "format" in expression or "expression" in expression:
                format_type = expression.get("format", "string")
                expr = expression.get("expression", "")

                # Static string format
                if format_type == "string":
                    return expr

                # Check registered evaluators
                if format_type in cls._evaluators:
                    evaluator = cls._evaluators[format_type]
                    return evaluator(expr, context)

                # Unsupported format
                supported = ["string"] + list(cls._evaluators.keys())
                raise ValueError(
                    f"Unsupported expression format: '{format_type}'. "
                    f"Supported formats: {', '.join(supported)}"
                )

            # Plain dict without format/expression keys - return as-is
            return expression

        # Other types - return as-is (for static values like numbers, booleans, etc.)
        return expression

    @classmethod
    def evaluate_condition(cls, condition: str | dict, context: dict) -> bool:
        """
        Evaluate a condition expression to a boolean.

        Args:
            condition: Condition expression
            context: Workflow state context

        Returns:
            Boolean evaluation result
        """
        result = cls.evaluate(condition, context)
        return bool(result)


# ============================================================================
# Built-in Format: CEL (Common Expression Language)
# ============================================================================


def _eval_cel(expression: str, state: dict) -> Any:
    """
    Evaluate a CEL expression with OpenAI-compatible syntax.

    Args:
        expression: CEL expression string
        state: Workflow state (CrewState as dict)

    Returns:
        Evaluation result

    Context Structure:
        The CEL context provides three namespaces:

        1. workflow.* - Workflow-level inputs (current run)
           - workflow.input_as_text: Initial user input for this workflow run

        2. input.* - Previous node's output
           - input.output: Previous node's text output
           - input.output_text: Previous node's text output (alias for output)
           - input.output_parsed: Previous node's structured output

        3. state.* - User-defined state variables
           - state.customer.tier: Custom state variables (from Start node state_variable_json_schema)

    Examples:
        workflow.input_as_text.contains('退货')
        input.output_parsed.classification == "return_item"
        state.customer.tier == "gold"
    """
    try:
        import celpy
    except ImportError:
        raise ImportError(
            "celpy is required for CEL expression evaluation. "
            "Install with: pip install cel-python"
        )

    try:
        env = celpy.Environment()
        ast = env.compile(expression)
        program = env.program(ast)

        # 1. input.* - Previous node output (OpenAI-compatible)
        previous_node_output = state.get("previous_node_output", {})

        # 2. workflow.* - Workflow-level inputs (OpenAI-compatible)
        # Read from workflow_input field set by Start node
        workflow_context = {}
        workflow_input = state.get("workflow_input")
        if workflow_input:
            workflow_context["input_as_text"] = workflow_input

        # 3. state.* - User-defined state variables
        # Read from user_state field set by Start node
        user_state = state.get("user_state", {})

        # Convert Python dict/list to CEL-compatible types
        def to_cel_compatible(obj):
            """Convert Python objects to CEL-compatible format"""
            if not isinstance(obj, (dict, list)):
                return obj

            try:
                return celpy.json_to_cel(obj)
            except Exception:
                return obj

        # Build CEL activation context
        cel_context = {
            "workflow": to_cel_compatible(workflow_context),
            "input": to_cel_compatible(previous_node_output),
            "state": to_cel_compatible(user_state),
        }

        result = program.evaluate(cel_context)

        # Convert CEL types back to Python native types
        def cel_to_python(obj):
            """Convert CEL types to Python native types"""
            # Handle CEL numeric types
            if hasattr(obj, "__int__") and type(obj).__name__ == "IntType":
                return int(obj)
            if hasattr(obj, "__float__") and type(obj).__name__ in (
                "DoubleType",
                "FloatType",
            ):
                return float(obj)
            # Handle CEL string types
            if hasattr(obj, "__str__") and type(obj).__name__ == "StringType":
                return str(obj)
            # Handle CEL bool types
            if hasattr(obj, "__bool__") and type(obj).__name__ == "BoolType":
                return bool(obj)
            # Handle collections
            if isinstance(obj, dict):
                return {k: cel_to_python(v) for k, v in obj.items()}
            if isinstance(obj, (list, tuple)):
                return [cel_to_python(item) for item in obj]
            return obj

        result = cel_to_python(result)

        logger.debug(
            f"CEL: {expression} -> {result} | "
            f"input={previous_node_output}, "
            f"workflow={workflow_context}, state={user_state}"
        )

        return result
    except Exception as e:
        # OpenAI-compatible: Re-raise exception to stop workflow execution
        logger.error(f"CEL evaluation failed: {e}", exc_info=True)
        raise RuntimeError(
            f"CEL evaluation failed for expression '{expression}': {e}"
        ) from e


# Register CEL as built-in format
ExpressionEvaluator.register_format("cel", _eval_cel)
