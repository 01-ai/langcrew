"""
Deprecation utilities for LangCrew.

This module provides utilities for handling deprecated features and parameters
in a consistent way across the LangCrew codebase.
"""

import warnings


def warn_deprecated_param(
    param_name: str,
    replacement: str,
    version: str = "3.0",
    stacklevel: int = 2,
) -> None:
    """Issue a deprecation warning for a parameter.

    Args:
        param_name: Name of the deprecated parameter
        replacement: Suggested replacement for the deprecated parameter
        version: Version in which the parameter will be removed (default: "3.0")
        stacklevel: Stack level for the warning (default: 2, meaning the caller of this function)
                   Set to 3 if calling from a wrapper function

    Example:
        >>> warn_deprecated_param("old_param", "new_param")
        DeprecationWarning: The 'old_param' parameter is deprecated and will be removed in version 3.0.
        Use 'new_param' instead. See migration guide: https://docs.langcrew.dev/migration
    """
    warnings.warn(
        f"The '{param_name}' parameter is deprecated and will be removed in version {version}. "
        f"Use '{replacement}' instead. "
        f"See migration guide: https://docs.langcrew.dev/migration",
        DeprecationWarning,
        stacklevel=stacklevel,
    )


def warn_deprecated_function(
    func_name: str,
    replacement: str,
    version: str = "3.0",
    stacklevel: int = 2,
) -> None:
    """Issue a deprecation warning for a function.

    Args:
        func_name: Name of the deprecated function
        replacement: Suggested replacement for the deprecated function
        version: Version in which the function will be removed (default: "3.0")
        stacklevel: Stack level for the warning (default: 2)

    Example:
        >>> warn_deprecated_function("old_function", "new_function")
        DeprecationWarning: The 'old_function' function is deprecated and will be removed in version 3.0.
        Use 'new_function' instead. See migration guide: https://docs.langcrew.dev/migration
    """
    warnings.warn(
        f"The '{func_name}' function is deprecated and will be removed in version {version}. "
        f"Use '{replacement}' instead. "
        f"See migration guide: https://docs.langcrew.dev/migration",
        DeprecationWarning,
        stacklevel=stacklevel,
    )


def warn_deprecated_class(
    class_name: str,
    replacement: str,
    version: str = "3.0",
    stacklevel: int = 2,
) -> None:
    """Issue a deprecation warning for a class.

    Args:
        class_name: Name of the deprecated class
        replacement: Suggested replacement for the deprecated class
        version: Version in which the class will be removed (default: "3.0")
        stacklevel: Stack level for the warning (default: 2)

    Example:
        >>> warn_deprecated_class("OldClass", "NewClass")
        DeprecationWarning: The 'OldClass' class is deprecated and will be removed in version 3.0.
        Use 'NewClass' instead. See migration guide: https://docs.langcrew.dev/migration
    """
    warnings.warn(
        f"The '{class_name}' class is deprecated and will be removed in version {version}. "
        f"Use '{replacement}' instead. "
        f"See migration guide: https://docs.langcrew.dev/migration",
        DeprecationWarning,
        stacklevel=stacklevel,
    )


# Sentinel object for detecting if a parameter was explicitly provided
# This is useful for parameters with default values that are being deprecated
NOT_PROVIDED = object()


__all__ = [
    "warn_deprecated_param",
    "warn_deprecated_function",
    "warn_deprecated_class",
    "NOT_PROVIDED",
]

