"""Configuration management utility for handling environment variables"""

import inspect
import os
import types
import typing
from typing import Any, TypeVar

T = TypeVar("T")


class ConfigError(Exception):
    """Configuration related errors"""

    pass


class ConfigManager:
    """Unified configuration manager for environment variables"""

    def _get_typed_value(
        self,
        key: str,
        value_type: type[T],
        default: T | None = None,
        required: bool = False,
    ) -> T | None:
        """Get typed value from environment with conversion"""
        value_str = os.getenv(key)

        if value_str is None:
            if required:
                raise ConfigError(f"Required environment variable '{key}' is not set")
            return default

        if value_type is str:
            return value_str
        elif value_type is int:
            try:
                return int(value_str)
            except ValueError:
                raise ConfigError(
                    f"Environment variable '{key}' must be an integer, got: {value_str}"
                )
        elif value_type is float:
            try:
                return float(value_str)
            except ValueError:
                raise ConfigError(
                    f"Environment variable '{key}' must be a number, got: {value_str}"
                )
        elif value_type is bool:
            value_lower = value_str.lower()
            if value_lower in ("true", "1", "yes", "on"):
                return True
            elif value_lower in ("false", "0", "no", "off"):
                return False
            else:
                raise ConfigError(
                    f"Environment variable '{key}' must be a boolean value, got: {value_str}"
                )
        else:
            raise ConfigError(f"Unsupported type: {value_type}")

    def get_str(
        self, key: str, default: str | None = None, required: bool = False
    ) -> str | None:
        """Get string value from environment"""
        return self._get_typed_value(key, str, default, required)

    def get_int(
        self, key: str, default: int | None = None, required: bool = False
    ) -> int | None:
        """Get integer value from environment"""
        return self._get_typed_value(key, int, default, required)

    def get_float(
        self, key: str, default: float | None = None, required: bool = False
    ) -> float | None:
        """Get float value from environment"""
        return self._get_typed_value(key, float, default, required)

    def get_bool(
        self, key: str, default: bool | None = None, required: bool = False
    ) -> bool | None:
        """Get boolean value from environment"""
        return self._get_typed_value(key, bool, default, required)

    def get_list(
        self,
        key: str,
        separator: str = ",",
        default: list | None = None,
        required: bool = False,
    ) -> list | None:
        """Get list value from environment (comma-separated string)"""
        value_str = self.get_str(key, required=required)
        if value_str is None:
            return default or []

        return [item.strip() for item in value_str.split(separator) if item.strip()]

    def get_dict(
        self,
        prefix: str,
        case_sensitive: bool = True,
        lowercase_keys: bool = True,
        target_type: type | None = None,
    ) -> dict[str, str] | Any:
        """Get all environment variables with a specific prefix

        Args:
            prefix: Prefix to filter environment variables
            case_sensitive: Whether to use case-sensitive matching
            lowercase_keys: Whether to convert resulting keys to lowercase
            target_type: Target type to convert the result dict to (if it's a dataclass)

        Returns:
            Dictionary of environment variables without the prefix, or target_type instance
        """
        result = {}
        search_prefix = prefix if case_sensitive else prefix.upper()

        for key, value in os.environ.items():
            search_key = key if case_sensitive else key.upper()

            if search_key.startswith(search_prefix):
                clean_key = key[len(prefix) :]
                if lowercase_keys:
                    clean_key = clean_key.lower()
                result[clean_key] = value

        # If target_type is specified, try to convert dict to that type
        if target_type is not None:
            try:
                # Check if it's a dataclass
                if hasattr(target_type, "__dataclass_fields__"):
                    return target_type(**result)
                # For other types, try direct instantiation
                return target_type(result)
            except Exception as e:
                raise ConfigError(
                    f"Failed to convert dict to {target_type.__name__}: {e}"
                )

        return result

    def filter_valid_parameters(self, func, params: dict[str, Any]) -> dict[str, Any]:
        """
        Filter parameters to only include those that are valid for the given function,
        and convert values according to their type annotations.

        Args:
            func: The function to check parameters against
            params: Dictionary of parameters to filter

        Returns:
            Dictionary containing only valid parameters for the function with type-converted values
        """
        # Get the function signature
        sig = inspect.signature(func)

        # Get valid parameter names
        # Note: For class methods (@classmethod), 'cls' is automatically handled by inspect.signature()
        # and doesn't appear in the signature. For instance methods, 'self' does appear.
        valid_params = set(sig.parameters.keys())

        # Remove 'self' parameter if present (for instance methods)
        if "self" in valid_params:
            valid_params.remove("self")

        # Filter and convert parameters
        filtered_params = {}
        for k, v in params.items():
            if k in valid_params:
                param = sig.parameters[k]
                converted_value = self._convert_parameter_value(v, param.annotation)
                filtered_params[k] = converted_value

        return filtered_params

    def _convert_parameter_value(self, value: Any, annotation: Any) -> Any:
        """
        Convert a parameter value based on its type annotation.

        Args:
            value: The value to convert
            annotation: The type annotation from the function signature

        Returns:
            Converted value or original value if conversion fails
        """
        # If no annotation or annotation is Any, return as-is
        if annotation == inspect.Parameter.empty or annotation == Any:
            return value

        # If value is already the correct type, return as-is
        if isinstance(value, annotation):
            return value

        # Handle string values that need conversion
        if isinstance(value, str):
            try:
                # Handle common type conversions
                if annotation is int:
                    return int(value)
                elif annotation is float:
                    return float(value)
                elif annotation is bool:
                    return value.lower() in ("true", "1", "yes", "on")
                elif annotation is str:
                    return value
                # Handle Union types (including Optional which is Union[T, None])
                elif hasattr(annotation, "__origin__"):
                    # Handle both typing.Union and types.UnionType (Python 3.10+)
                    union_types = [typing.Union]
                    if hasattr(types, "UnionType"):
                        union_types.append(types.UnionType)

                    if annotation.__origin__ in union_types:
                        args = getattr(annotation, "__args__", ())
                        # Try converting to the first non-None type
                        for arg_type in args:
                            if arg_type is not type(None):
                                try:
                                    return self._convert_parameter_value(
                                        value, arg_type
                                    )
                                except (ValueError, TypeError):
                                    continue
            except (ValueError, TypeError):
                # If conversion fails, return original value
                pass

        return value


# Global instance for easy access
env_config = ConfigManager()
