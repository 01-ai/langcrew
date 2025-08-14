"""
Sandbox Toolkit - Unified Sandbox Operations
"""

import logging
from collections.abc import Awaitable, Callable
from typing import Any, Final

from e2b import AsyncSandbox

from ..env_config import env_config

_logger: logging.Logger = logging.getLogger(__name__)


class MockResult:
    """Mock result object to maintain consistent interface when sandbox command execution fails"""

    def __init__(self, exit_code: int, stdout: str = "", stderr: str = ""):
        """
        Initialize mock result object

        Args:
            exit_code: Exit code (typically 1 for errors)
            stdout: Standard output (empty by default)
            stderr: Standard error (typically contains error message)
        """
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr


class SandboxValidationError(Exception):
    """Sandbox validation exceptions"""

    pass


class SandboxToolkit:
    E2B_CONFIG: Final[dict[str, Any]] = env_config.get_dict("E2B_")

    SANDBOX_ID: Final[str] = "sandbox_id"
    """Unified toolkit for sandbox operations with improved error handling and type safety"""

    @staticmethod
    async def safe_run_async_command(
        async_sandbox: AsyncSandbox,
        command: str,
        timeout: int | None = None,
        **kwargs,
    ):
        """
        Safely execute async command in sandbox with automatic exception handling

        This method wraps sandbox.commands.run() and returns a MockResult if an exception occurs,
        ensuring consistent interface regardless of execution success or failure.

        Args:
            sandbox: AsyncSandbox instance
            command: Command string to execute
            timeout: Optional timeout in seconds
            **kwargs: Additional arguments passed to sandbox.commands.run()

        Returns:
            Command result object with .exit_code, .stdout, .stderr attributes
            Returns MockResult if exception occurs during execution
        """
        try:
            if timeout is not None:
                result = await async_sandbox.commands.run(
                    command, timeout=timeout, **kwargs
                )
            else:
                result = await async_sandbox.commands.run(command, **kwargs)
            return result
        except Exception as e:
            _logger.warning(
                f"Command execution failed: [{command}] - {type(e).__name__}: [{str(e)}]"
            )
            return MockResult(exit_code=1, stdout="", stderr=str(e))

    @staticmethod
    def _build_base_config(**kwargs) -> dict[str, Any]:
        """
        Build base configuration with common sandbox parameters

        Args:
            **kwargs: Keyword arguments to override default configuration values

        Returns:
            Dict[str, Any]: Base configuration dictionary with API key and domain
        """
        base_config = SandboxToolkit.E2B_CONFIG.copy()
        base_config.update(kwargs)
        return base_config

    @staticmethod
    async def _execute_sandbox_operation_async(
        operation_func: Callable[..., Awaitable[AsyncSandbox]], config: dict[str, Any]
    ) -> AsyncSandbox:
        """
        Generic method to execute async sandbox operations (connect, resume, create) with unified config handling

        Args:
            operation_func: The async sandbox operation function (AsyncSandbox.connect, AsyncSandbox.resume, etc.)
            config: Configuration dictionary
            **kwargs: Additional arguments passed to the operation function

        Returns:
            AsyncSandbox instance
        """
        # Build final configuration
        final_config = SandboxToolkit._build_base_config(**config)
        # Filter valid parameters for the operation function
        input_config = env_config.filter_valid_parameters(operation_func, final_config)
        # Execute the async operation
        return await operation_func(**input_config)

    @staticmethod
    async def connect_or_resume_async_sandbox(
        config: dict[str, Any],
        test_command: bool = True,
        resume: bool = True,
    ) -> AsyncSandbox:
        """
        Connect to an existing async sandbox with fallback to resume on connection failure

        Args:
            config: Configuration dictionary containing sandbox_id and other parameters
            test_command: Command to test connection (default: "pwd")
            resume: Whether to resume the sandbox if connection fails (default: True)
        Returns:
            Connected or resumed AsyncSandbox instance

        Raises:
            SandboxValidationError: If sandbox_id is missing or both connect and resume fail
        """
        # Ensure sandbox_id is present for resume operation
        if not config or SandboxToolkit.SANDBOX_ID not in config:
            raise SandboxValidationError(
                "sandbox_id is required for resume operation when connect fails"
            )

        sandbox_id = config[SandboxToolkit.SANDBOX_ID]
        try:
            # First attempt: try to connect to sandbox
            sandbox = await SandboxToolkit._execute_sandbox_operation_async(
                AsyncSandbox.connect, config
            )
            _logger.info(f"Attempting to connect to sandbox {config}")

            # Test connection
            if test_command:
                await sandbox.commands.run(test_command)
            _logger.info(f"Successfully connected to sandbox {sandbox_id}")
            return sandbox

        except Exception as connect_error:
            # Connection failed, try resume as fallback
            _logger.warning(
                f"Failed to connect to sandbox {sandbox_id}: {connect_error}"
            )
            if resume:
                try:
                    sandbox = await SandboxToolkit._execute_sandbox_operation_async(
                        AsyncSandbox.resume, config
                    )
                    _logger.info(f"Successfully resumed sandbox {sandbox_id}")
                    return sandbox

                except Exception as resume_error:
                    # Log detailed error information
                    _logger.exception(
                        f"Resume error for sandbox {sandbox_id}: {resume_error}"
                    )

                    # Both connect and resume failed
                    error_msg = (
                        f"Failed to connect or resume sandbox {sandbox_id}. "
                        f"Connect error: {connect_error}, Resume error: {resume_error}"
                    )
                    _logger.error(error_msg)
                    raise SandboxValidationError(error_msg) from resume_error
            else:
                raise SandboxValidationError(
                    f"Failed to connect to sandbox {sandbox_id}"
                )

    @staticmethod
    async def create_async_sandbox(
        config: dict[str, Any] | None = None,
    ) -> AsyncSandbox:
        """
        Create a new async sandbox instance

        Args:
            config: Optional configuration dictionary

        Returns:
            New AsyncSandbox instance
        """
        config = config or {}
        return await SandboxToolkit._execute_sandbox_operation_async(
            AsyncSandbox.create, config
        )


# Alias for easier import
sandbox_toolkit = SandboxToolkit
