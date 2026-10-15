# HITL Tools for LangChain - Independent and reusable HITL tools
# These tools can be used independently, without depending on HITLConfig

import json
import logging
from typing import Any, ClassVar, Literal

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.tools import BaseTool
from langgraph.types import interrupt
from pydantic import (
    BaseModel,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)

from ..base import BaseToolInput

logger = logging.getLogger(__name__)

QuestionType = Literal["text", "single_select", "multi_select", "approval"]
VALID_QUESTION_TYPES = {"text", "single_select", "multi_select", "approval"}


class FormFieldSchema(BaseModel):
    """JSON Schema field definition for dynamic forms"""

    type: str = Field(
        ...,
        description=(
            "Field type. Allowed: string, number, boolean, array, object, multiselect. "
            'For multi-select use type "multiselect" with an "enum" list (do NOT use '
            'type "string" with any multiselect flag).'
        ),
    )
    title: str = Field(..., description="Field display title")
    description: str | None = Field(None, description="Field description/help text")
    enum: list[str] | None = Field(None, description="Enum options for select fields")
    required: bool = Field(False, description="Whether this field is required")
    format: str | None = Field(
        None, description="Format hint: email, url, date, date-time, phone, color, time"
    )
    pattern: str | None = Field(
        None,
        description="Regular expression pattern for validation (e.g., for phone numbers)",
    )
    minLength: int | None = Field(None, description="Minimum length for string fields")
    maxLength: int | None = Field(None, description="Maximum length for string fields")
    minimum: float | None = Field(None, description="Minimum value for number fields")
    maximum: float | None = Field(None, description="Maximum value for number fields")
    default: Any | None = Field(None, description="Default value for the field")
    minSelections: int | None = Field(
        None,
        description='Minimum number of selections required. Only used when type is "multiselect".',
    )
    maxSelections: int | None = Field(
        None,
        description='Maximum number of selections allowed. Only used when type is "multiselect".',
    )


class FormSchema(BaseModel):
    """Complete form schema definition"""

    type: str = Field(
        default="object", description="Schema type, always 'object' for forms"
    )
    # BUGFIX: Add language context hint to ensure field keys match user's language environment
    # Without this hint, LLM may always use English field names (e.g., "name", "email")
    # even in non-English contexts. This guide helps LLM use localized field names.
    properties: dict[str, FormFieldSchema] = Field(
        ...,
        description="Form field definitions. Field keys (names) should follow the language context from system prompt (e.g., use '姓名' for Chinese, 'nombre' for Spanish, 'name' for English).",
    )
    required: list[str] = Field(default=[], description="List of required field names")
    title: str | None = Field(None, description="Form title")
    description: str | None = Field(None, description="Form description")


class UserInputQuestion(BaseModel):
    """One question inside a UserInputTool batch."""

    question: str = Field(..., description="The question to ask the user")
    question_type: QuestionType = Field(
        default="text",
        description=(
            "Type of question to ask. 'text' asks an open-ended free-form "
            "question. 'single_select' shows the provided options as quick-pick "
            "buttons; the user can click one button OR type their own custom "
            "answer in the chat composer, so the tool may return any string. "
            "'multi_select' lets the user pick one or more of the provided "
            "options. 'approval' asks for an approve/reject decision while "
            "still allowing a custom text response; approval button clicks "
            "return the selected button label as a string, and custom text "
            "returns as a string. For back-compat, "
            "passing options without an explicit question_type is treated as "
            "'single_select'."
        ),
    )
    # Support str type for compatibility: Some weaker models may return a JSON string (e.g., '["Yes", "No"]')
    # instead of a proper list. The runtime normalization in `_normalize_questions`
    # will attempt to parse the string into a list.
    options: list[str] | str | None = Field(
        None,
        description=(
            "Optional list of predefined options (max 4, each option max 10 "
            "characters or 5 Chinese characters, keep them short and clear). "
            "Required for single_select and multi_select questions. For approval "
            "questions provide either no options (defaults to Approve/Reject) or "
            "exactly 2 options; approval controls use the FIRST option as the "
            "approve action and the SECOND as reject when users click buttons."
        ),
    )
    form_schema: FormSchema | None = Field(
        None,
        description=(
            "JSON Schema object for dynamic form generation. Pass this as a JSON "
            "object, not as a JSON-encoded string. Use this instead of options "
            "for complex forms."
        ),
    )

    @field_validator("options")
    @classmethod
    def validate_options(cls, value: list[str] | str | None) -> list[str] | str | None:
        if isinstance(value, list) and len(value) > 4:
            raise ValueError("options must contain at most 4 items")
        return value

    @field_validator("form_schema", mode="before")
    @classmethod
    def validate_form_schema(cls, value: Any) -> Any:
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError as e:
                raise ValueError(
                    "Failed to parse form_schema string as JSON: "
                    f"{value}. Error: {str(e)}"
                ) from e
        return value

    @model_validator(mode="after")
    def validate_question_shape(self):
        # If options arrived as a JSON string (weak-model compat), defer all
        # shape inference / validation to runtime in `_normalize_questions`,
        # after parsing.
        if isinstance(self.options, str):
            return self

        # Back-compat: a caller that passes options without explicitly setting
        # `question_type` should be treated as single-select. Mutate the model
        # in place so the in-memory request and the wire payload agree.
        if (
            self.form_schema is None
            and self.question_type == "text"
            and self.options
        ):
            self.question_type = "single_select"

        if self.form_schema is not None:
            return self

        if self.question_type in {"single_select", "multi_select"} and not self.options:
            raise ValueError(f"{self.question_type} questions require options")

        if (
            self.question_type == "approval"
            and self.options is not None
            and len(self.options) != 2
        ):
            raise ValueError(
                "approval questions must provide either no options or exactly 2 options"
            )

        return self


class UserInputRequest(BaseToolInput):
    """Input for UserInputTool: all questions asked in one batched call."""

    questions: list[UserInputQuestion] = Field(
        ...,
        description=(
            "All questions to ask the user this turn, collected into ONE call. "
            "Use a single-element array when you only have one question."
        ),
    )

    @field_validator("questions", mode="before")
    @classmethod
    def validate_questions(cls, value: Any) -> Any:
        # Weak-model compat: questions may arrive as a JSON-encoded string.
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as e:
                raise ValueError(
                    "Failed to parse questions string as JSON: "
                    f"{value}. Error: {str(e)}"
                ) from e
        if isinstance(value, list) and not value:
            raise ValueError("questions must contain at least one question")
        return value

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_single_question(cls, values: Any) -> Any:
        """Input-side back-compat: accept legacy single-question fields."""
        if not isinstance(values, dict) or values.get("questions") is not None:
            return values

        legacy = {
            key: values[key]
            for key in ("question", "question_type", "options", "form_schema")
            if key in values
        }
        if not legacy:
            return values

        values = {k: v for k, v in values.items() if k not in legacy}
        values["questions"] = [legacy]
        return values


class DynamicFormUserInputRequest(UserInputQuestion, BaseToolInput):
    """Legacy single-question input for DynamicFormUserInputTool."""


def _parse_options(options: list[str] | str | None) -> list[str] | None:
    """Normalize options from model-friendly JSON strings into lists."""
    if isinstance(options, str):
        try:
            parsed_options = json.loads(options)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Failed to parse options string as JSON: {options}. Error: {str(e)}"
            ) from e

        if not isinstance(parsed_options, list) or not all(
            isinstance(option, str) for option in parsed_options
        ):
            raise ValueError(
                f"Failed to parse options string as a JSON list of strings: {options}"
            )
        options = parsed_options

    if isinstance(options, list) and len(options) > 4:
        raise ValueError("options must contain at most 4 items")

    return options


def _parse_form_schema(
    form_schema: FormSchema | dict[str, Any] | str | None,
) -> FormSchema | None:
    """Normalize form_schema from model-friendly JSON strings into FormSchema."""
    if form_schema is None:
        return None

    if isinstance(form_schema, FormSchema):
        return form_schema

    if isinstance(form_schema, str):
        try:
            form_schema = json.loads(form_schema)
        except json.JSONDecodeError as e:
            raise ValueError(
                "Failed to parse form_schema string as JSON: "
                f"{form_schema}. Error: {str(e)}"
            ) from e

    if isinstance(form_schema, dict):
        try:
            return FormSchema.model_validate(form_schema)
        except ValidationError as e:
            raise ValueError(
                "Failed to parse form_schema as a JSON object: "
                f"{form_schema}. Error: {str(e)}"
            ) from e

    raise ValueError(
        "form_schema must be a JSON object or JSON-encoded object string"
    )


def _resolve_question_type(
    question_type: str, options: list[str] | None, form_schema: FormSchema | None
) -> str:
    """Infer typed questions for legacy option-based calls."""
    if question_type not in VALID_QUESTION_TYPES:
        raise ValueError(
            "question_type must be one of: approval, multi_select, single_select, text"
        )

    if form_schema is None and question_type == "text" and options:
        return "single_select"

    return question_type


def _validate_question_request(
    question_type: str, options: list[str] | None, form_schema: FormSchema | None
) -> None:
    if form_schema is not None:
        return

    if question_type in {"single_select", "multi_select"} and not options:
        raise ValueError(f"{question_type} questions require options")

    if question_type == "approval" and options is not None and len(options) != 2:
        raise ValueError(
            "approval questions must provide either no options or exactly 2 options"
        )


def _normalize_questions(
    questions: Any,
    question: str | None,
    question_type: QuestionType,
    options: list[str] | str | None,
    form_schema: FormSchema | dict[str, Any] | str | None,
) -> list[dict[str, Any]]:
    """Normalize any supported input shape into wire-format question entries.

    Accepts the `questions` batch (list of UserInputQuestion/dict, or a
    JSON-encoded string for weak models) plus the legacy single-question
    fields. Every entry goes through the same runtime parse/validate rules
    and is stamped with a deterministic ``question_id`` (``q_0``, ``q_1``,
    ...) that stays stable across node replays so the client can correlate
    answers.
    """
    if questions is None:
        questions = [
            {
                "question": question,
                "question_type": question_type,
                "options": options,
                "form_schema": form_schema,
            }
        ]
    elif isinstance(questions, str):
        try:
            questions = json.loads(questions)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Failed to parse questions string as JSON: {questions}. "
                f"Error: {str(e)}"
            ) from e

    if not isinstance(questions, list) or not questions:
        raise ValueError("questions must contain at least one question")

    entries: list[dict[str, Any]] = []
    for index, item in enumerate(questions):
        if isinstance(item, UserInputQuestion):
            entry = item.model_dump()
        elif isinstance(item, dict):
            entry = dict(item)
        else:
            raise ValueError(
                f"questions[{index}] must be an object, got: {type(item).__name__}"
            )

        if not entry.get("question"):
            raise ValueError(f"questions[{index}] requires non-empty question text")

        parsed_options = _parse_options(entry.get("options"))
        parsed_form_schema = _parse_form_schema(entry.get("form_schema"))
        resolved_question_type = _resolve_question_type(
            entry.get("question_type", "text"), parsed_options, parsed_form_schema
        )
        _validate_question_request(
            resolved_question_type, parsed_options, parsed_form_schema
        )

        normalized: dict[str, Any] = {
            "question_id": f"q_{index}",
            "question": entry["question"],
            "question_type": resolved_question_type,
        }
        if parsed_options is not None:
            normalized["options"] = parsed_options
        if parsed_form_schema is not None:
            normalized["form_schema"] = parsed_form_schema.model_dump()
        entries.append(normalized)

    return entries


def _parse_user_responses(
    user_response: Any, entries: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """Extract complete per-question answers, or defer to model interpretation.

    A clean JSON list is reorganized by question_id. Other resume values may
    contain file context or multimodal blocks added by the host application;
    return None so the raw value can reach the model without being discarded.
    Bare single-question answers retain the legacy type-specific formatting.
    """
    expected_ids = [entry["question_id"] for entry in entries]

    candidate = user_response
    if isinstance(user_response, str):
        try:
            candidate = json.loads(user_response)
        except json.JSONDecodeError:
            candidate = user_response

    if (
        isinstance(candidate, list)
        and len(candidate) == len(expected_ids)
        and all(
            isinstance(item, dict)
            and isinstance(item.get("question_id"), str)
            and "response" in item
            for item in candidate
        )
    ):
        answers = {item["question_id"]: item["response"] for item in candidate}
        if len(answers) == len(candidate) and set(answers) == set(expected_ids):
            return answers

    if len(expected_ids) == 1:
        # Preserve native multimodal ToolMessage content instead of embedding
        # image blocks in the JSON answer as plain text.
        if isinstance(user_response, list) and all(
            isinstance(item, dict) for item in user_response
        ):
            return None
        return {expected_ids[0]: user_response}

    return None


def _format_approval_response(response: Any) -> str | list[dict]:
    """Preserve custom approval responses as strings."""
    if isinstance(response, dict):
        if "value" in response:
            return _format_approval_response(response["value"])

    return _format_user_response(response, "text", None)


def _format_user_response(
    response: Any, question_type: str, options: list[str] | None
) -> str | list[dict]:
    if question_type == "approval":
        return _format_approval_response(response)

    # If the response is a list of dicts representing multimodal content,
    # return it directly so ToolMessage can support it.
    if isinstance(response, list) and all(isinstance(item, dict) for item in response):
        return response

    # Multi-select responses are typically a list of strings; emit JSON so downstream
    # prompts can parse them deterministically.
    if isinstance(response, list):
        try:
            return json.dumps(response, ensure_ascii=False)
        except (TypeError, ValueError):
            return str(response)

    return str(response)


class UserInputTool(BaseTool):
    """User Input Tool - Based on LangGraph official pattern

    Allows LLM to actively decide when user input is needed, this is the standard
    pattern recommended by LangGraph.
    Reference: https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/add-human-in-the-loop/

    This tool is independent of HITLConfig, users can flexibly choose whether to use it.
    """

    name: ClassVar[str] = "user_input"
    args_schema: type[BaseModel] = UserInputRequest
    description: ClassVar[str] = (
        "Request input from the human when you need clarification, additional "
        "information, or confirmation. Ask ALL of your questions in ONE call "
        "via the `questions` array (a single question is a one-element array); "
        "NEVER call this tool more than once in the same turn. Each question "
        "supports text, single_select, multi_select, and approval question "
        "types. Text questions collect free-form answers. Single-select questions "
        "show the provided options as quick-pick buttons; the user can click "
        "one of them OR type any other answer in the chat composer, so the "
        "returned string is not guaranteed to match one of the options. "
        "Multi-select questions let the user pick one or more of the provided "
        "options. Approval questions collect an approve/reject decision while "
        "still allowing custom text replies; approval button clicks return the "
        "clicked button label as a string, while custom text replies "
        "return as strings. When you provide custom approval labels the first "
        "label must be the approve action and the second must be the reject "
        "action. Provide up to 4 options, each less than 10 characters or 5 "
        "Chinese characters. For form_schema, pass a JSON object, not a "
        "JSON-encoded string. Complete structured replies produce a JSON "
        "array of {question_id, question, answer} objects in question order; "
        "non-standard multi-question replies, including file context and "
        "images, are passed through for you to interpret."
    )

    async def _arun(
        self,
        questions: Any = None,
        question: str | None = None,
        question_type: QuestionType = "text",
        options: list[str] | str | None = None,
        form_schema: FormSchema | dict[str, Any] | str | None = None,
        **kwargs,
    ) -> str | list[dict]:
        """Request user input asynchronously using LangGraph interrupt."""

        try:
            entries = _normalize_questions(
                questions, question, question_type, options, form_schema
            )
        except ValueError as e:
            error_msg = str(e)
            logger.error(error_msg)
            return error_msg

        interrupt_data = {"type": "user_input", "questions": entries}

        # Send event to frontend (optional, failure doesn't affect core functionality)
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_required",
                interrupt_data,
                config=None,  # Hard to get config in tool, event sending is optional
            )
        except Exception:
            pass  # Event sending failure doesn't affect core functionality

        # Use LangGraph native interrupt (core functionality)
        user_response = interrupt(interrupt_data)

        # Send completion event (optional)
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_completed",
                {"response": user_response},
                config=None,
            )
        except Exception:
            pass

        answers = _parse_user_responses(user_response, entries)
        if answers is None:
            logger.info("Relaying non-standard user_input resume value to model")
            return _format_user_response(user_response, "text", None)

        return json.dumps(
            [
                {
                    "question_id": entry["question_id"],
                    "question": entry["question"],
                    "answer": _format_user_response(
                        answers[entry["question_id"]],
                        entry["question_type"],
                        entry.get("options"),
                    ),
                }
                for entry in entries
            ],
            ensure_ascii=False,
        )

    def _run(
        self,
        questions: Any = None,
        question: str | None = None,
        question_type: QuestionType = "text",
        options: list[str] | str | None = None,
        form_schema: FormSchema | dict[str, Any] | str | None = None,
        **kwargs,
    ) -> str | list[dict]:
        """Request user input synchronously.

        Calls the async version for consistency.
        """
        import asyncio

        # Use asyncio to run the async version
        return asyncio.run(
            self._arun(
                questions=questions,
                question=question,
                question_type=question_type,
                options=options,
                form_schema=form_schema,
                **kwargs,
            )
        )


class DynamicFormUserInputTool(BaseTool):
    """Enhanced User Input Tool with JSON Schema support for dynamic forms"""

    name: ClassVar[str] = "dynamic_form_user_input"
    args_schema: type[BaseModel] = DynamicFormUserInputRequest
    description: ClassVar[str] = (
        "Request input from the human using either simple options or a dynamic form. "
        "Use 'options' for simple choices, or 'form_schema' for complex forms "
        "with multiple fields. The form_schema should be passed as a JSON "
        "object, not as a JSON-encoded string, and should follow JSON Schema "
        "format with field definitions including type, title, description, etc. "
        "Supports phone number fields with 'format': 'phone' and optional "
        "'pattern' for custom validation. "
        "Supports color picker fields with 'format': 'color' for color selection. "
        "Supports time picker fields with 'format': 'time' for time selection. "
        'For multi-select fields, set type to "multiselect" with an "enum" list '
        '(do NOT use type "string" with any multiselect flag). '
        'Optionally use "minSelections"/"maxSelections" to limit count. '
        "IMPORTANT: Field titles should NOT contain asterisks (*) - the "
        "required status is determined by the 'required' property, not the title."
    )

    async def _arun(
        self,
        question: str,
        question_type: QuestionType = "text",
        options: list[str] | str | None = None,
        form_schema: FormSchema | dict[str, Any] | str | None = None,
        **kwargs,
    ) -> str | list[dict]:
        """Request user input with dynamic form support."""

        try:
            parsed_options = _parse_options(options)
            parsed_form_schema = _parse_form_schema(form_schema)
            resolved_question_type = _resolve_question_type(
                question_type, parsed_options, parsed_form_schema
            )
            _validate_question_request(
                resolved_question_type, parsed_options, parsed_form_schema
            )
        except ValueError as e:
            error_msg = str(e)
            logger.error(error_msg)
            return error_msg

        # Build interrupt data
        interrupt_data = {
            "type": "dynamic_form" if parsed_form_schema else "user_input",
            "question_type": resolved_question_type,
            "question": question,
        }

        # Add options if provided (simple mode)
        if parsed_options is not None:
            interrupt_data["options"] = parsed_options

        # Add form schema if provided (dynamic form mode)
        if parsed_form_schema is not None:
            interrupt_data["form_schema"] = parsed_form_schema.model_dump()

        # Send event to frontend - this will create the first message
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_required",
                interrupt_data,
                config=None,
            )
        except Exception:
            pass

        # Use LangGraph native interrupt - this might create the second message
        user_response = interrupt(interrupt_data)

        # Send completion event
        try:
            await adispatch_custom_event(
                "on_langcrew_user_input_completed",
                {"response": user_response},
                config=None,
            )
        except Exception:
            pass

        return _format_user_response(
            user_response, resolved_question_type, parsed_options
        )

    def _run(
        self,
        question: str,
        question_type: QuestionType = "text",
        options: list[str] | str | None = None,
        form_schema: FormSchema | dict[str, Any] | str | None = None,
        **kwargs,
    ) -> str | list[dict]:
        """Request user input synchronously with dynamic form support."""
        import asyncio

        # Use asyncio to run the async version
        return asyncio.run(
            self._arun(
                question=question,
                question_type=question_type,
                options=options,
                form_schema=form_schema,
                **kwargs,
            )
        )
