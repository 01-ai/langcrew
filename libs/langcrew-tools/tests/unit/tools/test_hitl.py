import json
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from langcrew_tools.hitl import DynamicFormUserInputTool, UserInputTool
from langcrew_tools.hitl.langchain_tools import (
    DynamicFormUserInputRequest,
    UserInputRequest,
)


class TestUserInputRequest:
    """Test UserInputRequest model."""

    def test_required_question_field(self):
        """Test that questions field is required."""
        with pytest.raises(ValidationError):
            UserInputRequest()

    def test_question_field(self):
        """Legacy single-question input is normalized into one entry."""
        request = UserInputRequest(question="What is your name?")
        assert len(request.questions) == 1
        assert request.questions[0].question == "What is your name?"

    def test_optional_options_field_default(self):
        """Test default value for optional options field."""
        request = UserInputRequest(question="Do you agree?")
        assert request.questions[0].options is None
        assert request.questions[0].question_type == "text"

    def test_options_field_with_values(self):
        """Test options field with valid values."""
        options = ["Yes", "No", "Maybe"]
        request = UserInputRequest(question="Do you agree?", options=options)
        assert request.questions[0].options == options
        # Back-compat: passing options without an explicit question_type
        # should set question_type to single_select so the in-memory model
        # matches the eventual wire payload.
        assert request.questions[0].question_type == "single_select"

    def test_text_with_options_promoted_to_single_select(self):
        """Test that explicit text + options is still promoted to single_select."""
        request = UserInputRequest(
            question="Pick one:", question_type="text", options=["A", "B"]
        )
        assert request.questions[0].question_type == "single_select"

    def test_text_without_options_stays_text(self):
        """Text-only requests stay text."""
        request = UserInputRequest(question="Free answer?", question_type="text")
        assert request.questions[0].question_type == "text"

    def test_options_max_items_constraint(self):
        """Test options field max items constraint (max 4)."""
        options = ["Option1", "Option2", "Option3", "Option4", "Option5"]
        with pytest.raises(ValidationError) as exc_info:
            UserInputRequest(question="Choose one:", options=options)
        assert "at most 4 items" in str(exc_info.value)

    def test_options_empty_list(self):
        """Test options field with empty list."""
        request = UserInputRequest(question="What do you think?", options=[])
        assert request.questions[0].options == []

    def test_options_exactly_four_items(self):
        """Test options field with exactly 4 items (boundary test)."""
        options = ["A", "B", "C", "D"]
        request = UserInputRequest(question="Choose:", options=options)
        assert request.questions[0].options == options
        assert len(request.questions[0].options) == 4

    def test_single_select_requires_options(self):
        """Test that single-select questions require options."""
        with pytest.raises(ValidationError) as exc_info:
            UserInputRequest(
                question="Choose one:", question_type="single_select"
            )
        assert "single_select questions require options" in str(exc_info.value)

    def test_multi_select_requires_options(self):
        """Test that multi-select questions require options."""
        with pytest.raises(ValidationError) as exc_info:
            UserInputRequest(question="Choose many:", question_type="multi_select")
        assert "multi_select questions require options" in str(exc_info.value)

    def test_approval_options_must_be_two_labels(self):
        """Test that approval questions accept no options or exactly two labels."""
        request = UserInputRequest(question="Proceed?", question_type="approval")
        assert request.questions[0].question_type == "approval"

        with pytest.raises(ValidationError) as exc_info:
            UserInputRequest(
                question="Proceed?",
                question_type="approval",
                options=["Yes", "No", "Maybe"],
            )
        assert "approval questions must provide either no options or exactly 2 options" in str(
            exc_info.value
        )

    def test_form_schema_json_string_is_parsed(self):
        """Test weak-model form_schema JSON strings are parsed into FormSchema."""
        form_schema = {
            "properties": {
                "name": {
                    "type": "string",
                    "title": "Name",
                    "required": True,
                }
            },
            "required": ["name"],
            "title": "User Info",
        }

        request = UserInputRequest(
            question="Please fill this in",
            form_schema=json.dumps(form_schema),
        )

        assert request.questions[0].form_schema is not None
        assert request.questions[0].form_schema.title == "User Info"
        assert request.questions[0].form_schema.properties["name"].title == "Name"

    def test_malformed_form_schema_json_string_fails_validation(self):
        """Test malformed form_schema JSON strings fail with a helpful error."""
        with pytest.raises(ValidationError) as exc_info:
            UserInputRequest(
                question="Please fill this in",
                form_schema='{"properties":',
            )

        assert "Failed to parse form_schema string as JSON" in str(exc_info.value)

    def test_form_schema_description_discourages_string_encoding(self):
        """Test tool schema tells models not to JSON-string encode form_schema."""
        schema = UserInputRequest.model_json_schema()

        question_schema = schema["$defs"]["UserInputQuestion"]
        assert "not as a JSON-encoded string" in question_schema["properties"][
            "form_schema"
        ]["description"]

    def test_only_questions_exposed_to_model(self):
        """Test the model-facing schema exposes only questions (+ inherited brief)."""
        schema = UserInputRequest.model_json_schema()

        assert set(schema["properties"].keys()) == {"questions", "brief"}

    def test_questions_json_string_is_parsed(self):
        """Test weak-model questions JSON strings are parsed into a batch."""
        request = UserInputRequest(questions='[{"question": "Q?"}]')

        assert len(request.questions) == 1
        assert request.questions[0].question == "Q?"

    def test_malformed_questions_json_string_fails_validation(self):
        """Test malformed questions JSON strings fail with a helpful error."""
        with pytest.raises(ValidationError) as exc_info:
            UserInputRequest(questions='[{"question":')

        assert "Failed to parse questions string as JSON" in str(exc_info.value)

    def test_empty_questions_list_fails_validation(self):
        """Test that an empty questions batch fails validation."""
        with pytest.raises(ValidationError) as exc_info:
            UserInputRequest(questions=[])

        assert "at least one question" in str(exc_info.value)

    def test_dynamic_form_request_has_brief_field(self):
        """DynamicFormUserInputRequest keeps the inherited brief field."""
        request = DynamicFormUserInputRequest(question="Fill this in")

        assert request.brief == ""
        assert request.question == "Fill this in"


class TestUserInputTool:
    """Test UserInputTool functionality."""

    def test_tool_metadata(self):
        """Test tool metadata properties."""
        assert UserInputTool.name == "user_input"
        tool = UserInputTool()
        assert tool.args_schema == UserInputRequest
        assert "request input from the human" in UserInputTool.description.lower()
        assert "clarification" in UserInputTool.description.lower()

    def test_description_batches_all_questions_in_one_call(self):
        """Tool description must steer the model to one batched call per turn."""
        assert "questions" in UserInputTool.description
        assert "NEVER call this tool more than once in the same turn" in (
            UserInputTool.description
        )
        assert "JSON array" in UserInputTool.description

    @pytest.mark.asyncio
    async def test_arun_basic_question(self):
        """Test basic user input request without options."""
        tool = UserInputTool()

        mock_user_response = "My response"

        with (
            patch(
                "langcrew_tools.hitl.langchain_tools.adispatch_custom_event"
            ) as mock_event,
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=mock_user_response,
            ) as mock_interrupt,
        ):
            result = await tool._arun(question="What is your name?")

            # Verify interrupt was called with correct data
            mock_interrupt.assert_called_once()
            interrupt_data = mock_interrupt.call_args[0][0]
            assert interrupt_data["type"] == "user_input"
            assert len(interrupt_data["questions"]) == 1
            question = interrupt_data["questions"][0]
            assert question["question_id"] == "q_0"
            assert question["question_type"] == "text"
            assert question["question"] == "What is your name?"
            assert "options" not in question

            # Verify events were dispatched
            assert mock_event.call_count == 2

            # Check first event (user input required)
            first_call = mock_event.call_args_list[0]
            assert first_call[0][0] == "on_langcrew_user_input_required"
            assert (
                first_call[0][1]["questions"][0]["question"] == "What is your name?"
            )

            # Check second event (user input completed)
            second_call = mock_event.call_args_list[1]
            assert second_call[0][0] == "on_langcrew_user_input_completed"
            assert second_call[0][1]["response"] == mock_user_response

            # Verify result
            assert json.loads(result) == [
                {
                    "question_id": "q_0",
                    "question": "What is your name?",
                    "answer": mock_user_response,
                }
            ]

    @pytest.mark.asyncio
    async def test_arun_with_options(self):
        """Test user input request with options."""
        tool = UserInputTool()

        question = "Do you approve?"
        options = ["Yes", "No"]
        mock_user_response = "Yes"

        with (
            patch(
                "langcrew_tools.hitl.langchain_tools.adispatch_custom_event"
            ) as mock_event,
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=mock_user_response,
            ) as mock_interrupt,
        ):
            result = await tool._arun(question=question, options=options)

            # Verify interrupt was called with options
            mock_interrupt.assert_called_once()
            interrupt_data = mock_interrupt.call_args[0][0]
            entry = interrupt_data["questions"][0]
            assert interrupt_data["type"] == "user_input"
            assert entry["question_type"] == "single_select"
            assert entry["question"] == question
            assert entry["options"] == options
            # No dedicated flag is needed: custom answers for single_select
            # come through the always-enabled chat composer, not an inline
            # input, so the wire payload only needs `question_type` + options.
            assert "allow_custom_answer" not in entry

            # Verify first event includes options
            first_call = mock_event.call_args_list[0]
            assert first_call[0][1]["questions"][0]["question_type"] == "single_select"
            assert first_call[0][1]["questions"][0]["options"] == options

            assert json.loads(result) == [
                {
                    "question_id": "q_0",
                    "question": question,
                    "answer": mock_user_response,
                }
            ]

    @pytest.mark.asyncio
    async def test_arun_approval_question(self):
        """Test approval user input request."""
        tool = UserInputTool()

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="Approve",
            ) as mock_interrupt,
        ):
            result = await tool._arun(question="Proceed?", question_type="approval")

            interrupt_data = mock_interrupt.call_args[0][0]
            entry = interrupt_data["questions"][0]
            assert interrupt_data["type"] == "user_input"
            assert entry["question_type"] == "approval"
            assert entry["question"] == "Proceed?"
            assert "options" not in entry
            assert json.loads(result)[0]["answer"] == "Approve"

    @pytest.mark.asyncio
    async def test_arun_approval_question_with_custom_labels(self):
        """Approval label strings are preserved as user responses."""
        tool = UserInputTool()
        options = ["Approve", "Deny"]

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="Approve",
            ) as mock_interrupt,
        ):
            result = await tool._arun(
                question="Approve this?", question_type="approval", options=options
            )

            interrupt_data = mock_interrupt.call_args[0][0]
            assert interrupt_data["questions"][0]["question_type"] == "approval"
            assert interrupt_data["questions"][0]["options"] == options
            assert json.loads(result)[0]["answer"] == "Approve"

    @pytest.mark.asyncio
    async def test_arun_approval_preserves_second_label_string(self):
        """Approval reject label strings are preserved as user responses."""
        tool = UserInputTool()
        options = ["Allow", "Block"]

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="Block",
            ),
        ):
            result = await tool._arun(
                question="Allow this?", question_type="approval", options=options
            )

            assert json.loads(result)[0]["answer"] == "Block"

    @pytest.mark.asyncio
    async def test_arun_approval_preserves_custom_string_responses(self):
        """Approval questions allow custom text responses without coercion."""
        tool = UserInputTool()

        for resume_value in [
            "Need more details first",
            "yes",
            "no",
            "Reject",
        ]:
            with (
                patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
                patch(
                    "langcrew_tools.hitl.langchain_tools.interrupt",
                    return_value=resume_value,
                ),
            ):
                result = await tool._arun(
                    question="Proceed?", question_type="approval"
                )
                assert json.loads(result)[0]["answer"] == resume_value

    @pytest.mark.asyncio
    async def test_arun_approval_preserves_value_dict_strings(self):
        """Approval supports value dicts without coercing custom strings."""
        tool = UserInputTool()

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value={"value": "Need changes"},
            ),
        ):
            result = await tool._arun(question="Proceed?", question_type="approval")

            assert json.loads(result)[0]["answer"] == "Need changes"

    @pytest.mark.asyncio
    async def test_arun_multimodal_content(self):
        """Test user input with multimodal (list of dicts) response."""
        tool = UserInputTool()
        mock_response = [
            {"type": "text", "text": "This is a photo of the problem:"},
            {"type": "image_url", "image_url": {"url": "https://example.com/image.png"}},
        ]

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=mock_response,
            ),
        ):
            result = await tool._arun(question="Provide an image:")
            assert result == mock_response

    @pytest.mark.asyncio
    async def test_arun_single_select_question(self):
        """Test explicit single-select user input request."""
        tool = UserInputTool()
        options = ["Fast", "Balanced", "Accurate"]

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="Custom",
            ) as mock_interrupt,
        ):
            result = await tool._arun(
                question="Which mode?",
                question_type="single_select",
                options=options,
            )

            interrupt_data = mock_interrupt.call_args[0][0]
            entry = interrupt_data["questions"][0]
            assert entry["question_type"] == "single_select"
            assert entry["options"] == options
            # The user typed a custom answer ("Custom") in the chat composer
            # rather than clicking one of the option buttons. single_select
            # must transparently return that string.
            assert "allow_custom_answer" not in entry
            assert json.loads(result)[0]["answer"] == "Custom"

    @pytest.mark.asyncio
    async def test_arun_multi_select_question(self):
        """Test multi-select user input request."""
        tool = UserInputTool()
        options = ["A", "B", "C"]

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=["A", "C"],
            ) as mock_interrupt,
        ):
            result = await tool._arun(
                question="Pick values:",
                question_type="multi_select",
                options=options,
            )

            interrupt_data = mock_interrupt.call_args[0][0]
            entry = interrupt_data["questions"][0]
            assert entry["question_type"] == "multi_select"
            assert entry["options"] == options
            # Multi-select responses are emitted as JSON so that downstream
            # prompts can parse them deterministically.
            assert json.loads(result)[0]["answer"] == '["A", "C"]'

    @pytest.mark.asyncio
    async def test_arun_multi_select_preserves_custom_string(self):
        """Multi-select questions still allow custom chat-composer text."""
        tool = UserInputTool()
        options = ["A", "B", "C"]

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="Something else",
            ),
        ):
            result = await tool._arun(
                question="Pick values:",
                question_type="multi_select",
                options=options,
            )

            assert json.loads(result)[0]["answer"] == "Something else"

    @pytest.mark.asyncio
    async def test_dynamic_form_user_input_preserves_approval_custom_string(self):
        """DynamicFormUserInputTool shares approval custom-response semantics."""
        tool = DynamicFormUserInputTool()

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="Use a smaller rollout",
            ),
        ):
            result = await tool._arun(
                question="Approve this?",
                question_type="approval",
                options=["Approve", "Reject"],
            )

            assert result == "Use a smaller rollout"

    @pytest.mark.asyncio
    async def test_arun_options_json_string(self):
        """Test options JSON strings are parsed before building payload."""
        tool = UserInputTool()

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="A",
            ) as mock_interrupt,
        ):
            result = await tool._arun(question="Pick one:", options='["A", "B"]')

            interrupt_data = mock_interrupt.call_args[0][0]
            entry = interrupt_data["questions"][0]
            assert entry["question_type"] == "single_select"
            assert entry["options"] == ["A", "B"]
            assert json.loads(result)[0]["answer"] == "A"

    @pytest.mark.asyncio
    async def test_arun_form_schema_json_string(self):
        """Test form_schema JSON strings are parsed before building payload."""
        tool = UserInputTool()
        form_schema = {
            "properties": {
                "name": {
                    "type": "string",
                    "title": "Name",
                    "required": True,
                }
            },
            "required": ["name"],
            "title": "User Info",
        }

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value='{"name": "Ada"}',
            ) as mock_interrupt,
        ):
            result = await tool._arun(
                question="Please fill this in",
                form_schema=json.dumps(form_schema),
            )

            interrupt_data = mock_interrupt.call_args[0][0]
            entry = interrupt_data["questions"][0]
            assert entry["question_type"] == "text"
            assert entry["form_schema"]["title"] == "User Info"
            assert entry["form_schema"]["properties"]["name"]["title"] == "Name"
            assert json.loads(result)[0]["answer"] == '{"name": "Ada"}'

    @pytest.mark.asyncio
    async def test_dynamic_form_arun_form_schema_json_string(self):
        """Test DynamicFormUserInputTool accepts form_schema JSON strings."""
        tool = DynamicFormUserInputTool()
        form_schema = {
            "properties": {
                "email": {
                    "type": "string",
                    "title": "Email",
                    "format": "email",
                }
            },
            "required": ["email"],
            "title": "Contact",
        }

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value='{"email": "ada@example.com"}',
            ) as mock_interrupt,
        ):
            result = await tool._arun(
                question="Please fill this in",
                form_schema=json.dumps(form_schema),
            )

            interrupt_data = mock_interrupt.call_args[0][0]
            assert interrupt_data["type"] == "dynamic_form"
            assert interrupt_data["form_schema"]["title"] == "Contact"
            assert (
                interrupt_data["form_schema"]["properties"]["email"]["format"]
                == "email"
            )
            assert result == '{"email": "ada@example.com"}'

    @pytest.mark.asyncio
    async def test_arun_invalid_question_request(self):
        """Test invalid typed question requests return an error string."""
        tool = UserInputTool()

        result = await tool._arun(question="Pick one:", question_type="multi_select")

        assert result == "multi_select questions require options"

    @pytest.mark.asyncio
    async def test_arun_malformed_options_json_string(self):
        """Test malformed options JSON strings return an error string."""
        tool = UserInputTool()

        result = await tool._arun(question="Pick one:", options='["A",')

        assert "Failed to parse options string as JSON" in result

    @pytest.mark.asyncio
    async def test_arun_malformed_form_schema_json_string(self):
        """Test malformed form_schema JSON strings return an error string."""
        tool = UserInputTool()

        result = await tool._arun(
            question="Fill this in:", form_schema='{"properties":'
        )

        assert "Failed to parse form_schema string as JSON" in result

    @pytest.mark.asyncio
    async def test_arun_event_dispatch_failure(self):
        """Test that event dispatch failures don't affect core functionality."""
        tool = UserInputTool()

        mock_user_response = "Response despite event failure"

        with (
            patch(
                "langcrew_tools.hitl.langchain_tools.adispatch_custom_event",
                side_effect=Exception("Event dispatch failed"),
            ) as mock_event,
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=mock_user_response,
            ) as mock_interrupt,
        ):
            # Should not raise exception despite event dispatch failure
            result = await tool._arun(question="Test question?")

            # Core functionality should still work
            mock_interrupt.assert_called_once()
            assert json.loads(result)[0]["answer"] == mock_user_response

            # Events should have been attempted
            assert mock_event.call_count == 2

    @pytest.mark.asyncio
    async def test_arun_user_response_conversion(self):
        """Test that user response is properly converted to a string payload.

        Non-list/dict responses fall back to `str(response)`. Lists are
        JSON-encoded so downstream prompts can parse them deterministically.
        """
        tool = UserInputTool()

        # (response, expected_answer)
        test_cases = [
            (42, "42"),
            (True, "True"),
            (["list"], '["list"]'),
            ({"key": "value"}, "{'key': 'value'}"),
        ]

        for mock_response, expected in test_cases:
            with (
                patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
                patch(
                    "langcrew_tools.hitl.langchain_tools.interrupt",
                    return_value=mock_response,
                ),
            ):
                result = await tool._arun(question="Test?")
                assert json.loads(result)[0]["answer"] == expected

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
            patch(
                "langcrew_tools.hitl.langchain_tools.adispatch_custom_event"
            ) as mock_event,
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=mock_user_response,
            ) as mock_interrupt,
        ):
            result = await tool._arun(question="Question?", options=[])

            # Empty options should still be included in interrupt data
            interrupt_data = mock_interrupt.call_args[0][0]
            entry = interrupt_data["questions"][0]
            assert entry["question_type"] == "text"
            assert entry["options"] == []

            # Empty options should be included in event
            first_call = mock_event.call_args_list[0]
            assert first_call[0][1]["questions"][0]["options"] == []

            assert json.loads(result)[0]["answer"] == mock_user_response

    @pytest.mark.asyncio
    async def test_arun_none_response_handling(self):
        """Test handling of None response from interrupt."""
        tool = UserInputTool()

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch("langcrew_tools.hitl.langchain_tools.interrupt", return_value=None),
        ):
            result = await tool._arun(question="Question?")

            # None should be converted to "None" string
            assert json.loads(result)[0]["answer"] == "None"

    @pytest.mark.asyncio
    async def test_arun_with_brief_parameter(self):
        """Test that _arun method accepts brief parameter through kwargs."""
        tool = UserInputTool()

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="test response",
            ),
        ):
            # Test that _arun accepts brief parameter without raising exception
            result = await tool._arun(question="Test question?", brief="获取用户输入")
            # If no exception is raised, the **kwargs mechanism works correctly
            assert json.loads(result)[0]["answer"] == "test response"

    def test_input_model_has_brief_field(self):
        """Test that UserInputRequest has inherited brief field from BaseToolInput."""
        input_model = UserInputRequest(question="Test question?")

        # Should have brief field with default value
        assert hasattr(input_model, "brief")
        assert input_model.brief == ""

        # Should be able to set brief field
        input_with_brief = UserInputRequest(question="Test question?", brief="询问用户")
        assert input_with_brief.brief == "询问用户"


class TestUserInputToolBatch:
    """Test batched (multi-question) user_input behavior."""

    @pytest.mark.asyncio
    async def test_arun_batch_questions(self):
        """A batch produces ONE interrupt with stable per-question ids."""
        tool = UserInputTool()
        resume = json.dumps(
            [
                {"question_id": "q_0", "response": "周三下午"},
                {"question_id": "q_1", "response": "需要"},
            ]
        )

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=resume,
            ) as mock_interrupt,
        ):
            result = await tool._arun(
                questions=[
                    {"question": "哪天的会议？"},
                    {
                        "question": "需要视频设备吗？",
                        "question_type": "single_select",
                        "options": ["需要", "不需要"],
                    },
                ]
            )

        mock_interrupt.assert_called_once()
        interrupt_data = mock_interrupt.call_args[0][0]
        assert interrupt_data["type"] == "user_input"
        # Unified payload: no legacy top-level question fields
        assert "question" not in interrupt_data
        assert "question_type" not in interrupt_data
        q0, q1 = interrupt_data["questions"]
        assert q0 == {
            "question_id": "q_0",
            "question": "哪天的会议？",
            "question_type": "text",
        }
        assert q1["question_id"] == "q_1"
        assert q1["question"] == "需要视频设备吗？"
        assert q1["question_type"] == "single_select"
        assert q1["options"] == ["需要", "不需要"]

        assert json.loads(result) == [
            {"question_id": "q_0", "question": "哪天的会议？", "answer": "周三下午"},
            {"question_id": "q_1", "question": "需要视频设备吗？", "answer": "需要"},
        ]

    @pytest.mark.asyncio
    async def test_arun_batch_formats_each_response_by_type(self):
        """Each answer is formatted with its own question_type rules."""
        tool = UserInputTool()
        resume = json.dumps(
            [
                {"question_id": "q_0", "response": "A"},
                {"question_id": "q_1", "response": ["A", "C"]},
            ]
        )

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=resume,
            ),
        ):
            result = await tool._arun(
                questions=[
                    {
                        "question": "Pick one:",
                        "question_type": "single_select",
                        "options": ["A", "B"],
                    },
                    {
                        "question": "Pick many:",
                        "question_type": "multi_select",
                        "options": ["A", "B", "C"],
                    },
                ]
            )

        answered = json.loads(result)
        assert answered[0]["answer"] == "A"
        # multi_select lists are JSON-encoded deterministically
        assert answered[1]["answer"] == '["A", "C"]'

    @pytest.mark.asyncio
    async def test_arun_single_question_accepts_list_form_resume(self):
        """A one-element batch accepts the unified list-form resume."""
        tool = UserInputTool()
        resume = json.dumps([{"question_id": "q_0", "response": "x"}])

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=resume,
            ),
        ):
            result = await tool._arun(questions=[{"question": "Q?"}])

        assert json.loads(result) == [
            {"question_id": "q_0", "question": "Q?", "answer": "x"}
        ]

    @pytest.mark.asyncio
    async def test_arun_batch_relays_bare_string_resume(self):
        """Bare text reaches the model unchanged for multi-question batches."""
        tool = UserInputTool()

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value="plain answer",
            ),
        ):
            result = await tool._arun(
                questions=[{"question": "Q1?"}, {"question": "Q2?"}]
            )

        assert result == "plain answer"

    @pytest.mark.asyncio
    async def test_arun_batch_relays_incomplete_resume(self):
        """Missing answers are left for the model to interpret."""
        tool = UserInputTool()
        resume = json.dumps([{"question_id": "q_0", "response": "a"}])

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=resume,
            ),
        ):
            result = await tool._arun(
                questions=[{"question": "Q1?"}, {"question": "Q2?"}]
            )

        assert result == resume

    @pytest.mark.asyncio
    async def test_arun_batch_relays_unknown_question_id(self):
        """Unknown ids are forwarded for the model to interpret."""
        tool = UserInputTool()
        resume = json.dumps(
            [
                {"question_id": "q_0", "response": "a"},
                {"question_id": "q_9", "response": "b"},
            ]
        )

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=resume,
            ),
        ):
            result = await tool._arun(
                questions=[{"question": "Q1?"}, {"question": "Q2?"}]
            )

        assert result == resume

    @pytest.mark.asyncio
    async def test_arun_batch_relays_file_context_without_stripping_it(self):
        """Host-app file tips can prefix JSON without losing either part."""
        tool = UserInputTool()
        resume = (
            "## Context\nDocuments provided by the user:\n- report.pdf\n\n"
            "## User Input\n"
            + json.dumps(
                [
                    {"question_id": "q_0", "response": "Tuesday"},
                    {"question_id": "q_1", "response": "Yes"},
                ]
            )
        )

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch("langcrew_tools.hitl.langchain_tools.interrupt", return_value=resume),
        ):
            result = await tool._arun(
                questions=[{"question": "Which day?"}, {"question": "Need video?"}]
            )

        assert result == resume

    @pytest.mark.asyncio
    async def test_arun_batch_relays_multimodal_blocks(self):
        """Host-app image blocks remain visible to the model on resume."""
        tool = UserInputTool()
        resume = [
            {"type": "text", "text": '[{"question_id":"q_0","response":"A"}]'},
            {"type": "image", "url": "https://example.com/receipt.png"},
        ]

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch("langcrew_tools.hitl.langchain_tools.interrupt", return_value=resume),
        ):
            result = await tool._arun(
                questions=[{"question": "What is shown?"}, {"question": "Total?"}]
            )

        assert result == resume

    @pytest.mark.asyncio
    async def test_arun_batch_relays_malformed_question_id(self):
        """Malformed ids must not raise while attempting best-effort parsing."""
        tool = UserInputTool()
        resume = '[{"question_id":[],"response":"A"},{"question_id":"q_1","response":"B"}]'

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch("langcrew_tools.hitl.langchain_tools.interrupt", return_value=resume),
        ):
            result = await tool._arun(
                questions=[{"question": "Q1?"}, {"question": "Q2?"}]
            )

        assert result == resume

    @pytest.mark.asyncio
    async def test_question_ids_stable_across_replays(self):
        """question_id determinism: node replays regenerate identical payloads."""
        tool = UserInputTool()
        questions = [{"question": "Q1?"}, {"question": "Q2?"}]
        resume = json.dumps(
            [
                {"question_id": "q_0", "response": "a"},
                {"question_id": "q_1", "response": "b"},
            ]
        )
        seen_ids = []

        for _ in range(2):
            with (
                patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
                patch(
                    "langcrew_tools.hitl.langchain_tools.interrupt",
                    return_value=resume,
                ) as mock_interrupt,
            ):
                await tool._arun(questions=questions)

            payload = mock_interrupt.call_args[0][0]
            seen_ids.append([q["question_id"] for q in payload["questions"]])

        assert seen_ids[0] == seen_ids[1] == ["q_0", "q_1"]

    @pytest.mark.asyncio
    async def test_arun_questions_json_string_input(self):
        """Weak-model compat: questions may arrive as a JSON-encoded string."""
        tool = UserInputTool()
        resume = json.dumps(
            [
                {"question_id": "q_0", "response": "a"},
                {"question_id": "q_1", "response": "b"},
            ]
        )

        with (
            patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"),
            patch(
                "langcrew_tools.hitl.langchain_tools.interrupt",
                return_value=resume,
            ) as mock_interrupt,
        ):
            result = await tool._arun(
                questions=json.dumps([{"question": "Q1?"}, {"question": "Q2?"}])
            )

        payload = mock_interrupt.call_args[0][0]
        assert [q["question"] for q in payload["questions"]] == ["Q1?", "Q2?"]
        assert [json.loads(result)[i]["answer"] for i in range(2)] == ["a", "b"]

    @pytest.mark.asyncio
    async def test_arun_empty_questions_returns_error_string(self):
        """Empty batches return an error string instead of interrupting."""
        tool = UserInputTool()

        with patch("langcrew_tools.hitl.langchain_tools.adispatch_custom_event"):
            result = await tool._arun(questions=[])

        assert result == "questions must contain at least one question"
