"""
Unit tests for core types in the types module.

Tests cover RunningSummary and ExecutionPlan classes to ensure proper
functionality after migration to types.py.
"""

from langcrew.types import CrewState, ExecutionPlan


class TestExecutionPlan:
    """Test cases for ExecutionPlan dataclass."""

    def test_execution_plan_initialization_defaults(self):
        """Test ExecutionPlan initialization with default values."""
        plan = ExecutionPlan()

        assert plan.steps == []
        assert plan.overview == ""
        assert plan.current_step == 0
        assert plan.completed_steps == []

    def test_execution_plan_initialization_with_data(self):
        """Test ExecutionPlan initialization with custom data."""
        steps = ["Step 1: First step"]
        overview = "Custom plan"

        plan = ExecutionPlan(
            steps=steps,
            overview=overview,
            current_step=1,
            completed_steps=[0],
        )

        assert plan.steps == steps
        assert plan.overview == overview
        assert plan.current_step == 1
        assert plan.completed_steps == [0]

    def test_initialize_method_basic(self):
        """Test ExecutionPlan.initialize method with basic input."""
        plan = ExecutionPlan()
        test_plan = [
            "Analysis: Analyze input",
            "Processing: Process results",
        ]

        plan.initialize(test_plan, "Test Plan Overview")

        assert plan.steps == test_plan
        assert plan.overview == "Test Plan Overview"
        assert plan.current_step == 0
        assert plan.completed_steps == []

    def test_initialize_method_without_overview(self):
        """Test ExecutionPlan.initialize without explicit overview."""
        plan = ExecutionPlan()
        test_plan = ["Step 1", "Step 2"]

        plan.initialize(test_plan)

        assert plan.steps == test_plan
        assert plan.overview == "Execution plan with 2 steps"
        assert plan.current_step == 0

    def test_initialize_method_resets_state(self):
        """Test that initialize resets existing state."""
        plan = ExecutionPlan(current_step=5, completed_steps=[1, 2, 3])

        new_plan = ["New Step"]
        plan.initialize(new_plan, "New Plan")

        assert plan.steps == new_plan
        assert plan.current_step == 0
        assert plan.completed_steps == []

    def test_update_progress_basic(self):
        """Test ExecutionPlan.update_progress method."""
        plan = ExecutionPlan()
        plan.initialize(["Step 1", "Step 2"])

        # Update progress
        plan.update_progress()

        assert plan.current_step == 1
        assert plan.completed_steps == [0]

    def test_update_progress_empty_plan(self):
        """Test update_progress with empty plan."""
        plan = ExecutionPlan()
        plan.initialize([])

        # Should not crash or change state
        plan.update_progress()

        assert plan.current_step == 0
        assert plan.completed_steps == []

    def test_update_progress_multiple_steps(self):
        """Test multiple update_progress calls."""
        plan = ExecutionPlan()
        plan.initialize(["Step 1", "Step 2", "Step 3"])

        # Complete step 0
        plan.update_progress()
        assert plan.current_step == 1
        assert plan.completed_steps == [0]

        # Complete step 1
        plan.update_progress()
        assert plan.current_step == 2
        assert plan.completed_steps == [0, 1]

    def test_update_progress_beyond_plan(self):
        """Test update_progress when already completed all steps."""
        plan = ExecutionPlan()
        plan.initialize(["Step 1"])

        # Complete the only step
        plan.update_progress()
        assert plan.current_step == 1
        assert plan.completed_steps == [0]

        # Try to progress beyond plan - should not change state
        plan.update_progress()
        assert plan.current_step == 1
        assert plan.completed_steps == [0]

    def test_initialize_empty_plan(self):
        """Test initialize with empty plan."""
        plan = ExecutionPlan()
        plan.initialize([], "Empty Plan")

        assert plan.steps == []
        assert plan.overview == "Empty Plan"
        assert plan.current_step == 0
        assert plan.completed_steps == []

    def test_initialize_empty_plan_no_overview(self):
        """Test initialize with empty plan and no overview."""
        plan = ExecutionPlan()
        plan.initialize([])

        assert plan.steps == []
        assert plan.overview == "Execution plan with 0 steps"
        assert plan.current_step == 0
        assert plan.completed_steps == []

    def test_build_context_prompt_empty_plan(self):
        """Test build_context_prompt with empty plan."""
        plan = ExecutionPlan()
        plan.initialize([])

        context = plan.build_context_prompt()
        assert context == ""

    def test_build_context_prompt_single_task(self):
        """Test build_context_prompt with single task."""
        plan = ExecutionPlan()
        plan.initialize(
            ["Analysis: Analyze the input data"],
            "Single Task Plan",
        )

        context = plan.build_context_prompt()

        assert "<execution_context>" in context
        assert "Single Task Plan" in context
        assert "Step 1 of 1" in context
        assert "Analysis: Analyze the input data" in context
        assert "</execution_context>" in context

    def test_build_context_prompt_with_progress(self):
        """Test build_context_prompt with some completed steps."""
        plan = ExecutionPlan()
        plan.initialize(
            [
                "Step 1: First step",
                "Step 2: Second step",
                "Step 3: Third step",
            ],
            "Multi-step Plan",
        )

        # Complete first step
        plan.update_progress()

        context = plan.build_context_prompt()

        assert "Step 2 of 3" in context
        assert "Step 2: Second step" in context
        assert "Step 1 (✓)" in context
        assert "Next planned step will be: Step 3: Third step" in context

    def test_build_context_prompt_all_completed(self):
        """Test build_context_prompt when all tasks are completed."""
        plan = ExecutionPlan()
        plan.initialize(["Only Task"])

        # Complete the task
        plan.update_progress()

        context = plan.build_context_prompt()

        assert "ALL TASKS COMPLETED" in context
        assert "All planned steps have been successfully executed" in context

    def test_build_context_prompt_final_step(self):
        """Test build_context_prompt on final step."""
        plan = ExecutionPlan()
        plan.initialize(["Step 1", "Step 2"])

        # Move to final step
        plan.update_progress()

        context = plan.build_context_prompt()

        assert "Step 2 of 2" in context
        assert "This is the final step" in context


class TestCrewStateTypeIntegration:
    """Test integration of RunningSummary and ExecutionPlan with CrewState."""

    def test_crew_state_running_summary_assignment(self):
        """Test that CrewState can store running summary string correctly."""
        state = CrewState()
        summary = "Test summary"

        state["running_summary"] = summary

        assert state["running_summary"] is summary
        assert state["running_summary"] == "Test summary"

    def test_crew_state_execution_plan_assignment(self):
        """Test that CrewState can store ExecutionPlan correctly."""
        state = CrewState()
        plan = ExecutionPlan()
        plan.initialize(["Test Task"], "Test Plan")

        state["execution_plan"] = plan

        assert state["execution_plan"] is plan
        assert state["execution_plan"].overview == "Test Plan"
        assert len(state["execution_plan"].steps) == 1

    def test_crew_state_default_values(self):
        """Test CrewState default values for new fields."""
        state = CrewState()

        # Default execution_plan should be an ExecutionPlan instance
        execution_plan = state.get("execution_plan")
        if execution_plan is not None:
            assert hasattr(execution_plan, "steps")
            assert execution_plan.steps == []

        # Default running_summary should be None
        assert state.get("running_summary") is None

    def test_crew_state_type_safety(self):
        """Test type safety with wrong types."""
        state = CrewState()

        # Should be able to assign correct types
        state["running_summary"] = "Test summary"
        state["execution_plan"] = ExecutionPlan()

        # Should also accept None for running_summary
        state["running_summary"] = None
        assert state["running_summary"] is None

    def test_crew_state_full_workflow_simulation(self):
        """Test a complete workflow simulation with both types."""
        state = CrewState()

        # Initialize execution plan
        plan = ExecutionPlan()
        plan.initialize(
            [
                "Analysis: Analyze data",
                "Processing: Process results",
            ],
            "Data Processing Workflow",
        )
        state["execution_plan"] = plan

        # Initialize running summary
        summary = "Started workflow"
        state["running_summary"] = summary

        # Simulate progress
        plan.update_progress()
        state["running_summary"] = "Analysis phase completed"

        # Verify state
        assert state["execution_plan"].current_step == 1
        assert state["execution_plan"].completed_steps == [0]
        assert state["running_summary"] == "Analysis phase completed"


class TestTypesImportCompatibility:
    """Test that types can be imported correctly after migration."""

    def test_import_from_types_module(self):
        """Test importing types directly from types module."""
        from langcrew.types import CrewState, ExecutionPlan

        # Should be able to create instances
        summary = "Test summary"
        plan = ExecutionPlan()
        state = CrewState()

        assert isinstance(summary, str)
        assert isinstance(plan, ExecutionPlan)
        # CrewState is a TypedDict, can't use isinstance - just check it's a dict
        assert isinstance(state, dict)

    def test_simple_string_summary_usage(self):
        """Test using simple string for summary instead of RunningSummary class."""
        from langcrew.types import CrewState

        # Should be able to use strings directly
        state = CrewState()
        state["running_summary"] = "Test summary content"

        # Should work as expected
        assert isinstance(state["running_summary"], str)
        assert state["running_summary"] == "Test summary content"
