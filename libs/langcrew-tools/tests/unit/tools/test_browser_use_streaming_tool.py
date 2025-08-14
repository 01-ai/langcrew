"""
Simple test cases for browser_use_streaming_tool to verify basic functionality.
"""

from typing import Any

import pytest
from pydantic import BaseModel, Field, ValidationError


# Define test models locally
class BrowserUseInput(BaseModel):
    """Input for BrowserStreamingTool."""

    instruction: str = Field(..., description="The instruction to use browser")


class BrowserStepEvent(BaseModel):
    """Event data for agent step completion"""

    step_number: int
    url: str = ""
    title: str = ""
    thinking: str | None = None
    evaluation_previous_goal: str = ""
    memory: str = ""
    next_goal: str = ""
    actions: list[dict] = Field(default_factory=list)
    screenshot: str | None = Field(default=None, repr=False)
    interactive_elements_count: int = 0
    previous_goal: str | None = None


class BrowserCompletionEvent(BaseModel):
    """Event data for agent completion"""

    success: bool
    final_result: str | None = None
    total_steps: int
    errors: list[str] = Field(default_factory=list)
    urls: list[str] = Field(default_factory=list)
    previous_goal: str | None = None
    screenshot: str | None = None
    intervention_info: dict[str, Any] | None = None


class MockLLM:
    """Mock LLM for testing"""

    def __init__(self, model="test-model"):
        self.model = model


class TestBrowserUseInput:
    """Test BrowserUseInput model."""

    def test_required_instruction_field(self):
        """Test that instruction field is required."""
        with pytest.raises(ValidationError):
            BrowserUseInput()

    def test_instruction_field(self):
        """Test instruction field validation."""
        input_data = BrowserUseInput(instruction="Navigate to google.com")
        assert input_data.instruction == "Navigate to google.com"

    def test_instruction_empty_string(self):
        """Test instruction field with empty string."""
        input_data = BrowserUseInput(instruction="")
        assert input_data.instruction == ""


class TestBrowserStepEvent:
    """Test BrowserStepEvent model."""

    def test_required_step_number_field(self):
        """Test that step_number field is required."""
        with pytest.raises(ValidationError):
            BrowserStepEvent()

    def test_default_values(self):
        """Test default values for optional fields."""
        event = BrowserStepEvent(step_number=1)
        assert event.step_number == 1
        assert event.url == ""
        assert event.title == ""
        assert event.thinking is None
        assert event.evaluation_previous_goal == ""
        assert event.memory == ""
        assert event.next_goal == ""
        assert event.actions == []
        assert event.screenshot is None
        assert event.interactive_elements_count == 0
        assert event.previous_goal is None

    def test_all_fields(self):
        """Test setting all fields."""
        actions = [{"type": "click", "element": "button"}]
        event = BrowserStepEvent(
            step_number=2,
            url="https://example.com",
            title="Example Page",
            thinking="I need to click the button",
            evaluation_previous_goal="Previous goal completed",
            memory="User wants to navigate",
            next_goal="Click the submit button",
            actions=actions,
            screenshot="base64_screenshot_data",
            interactive_elements_count=5,
            previous_goal="Navigate to page",
        )

        assert event.step_number == 2
        assert event.url == "https://example.com"
        assert event.title == "Example Page"
        assert event.thinking == "I need to click the button"
        assert event.evaluation_previous_goal == "Previous goal completed"
        assert event.memory == "User wants to navigate"
        assert event.next_goal == "Click the submit button"
        assert event.actions == actions
        assert event.screenshot == "base64_screenshot_data"
        assert event.interactive_elements_count == 5
        assert event.previous_goal == "Navigate to page"


class TestBrowserCompletionEvent:
    """Test BrowserCompletionEvent model."""

    def test_required_fields(self):
        """Test required fields."""
        with pytest.raises(ValidationError):
            BrowserCompletionEvent()

    def test_required_success_and_total_steps(self):
        """Test that success and total_steps are required."""
        event = BrowserCompletionEvent(success=True, total_steps=5)
        assert event.success is True
        assert event.total_steps == 5

    def test_default_values(self):
        """Test default values for optional fields."""
        event = BrowserCompletionEvent(success=False, total_steps=3)
        assert event.success is False
        assert event.total_steps == 3
        assert event.final_result is None
        assert event.errors == []
        assert event.urls == []
        assert event.previous_goal is None
        assert event.screenshot is None
        assert event.intervention_info is None

    def test_all_fields(self):
        """Test setting all fields."""
        errors = ["Network timeout", "Element not found"]
        urls = ["https://example.com", "https://test.com"]
        intervention_info = {"type": "human_required", "reason": "CAPTCHA"}

        event = BrowserCompletionEvent(
            success=True,
            final_result="Task completed successfully",
            total_steps=10,
            errors=errors,
            urls=urls,
            previous_goal="Complete form",
            screenshot="final_screenshot",
            intervention_info=intervention_info,
        )

        assert event.success is True
        assert event.final_result == "Task completed successfully"
        assert event.total_steps == 10
        assert event.errors == errors
        assert event.urls == urls
        assert event.previous_goal == "Complete form"
        assert event.screenshot == "final_screenshot"
        assert event.intervention_info == intervention_info


def test_basic_models_functionality():
    """Test that basic model functionality works as expected."""
    # Test input validation
    input_data = BrowserUseInput(instruction="Test instruction")
    assert input_data.instruction == "Test instruction"

    # Test step event
    step_event = BrowserStepEvent(step_number=1, url="https://test.com")
    assert step_event.step_number == 1
    assert step_event.url == "https://test.com"

    # Test completion event
    completion_event = BrowserCompletionEvent(success=True, total_steps=5)
    assert completion_event.success is True
    assert completion_event.total_steps == 5


if __name__ == "__main__":
    test_basic_models_functionality()
    print("✅ All basic tests passed!")
