"""Unit tests for guardrail module"""

import asyncio
from typing import Any
from unittest.mock import patch

import pytest

from langcrew.guardrail import (
    GuardrailError,
    _check_guardrails_impl,
    check_guardrails,
    check_guardrails_sync,
    input_guard,
    output_guard,
    with_guardrails,
)

# ==================== Test Fixtures ====================


@input_guard
def sample_input_guard(data: Any) -> tuple[bool, str]:
    """Sample input guard for testing"""
    if isinstance(data, dict) and "forbidden" in data:
        return False, "Forbidden key found"
    return True, "Input is valid"


@output_guard
def sample_output_guard(data: Any) -> tuple[bool, str]:
    """Sample output guard for testing"""
    if isinstance(data, str) and len(data) < 5:
        return False, "Output too short"
    return True, "Output is valid"


def undecorated_guard(data: Any) -> tuple[bool, str]:
    """Guard without decorator for testing"""
    if data == "invalid":
        return False, "Invalid data"
    return True, "Valid data"


def failing_guard(data: Any) -> tuple[bool, str]:
    """Guard that always fails"""
    return False, "Always fails"


def exception_guard(data: Any) -> tuple[bool, str]:
    """Guard that raises an exception"""
    raise ValueError("Test exception")


# ==================== Test Decorators ====================


class TestGuardDecorators:
    """Test input_guard and output_guard decorators"""

    def test_input_guard_decorator(self):
        """Test that input_guard decorator adds correct attribute"""
        assert hasattr(sample_input_guard, "_is_input_guard")
        assert sample_input_guard._is_input_guard is True
        assert not hasattr(sample_input_guard, "_is_output_guard")

    def test_output_guard_decorator(self):
        """Test that output_guard decorator adds correct attribute"""
        assert hasattr(sample_output_guard, "_is_output_guard")
        assert sample_output_guard._is_output_guard is True
        assert not hasattr(sample_output_guard, "_is_input_guard")

    def test_decorated_function_still_works(self):
        """Test that decorated functions still work normally"""
        result, message = sample_input_guard({"key": "value"})
        assert result is True
        assert message == "Input is valid"

        result, message = sample_output_guard("long enough")
        assert result is True
        assert message == "Output is valid"


# ==================== Test GuardrailError ====================


class TestGuardrailError:
    """Test GuardrailError exception class"""

    def test_guardrail_error_with_name(self):
        """Test GuardrailError with guardrail name"""
        error = GuardrailError("Test error", guardrail_name="test_guard")
        assert str(error) == "Test error"
        assert error.guardrail_name == "test_guard"

    def test_guardrail_error_without_name(self):
        """Test GuardrailError without guardrail name"""
        error = GuardrailError("Test error")
        assert str(error) == "Test error"
        assert error.guardrail_name is None


# ==================== Test Check Implementation ====================


class TestCheckGuardrailsImpl:
    """Test _check_guardrails_impl function"""

    def test_empty_guardrails_list(self):
        """Test with empty guardrails list"""
        # Should not raise any exception
        _check_guardrails_impl([], {"test": "data"})

    def test_single_passing_guard(self):
        """Test with single passing guard"""
        _check_guardrails_impl([sample_input_guard], {"valid": "data"})

    def test_single_failing_guard(self):
        """Test with single failing guard"""
        with pytest.raises(GuardrailError) as exc_info:
            _check_guardrails_impl([sample_input_guard], {"forbidden": "key"})

        assert "input guardrail 'sample_input_guard' failed" in str(exc_info.value)
        assert "Forbidden key found" in str(exc_info.value)

    def test_multiple_passing_guards(self):
        """Test with multiple passing guards"""
        _check_guardrails_impl(
            [sample_input_guard, sample_output_guard], "valid long data"
        )

    def test_multiple_guards_first_fails(self):
        """Test with multiple guards where first fails"""
        with pytest.raises(GuardrailError) as exc_info:
            _check_guardrails_impl(
                [failing_guard, sample_input_guard], {"test": "data"}
            )

        assert "guardrail 'failing_guard' failed" in str(exc_info.value)

    def test_guard_raises_exception(self):
        """Test guard that raises an exception"""
        with pytest.raises(GuardrailError) as exc_info:
            _check_guardrails_impl([exception_guard], {"test": "data"})

        assert "guardrail 'exception_guard' error" in str(exc_info.value)
        assert "Test exception" in str(exc_info.value)

    def test_guard_type_detection(self):
        """Test correct guard type detection in error messages"""
        # Test input guard
        with pytest.raises(GuardrailError) as exc_info:
            _check_guardrails_impl([sample_input_guard], {"forbidden": "key"})
        assert "input guardrail" in str(exc_info.value)

        # Test output guard
        with pytest.raises(GuardrailError) as exc_info:
            _check_guardrails_impl([sample_output_guard], "no")
        assert "output guardrail" in str(exc_info.value)

        # Test undecorated guard
        with pytest.raises(GuardrailError) as exc_info:
            _check_guardrails_impl([undecorated_guard], "invalid")
        assert "guardrail 'undecorated_guard' failed" in str(exc_info.value)


# ==================== Test Sync Check ====================


class TestCheckGuardrailsSync:
    """Test check_guardrails_sync function"""

    def test_sync_check_passes(self):
        """Test synchronous check that passes"""
        check_guardrails_sync([sample_input_guard], {"valid": "data"})

    def test_sync_check_fails(self):
        """Test synchronous check that fails"""
        with pytest.raises(GuardrailError):
            check_guardrails_sync([sample_input_guard], {"forbidden": "key"})

    def test_sync_check_calls_impl(self):
        """Test that sync check calls implementation"""
        with patch("langcrew.guardrail._check_guardrails_impl") as mock_impl:
            guards = [sample_input_guard]
            data = {"test": "data"}
            check_guardrails_sync(guards, data)
            mock_impl.assert_called_once_with(guards, data)


# ==================== Test Async Check ====================


class TestCheckGuardrails:
    """Test async check_guardrails function"""

    @pytest.mark.asyncio
    async def test_async_check_passes(self):
        """Test asynchronous check that passes"""
        await check_guardrails([sample_input_guard], {"valid": "data"})

    @pytest.mark.asyncio
    async def test_async_check_fails(self):
        """Test asynchronous check that fails"""
        with pytest.raises(GuardrailError):
            await check_guardrails([sample_input_guard], {"forbidden": "key"})

    @pytest.mark.asyncio
    async def test_async_check_calls_impl(self):
        """Test that async check calls implementation"""
        with patch("langcrew.guardrail._check_guardrails_impl") as mock_impl:
            guards = [sample_input_guard]
            data = {"test": "data"}
            await check_guardrails(guards, data)
            mock_impl.assert_called_once_with(guards, data)


# ==================== Test with_guardrails Decorator ====================


class TestWithGuardrails:
    """Test with_guardrails decorator"""

    def test_sync_method_with_input_guards(self):
        """Test synchronous method with input guards"""

        class TestClass:
            def __init__(self):
                self.input_guards = [sample_input_guard]
                self.output_guards = []

            @with_guardrails
            def process(self, data):
                return f"Processed: {data}"

        obj = TestClass()

        # Valid input should pass
        result = obj.process({"valid": "data"})
        assert result == "Processed: {'valid': 'data'}"

        # Invalid input should fail
        with pytest.raises(GuardrailError):
            obj.process({"forbidden": "key"})

    def test_sync_method_with_output_guards(self):
        """Test synchronous method with output guards"""

        class TestClass:
            def __init__(self):
                self.input_guards = []
                self.output_guards = [sample_output_guard]

            @with_guardrails
            def process(self, data):
                return "ok" if data.get("short") else "long output"

        obj = TestClass()

        # Valid output should pass
        result = obj.process({"valid": "data"})
        assert result == "long output"

        # Invalid output should fail
        with pytest.raises(GuardrailError):
            obj.process({"short": True})

    @pytest.mark.asyncio
    async def test_async_method_with_guards(self):
        """Test asynchronous method with guardrails"""

        class TestClass:
            def __init__(self):
                self.input_guards = [sample_input_guard]
                self.output_guards = [sample_output_guard]

            @with_guardrails
            async def process(self, data):
                await asyncio.sleep(0)  # Simulate async work
                return "valid output"

        obj = TestClass()

        # Valid input and output should pass
        result = await obj.process({"valid": "data"})
        assert result == "valid output"

        # Invalid input should fail
        with pytest.raises(GuardrailError):
            await obj.process({"forbidden": "key"})

    def test_method_without_guards(self):
        """Test method without guardrails doesn't fail"""

        class TestClass:
            @with_guardrails
            def process(self, data):
                return f"Processed: {data}"

        obj = TestClass()
        result = obj.process({"any": "data"})
        assert result == "Processed: {'any': 'data'}"

    def test_method_with_non_dict_input(self):
        """Test method with non-dict input skips guards"""

        class TestClass:
            def __init__(self):
                self.input_guards = [failing_guard]
                self.output_guards = [failing_guard]

            @with_guardrails
            def process(self, data):
                return f"Processed: {data}"

        obj = TestClass()
        # Guards should be skipped for non-dict input
        result = obj.process("string input")
        assert result == "Processed: string input"

    def test_decorator_preserves_function_metadata(self):
        """Test that decorator preserves function metadata"""

        class TestClass:
            @with_guardrails
            def my_method(self, data):
                """My method docstring"""
                return data

        assert TestClass.my_method.__name__ == "my_method"
        assert TestClass.my_method.__doc__ == "My method docstring"


# ==================== Edge Cases ====================


class TestEdgeCases:
    """Test edge cases and special scenarios"""

    def test_guard_with_none_data(self):
        """Test guards with None data"""

        def none_guard(data):
            if data is None:
                return False, "None not allowed"
            return True, "OK"

        with pytest.raises(GuardrailError):
            check_guardrails_sync([none_guard], None)

    def test_guard_execution_order(self):
        """Test that guards are executed in order"""
        call_order = []

        def guard1(data):
            call_order.append(1)
            return True, "ok"

        def guard2(data):
            call_order.append(2)
            return True, "ok"

        check_guardrails_sync([guard1, guard2], {})
        assert call_order == [1, 2]

    def test_guard_stops_on_first_failure(self):
        """Test that execution stops on first failure"""
        call_count = []

        def guard1(data):
            call_count.append(1)
            return False, "fail"

        def guard2(data):
            call_count.append(2)
            return True, "ok"

        with pytest.raises(GuardrailError):
            check_guardrails_sync([guard1, guard2], {})

        # guard2 should not be called
        assert call_count == [1]
