from unittest.mock import patch

import pytest
from langcrew.hitl import UserInputTool
from langcrew.hitl.langchain_tools import UserInputRequest
from pydantic import ValidationError


class TestUserInputRequest:
    """Test UserInputRequest model."""

    def test_required_question_field(self):
        """Test that question field is required."""
        with pytest.raises(ValidationError):
            UserInputRequest()

    def test_question_field(self):
        """Test question field validation."""
        request = UserInputRequest(question="What is your name?")
        assert request.question == "What is your name?"

    def test_optional_options_field_default(self):
        """Test default value for optional options field."""
        request = UserInputRequest(question="Do you agree?")
        assert request.options is None

    def test_options_field_with_values(self):
        """Test options field with valid values."""
        options = ["Yes", "No", "Maybe"]
        request = UserInputRequest(question="Do you agree?", options=options)
        assert request.options == options

    def test_options_max_items_constraint(self):
        """Test options field max items constraint (max 4)."""
        options = ["Option1", "Option2", "Option3", "Option4", "Option5"]
        with pytest.raises(ValidationError) as exc_info:
            UserInputRequest(question="Choose one:", options=options)
        assert "at most 4 items" in str(exc_info.value)

    def test_options_empty_list(self):
        """Test options field with empty list."""
        request = UserInputRequest(question="What do you think?", options=[])
        assert request.options == []

    def test_options_exactly_four_items(self):
        """Test options field with exactly 4 items (boundary test)."""
        options = ["A", "B", "C", "D"]
        request = UserInputRequest(question="Choose:", options=options)
        assert request.options == options
        assert len(request.options) == 4


class TestUserInputTool:
    """Test UserInputTool functionality."""

    def test_tool_metadata(self):
        """Test tool metadata properties."""
        assert UserInputTool.name == "user_input"
        tool = UserInputTool()
        assert tool.args_schema == UserInputRequest
        assert "request input from the human" in UserInputTool.description.lower()
        assert "clarification" in UserInputTool.description.lower()

    @pytest.mark.asyncio
    async def test_arun_basic_question(self):
        """Test basic user input request without options."""
        tool = UserInputTool()

        mock_user_response = "My response"

        with (
            patch("langcrew.hitl.langchain_tools.adispatch_custom_event") as mock_event,
            patch(
                "langcrew.hitl.langchain_tools.interrupt",
                return_value=mock_user_response,
            ) as mock_interrupt,
        ):
            result = await tool._arun(question="What is your name?")

            # Verify interrupt was called with correct data
            mock_interrupt.assert_called_once()
            interrupt_data = mock_interrupt.call_args[0][0]
            assert interrupt_data["type"] == "user_input"
            assert interrupt_data["question"] == "What is your name?"
            assert "options" not in interrupt_data

            # Verify events were dispatched
            assert mock_event.call_count == 2

            # Check first event (user input required)
            first_call = mock_event.call_args_list[0]
            assert first_call[0][0] == "on_langcrew_user_input_required"
            assert first_call[0][1]["question"] == "What is your name?"

            # Check second event (user input completed)
            second_call = mock_event.call_args_list[1]
            assert second_call[0][0] == "on_langcrew_user_input_completed"
            assert second_call[0][1]["response"] == mock_user_response

            # Verify result
            assert result == mock_user_response

    @pytest.mark.asyncio
    async def test_arun_with_options(self):
        """Test user input request with options."""
        tool = UserInputTool()

        question = "Do you approve?"
        options = ["Yes", "No"]
        mock_user_response = "Yes"

        with (
            patch("langcrew.hitl.langchain_tools.adispatch_custom_event") as mock_event,
            patch(
                "langcrew.hitl.langchain_tools.interrupt",
                return_value=mock_user_response,
            ) as mock_interrupt,
        ):
            result = await tool._arun(question=question, options=options)

            # Verify interrupt was called with options
            mock_interrupt.assert_called_once()
            interrupt_data = mock_interrupt.call_args[0][0]
            assert interrupt_data["type"] == "user_input"
            assert interrupt_data["question"] == question
            assert interrupt_data["options"] == options

            # Verify first event includes options
            first_call = mock_event.call_args_list[0]
            assert first_call[0][1]["options"] == options

            assert result == mock_user_response

    @pytest.mark.asyncio
    async def test_arun_event_dispatch_failure(self):
        """Test that event dispatch failures don't affect core functionality."""
        tool = UserInputTool()

        mock_user_response = "Response despite event failure"

        with (
            patch(
                "langcrew.hitl.langchain_tools.adispatch_custom_event",
                side_effect=Exception("Event dispatch failed"),
            ) as mock_event,
            patch(
                "langcrew.hitl.langchain_tools.interrupt",
                return_value=mock_user_response,
            ) as mock_interrupt,
        ):
            # Should not raise exception despite event dispatch failure
            result = await tool._arun(question="Test question?")

            # Core functionality should still work
            mock_interrupt.assert_called_once()
            assert result == mock_user_response

            # Events should have been attempted
            assert mock_event.call_count == 2

    @pytest.mark.asyncio
    async def test_arun_user_response_conversion(self):
        """Test that user response is properly converted to string."""
        tool = UserInputTool()

        # Test various response types
        test_cases = [
            42,  # int
            True,  # bool
            ["list"],  # list
            {"key": "value"},  # dict
        ]

        for mock_response in test_cases:
            with (
                patch("langcrew.hitl.langchain_tools.adispatch_custom_event"),
                patch(
                    "langcrew.hitl.langchain_tools.interrupt",
                    return_value=mock_response,
                ),
            ):
                result = await tool._arun(question="Test?")
                assert result == str(mock_response)
                assert isinstance(result, str)

    def test_run_calls_arun(self):
        """Test that _run method calls _arun correctly using asyncio."""
        tool = UserInputTool()

        expected_result = "Sync result"
        question = "Sync question?"
        options = ["A", "B"]

        with patch.object(tool, "_arun", return_value=expected_result):
            result = tool._run(question=question, options=options)

            # Note: Since _run uses asyncio.run(), we can't directly verify the call
            # but we can verify the result
            assert result == expected_result

    def test_run_without_options(self):
        """Test _run method without options."""
        tool = UserInputTool()

        expected_result = "Sync result without options"
        question = "Simple question?"

        with patch.object(tool, "_arun", return_value=expected_result):
            result = tool._run(question=question)
            assert result == expected_result

    @pytest.mark.asyncio
    async def test_arun_empty_options_list(self):
        """Test user input with empty options list."""
        tool = UserInputTool()

        mock_user_response = "Response"

        with (
            patch("langcrew.hitl.langchain_tools.adispatch_custom_event") as mock_event,
            patch(
                "langcrew.hitl.langchain_tools.interrupt",
                return_value=mock_user_response,
            ) as mock_interrupt,
        ):
            result = await tool._arun(question="Question?", options=[])

            # Empty options should still be included in interrupt data
            interrupt_data = mock_interrupt.call_args[0][0]
            assert interrupt_data["options"] == []

            # Empty options should be included in event
            first_call = mock_event.call_args_list[0]
            assert first_call[0][1]["options"] == []

            assert result == mock_user_response

    @pytest.mark.asyncio
    async def test_arun_none_response_handling(self):
        """Test handling of None response from interrupt."""
        tool = UserInputTool()

        with (
            patch("langcrew.hitl.langchain_tools.adispatch_custom_event"),
            patch("langcrew.hitl.langchain_tools.interrupt", return_value=None),
        ):
            result = await tool._arun(question="Question?")

            # None should be converted to "None" string
            assert result == "None"
            assert isinstance(result, str)
