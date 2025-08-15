"""
Test setup verification.

This module contains basic tests to verify that the test environment
is properly configured and working.
"""

import os
import sys
from pathlib import Path

import pytest


class TestSetup:
    """Test cases to verify test environment setup."""

    def test_python_version(self):
        """Test that Python version meets requirements."""
        assert sys.version_info >= (3, 11), "Python 3.11+ is required"

    def test_pytest_working(self):
        """Test that pytest is working correctly."""
        assert True, "Pytest is working"

    def test_environment_variables(self):
        """Test that test environment variables are set."""
        assert os.environ.get("LANGCREW_ENV") == "test"
        assert os.environ.get("LANGCHAIN_TRACING_V2") == "false"

    def test_project_structure(self):
        """Test that project structure is correct."""
        project_root = Path(__file__).parent.parent
        src_dir = project_root / "src" / "langcrew"
        tests_dir = project_root / "tests"

        assert src_dir.exists(), "Source directory should exist"
        assert tests_dir.exists(), "Tests directory should exist"
        assert (tests_dir / "unit").exists(), "Unit tests directory should exist"
        assert (tests_dir / "integration").exists(), (
            "Integration tests directory should exist"
        )

    def test_imports(self):
        """Test that basic imports work."""
        try:
            import langcrew

            assert langcrew.__all__
        except ImportError as e:
            pytest.fail(f"Import failed: {e}")

    def test_fixtures_available(self, mock_config, mock_agent, mock_task):
        """Test that fixtures are available and working."""
        assert mock_config is not None
        assert mock_agent is not None
        assert mock_task is not None

        # Test fixture content
        assert "llm" in mock_config
        assert mock_agent.name == "test_agent"
        assert mock_task.description == "Test task description"

    @pytest.mark.asyncio
    async def test_async_support(self):
        """Test that async test support is working."""

        async def dummy_async_function():
            return "async_result"

        result = await dummy_async_function()
        assert result == "async_result"

    def test_temp_directory(self, temp_dir):
        """Test that temporary directory fixture works."""
        assert temp_dir.exists()
        assert temp_dir.is_dir()

        # Create a test file
        test_file = temp_dir / "test.txt"
        test_file.write_text("test content")

        assert test_file.exists()
        assert test_file.read_text() == "test content"

    @pytest.mark.parametrize(
        "test_input,expected",
        [
            ("hello", 5),
            ("world", 5),
            ("", 0),
            ("pytest", 6),
        ],
    )
    def test_parametrized_tests(self, test_input, expected):
        """Test that parametrized tests work."""
        assert len(test_input) == expected

    def test_mock_functionality(self, mock_llm):
        """Test that mock functionality works."""
        assert mock_llm is not None
        assert hasattr(mock_llm, "responses")
        assert len(mock_llm.responses) > 0

    @pytest.mark.unit
    def test_unit_marker(self):
        """Test that unit test marker works."""
        assert True

    @pytest.mark.integration
    def test_integration_marker(self):
        """Test that integration test marker works."""
        assert True

    @pytest.mark.slow
    def test_slow_marker(self):
        """Test that slow test marker works."""
        # This test would be skipped with -m "not slow"
        assert True

    def test_error_handling(self):
        """Test error handling in tests."""
        with pytest.raises(ValueError, match="Test error"):
            raise ValueError("Test error")

    def test_warnings_capture(self):
        """Test that warnings are properly captured."""
        import warnings

        with pytest.warns(UserWarning, match="Test warning"):
            warnings.warn("Test warning", UserWarning)

    def test_configuration_validation(self):
        """Test that test configuration is valid."""
        # Check pytest configuration

        pytest.config if hasattr(pytest, "config") else None

        # Basic validation that pytest is configured
        assert pytest is not None
