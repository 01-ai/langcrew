"""
Approval Node Implementation

HITL node for user approval with conditional routing.
"""

from typing import Any

from .base import NodeRegistry, WorkflowNode


@NodeRegistry.register("builtins.BinaryApproval")
class ApprovalNode(WorkflowNode):
    """
    Binary approval node for human-in-the-loop workflows.

    Pauses workflow and waits for user to approve or reject.
    Routes to different paths based on user decision.

    Compatible with OpenAI Agent Builder's BinaryApproval node.

    Configuration:
        - message: Approval prompt message (OpenAI compatible)
        - prompt: Alias for message (backward compatible)
        - variable_mapping: (UI only, not used in execution)

    Input (from state):
        - previous_node_output: Previous node's output data (auto-managed by base handler)

    Workflow:
        1. Get context from previous node output
        2. Trigger interrupt with approval request
        3. Wait for user decision (approve/reject)
        4. Return result with routing signal

    Output Ports:
        - on_approve: User approved
        - on_reject: User rejected

    Execution flow:
        - First call: Triggers interrupt, pauses workflow, saves checkpoint
        - Resume call: interrupt() returns user data, continues execution

    Example:
        {
            "node_type": "builtins.BinaryApproval",
            "config": {
                "message": "Does this work for you?"
            }
        }
    """

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Execute approval node with interrupt.

        This method is called twice:
        1. First execution: Triggers interrupt and pauses
        2. Resume execution: Gets user decision and routes accordingly
        """
        from langchain_core.callbacks.manager import adispatch_custom_event
        from langgraph.types import interrupt

        # Support both 'message' (OpenAI) and 'prompt' (backward compatible)
        message = self.config.get("message") or self.config.get("prompt", "")

        # Get previous node output as context for display
        previous_output_data = state.get("previous_node_output", {})
        previous_output = previous_output_data.get(
            "output_text"
        ) or previous_output_data.get("output_parsed")

        # Set default message if not provided
        if not message:
            message = "Please approve to continue"

        # Get options from config or use default
        options = self.config.get(
            "options",
            [
                {"value": "approve", "label": "Approve"},
                {"value": "reject", "label": "Reject"},
            ],
        )

        # Extract labels for frontend display, preserving configured order.
        labels = [opt.get("label", opt.get("value", "")) for opt in options]

        # Build interrupt data using UserInputTool pattern
        # Use "user_input" type so adapter's existing handler recognizes it
        interrupt_data = {
            "type": "user_input",  # Reuse UserInputTool's type for compatibility
            "question_type": "approval",
            "question": message,
            "node_id": self.id,  # Add node_id for tracking
            "approval_mode": True,  # Flag to indicate this is approval mode
            "input_data": previous_output,  # Context from previous node
            "options": labels,  # Send only labels to frontend
        }

        # Send custom event (following UserInputTool pattern)
        # This ensures adapter's _handle_custom_event processes it with options
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_required",  # Same event as UserInputTool
                interrupt_data,
                config=None,
            )
        except Exception:
            pass  # Event sending failure doesn't affect core functionality

        # Trigger interrupt (LangGraph core functionality)
        user_response = interrupt(interrupt_data)

        # Send completion event (optional, for consistency)
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_completed",
                {"response": user_response, "node_id": self.id},
                config=None,
            )
        except Exception:
            pass

        # Parse user decision (only reached after resume)
        approved = self._parse_approval_response(user_response, options)

        # Return result with routing
        return {
            "output_parsed": {
                "approved": approved,
                "message": message,
                "input_data": previous_output,
            },
            # Routing signal for conditional edges
            "__next__": "on_approve" if approved else "on_reject",
        }

    def _parse_approval_response(self, response: Any, options: list[dict]) -> bool:
        """
        Parse user's approval response with minimal backward compatibility.

        Primary format: label string from frontend (any language)
        Backward compatible with: dict, boolean formats

        Args:
            response: User's response from interrupt resume
            options: List of option dicts from config with 'value' and 'label' keys

        Returns:
            True if approved, False if rejected
        """
        if response is None:
            return False

        # Dict format (new or legacy)
        if isinstance(response, dict):
            # New format: {value: "approve"}
            if "value" in response:
                return response["value"] == "approve"
            # Legacy format: {approved: true}
            if "approved" in response:
                return response["approved"]

        # Boolean format (direct return)
        if isinstance(response, bool):
            return response

        # String format - match label from options
        if isinstance(response, str):
            response_str = response.strip()

            # Match label to value
            for opt in options:
                if opt.get("label") == response_str:
                    return opt.get("value") == "approve"

            # Fallback: default approve labels (for cases without config)
            # This ensures backward compatibility with simple API calls
            return response_str in ["Approve", "approve"]

        return False
