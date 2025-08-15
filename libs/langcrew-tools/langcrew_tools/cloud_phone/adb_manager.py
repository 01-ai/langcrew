import logging

from agentbox import Sandbox

logger = logging.getLogger(__name__)


class ADB:
    """ADB connection context manager."""

    def __init__(self, sbx: Sandbox):
        """Initialize the ADB context manager."""
        self.sbx = sbx

    def __enter__(self):
        """Enter the ADB context."""
        try:
            # Check if adb shell is available
            self.sbx.adb_shell.shell("ls")
        except Exception as e:
            logger.error(f"adb shell disconnect, reson {e}")
            try:
                self.sbx.adb_shell.close()
                self.sbx.adb_shell.connect()
            except Exception as e:
                logger.error(f"try adb shell connect failed, reson {e}")
        return self.sbx.adb_shell

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the ADB context."""
        # No special cleanup needed for now
        pass
