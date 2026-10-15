"""
Unit tests for ApprovalNode.

Covers the wire payload invariants used by the frontend:
- `interrupt_data.question_type` is set to "approval".
- The label list preserves the workflow author's configured order.
- The boolean resume value remains supported for compatibility.
"""

from contextlib import contextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from langcrew.workflow.nodes.approval_node import ApprovalNode


def _make_node(node_id: str = "approval-1", config: dict | None = None) -> ApprovalNode:
    return ApprovalNode(
        id=node_id,
        node_type="builtins.BinaryApproval",
        label="Approval",
        config=config or {},
    )


@contextmanager
def _patched_interrupt(resume_value):
    """Patch the lazy imports inside ApprovalNode.execute()."""
    mock_interrupt = MagicMock(return_value=resume_value)
    with (
        patch(
            "langchain_core.callbacks.manager.adispatch_custom_event",
            AsyncMock(),
        ),
        patch("langgraph.types.interrupt", mock_interrupt),
    ):
        yield mock_interrupt


class TestApprovalNodeInterruptPayload:
    """The interrupt payload is the contract with the frontend."""

    @pytest.mark.asyncio
    async def test_default_options_send_approve_first(self):
        node = _make_node()

        with _patched_interrupt(True) as mock_interrupt:
            result = await node.execute({})

        interrupt_data = mock_interrupt.call_args[0][0]
        assert interrupt_data["type"] == "user_input"
        assert interrupt_data["question_type"] == "approval"
        assert interrupt_data["options"] == ["Approve", "Reject"]
        assert interrupt_data["approval_mode"] is True
        assert result["__next__"] == "on_approve"
        assert result["output_parsed"]["approved"] is True

    @pytest.mark.asyncio
    async def test_custom_option_order_is_preserved(self):
        """Custom configs should preserve the workflow author's button order."""
        node = _make_node(
            config={
                "message": "Cancel or proceed?",
                "options": [
                    {"value": "reject", "label": "Cancel"},
                    {"value": "approve", "label": "OK"},
                ],
            }
        )

        with _patched_interrupt("OK") as mock_interrupt:
            result = await node.execute({})

        interrupt_data = mock_interrupt.call_args[0][0]
        assert interrupt_data["question_type"] == "approval"
        assert interrupt_data["options"] == ["Cancel", "OK"]
        # Label parsing still maps the configured approve label to approve.
        assert result["__next__"] == "on_approve"

    @pytest.mark.asyncio
    async def test_bool_false_routes_to_reject(self):
        node = _make_node()

        with _patched_interrupt(False):
            result = await node.execute({})

        assert result["output_parsed"]["approved"] is False
        assert result["__next__"] == "on_reject"

    @pytest.mark.asyncio
    async def test_legacy_string_label_still_resolves(self):
        """The string-label resume path must remain order-independent."""
        node = _make_node(
            config={
                "options": [
                    {"value": "reject", "label": "Cancel"},
                    {"value": "approve", "label": "OK"},
                ],
            }
        )

        with _patched_interrupt("Cancel"):
            result = await node.execute({})

        # "Cancel" maps to value=="reject" → False, regardless of label order.
        assert result["output_parsed"]["approved"] is False
        assert result["__next__"] == "on_reject"
