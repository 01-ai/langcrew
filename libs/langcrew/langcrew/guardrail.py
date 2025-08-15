"""Simplified guardrail implementation for langcrew"""  # cspell:ignore langcrew

from __future__ import annotations

import asyncio
import functools
from collections.abc import Callable
from typing import Any, TypeAlias

# Type definition for guardrail functions
GuardrailFunc: TypeAlias = Callable[[Any], tuple[bool, str]]


class GuardrailError(Exception):
    """Exception raised when a guardrail check fails"""

    def __init__(self, message: str, guardrail_name: str | None = None):
        self.guardrail_name = guardrail_name
        super().__init__(message)


def input_guard(func: GuardrailFunc) -> GuardrailFunc:
    """Decorator to mark a function as an input guardrail"""
    func._is_input_guard = True  # type: ignore
    return func


def output_guard(func: GuardrailFunc) -> GuardrailFunc:
    """Decorator to mark a function as an output guardrail"""
    func._is_output_guard = True  # type: ignore
    return func


def _check_guardrails_impl(guardrails: list[GuardrailFunc], data: Any) -> None:
    """Internal implementation of guardrail checking logic

    Args:
        guardrails: List of guardrail functions to check
        data: The data to check (input or output)

    Raises:
        GuardrailError: If any guardrail check fails
    """
    for guard in guardrails:
        guard_name = getattr(guard, "__name__", "unnamed")

        # Auto-detect guard type from decorator attributes
        if hasattr(guard, "_is_input_guard") and guard._is_input_guard:
            guard_type = "input"
        elif hasattr(guard, "_is_output_guard") and guard._is_output_guard:
            guard_type = "output"
        else:
            guard_type = "guardrail"

        try:
            is_valid, message = guard(data)

            if not is_valid:
                raise GuardrailError(
                    f"{guard_type} guardrail '{guard_name}' failed: {message}",
                    guardrail_name=guard_name,
                )
        except GuardrailError:
            raise
        except Exception as e:
            raise GuardrailError(
                f"{guard_type} guardrail '{guard_name}' error: {str(e)}",
                guardrail_name=guard_name,
            ) from e


def check_guardrails_sync(guardrails: list[GuardrailFunc], data: Any) -> None:
    """Synchronous version: Check a list of guardrails and raise GuardrailError if any fail

    Args:
        guardrails: List of guardrail functions to check
        data: The data to check (input or output)

    Raises:
        GuardrailError: If any guardrail check fails
    """
    _check_guardrails_impl(guardrails, data)


async def check_guardrails(guardrails: list[GuardrailFunc], data: Any) -> None:
    """Async version: Check a list of guardrails and raise GuardrailError if any fail

    Args:
        guardrails: List of guardrail functions to check
        data: The data to check (input or output)

    Raises:
        GuardrailError: If any guardrail check fails
    """
    _check_guardrails_impl(guardrails, data)


def with_guardrails(func: Callable) -> Callable:
    """Decorator to automatically apply guardrail checks to methods.

    This decorator will:
    - Check input_guards on the first argument (input) before method execution
    - Check output_guards on the return value after method execution
    - Automatically handle both sync and async functions

    The decorated method's class should have:
    - input_guards: list[GuardrailFunc] attribute for input checking
    - output_guards: list[GuardrailFunc] attribute for output checking

    Args:
        func: The method to decorate

    Returns:
        Decorated method with guardrail checks
    """
    if asyncio.iscoroutinefunction(func):

        @functools.wraps(func)
        async def async_wrapper(self, *args, **kwargs):
            # Check input guardrails if available and args provided
            if (
                hasattr(self, "input_guards")
                and self.input_guards
                and args
                and isinstance(args[0], dict)
            ):
                await check_guardrails(self.input_guards, args[0])

            # Execute original method
            result = await func(self, *args, **kwargs)

            # Check output guardrails if available and input was provided
            if (
                hasattr(self, "output_guards")
                and self.output_guards
                and args
                and isinstance(args[0], dict)
            ):
                await check_guardrails(self.output_guards, result)

            return result

        return async_wrapper
    else:

        @functools.wraps(func)
        def sync_wrapper(self, *args, **kwargs):
            # Check input guardrails if available and args provided
            if (
                hasattr(self, "input_guards")
                and self.input_guards
                and args
                and isinstance(args[0], dict)
            ):
                check_guardrails_sync(self.input_guards, args[0])

            # Execute original method
            result = func(self, *args, **kwargs)

            # Check output guardrails if available and input was provided
            if (
                hasattr(self, "output_guards")
                and self.output_guards
                and args
                and isinstance(args[0], dict)
            ):
                check_guardrails_sync(self.output_guards, result)

            return result

        return sync_wrapper
