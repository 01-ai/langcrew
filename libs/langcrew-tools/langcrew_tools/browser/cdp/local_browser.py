"""Local browser manager for managing browser subprocess lifecycle."""

import asyncio
import glob
import logging
import os
import platform
import shutil
import tempfile
from pathlib import Path

import psutil

logger = logging.getLogger(__name__)


class BrowserProfile:
    """Browser profile configuration."""

    def __init__(
        self,
        user_data_dir: str | None = None,
        profile_directory: str | None = "Default",
        executable_path: str | None = None,
        headless: bool = True,
        args: list[str] | None = None,
    ):
        # Create temp user data dir if not provided (required for CDP attachment)
        if user_data_dir is None:
            user_data_dir = tempfile.mkdtemp(prefix="browser-use-user-data-dir-")

        self.user_data_dir = user_data_dir
        self.profile_directory = profile_directory
        self.executable_path = executable_path
        self.headless = headless
        self.custom_args = args or []

    def get_args(self) -> list[str]:
        """Get browser launch arguments.

        Returns:
                List of command line arguments (does NOT include URL to open)
        """
        args = []

        # User data directory (required for CDP)
        # IMPORTANT: Use '=' format, not separate args to avoid Chrome misinterpreting paths as URLs
        args.append(f"--user-data-dir={str(self.user_data_dir)}")

        # Profile directory - NOT compatible with headless mode
        # Only add if not in headless mode
        if not self.headless and self.profile_directory:
            args.append(f"--profile-directory={str(self.profile_directory)}")

        # Headless mode
        if self.headless:
            args.append("--headless=new")

        # Disable default browser check and first run experience
        args.extend([
            "--no-first-run",
            "--no-default-browser-check",
        ])

        # Standard arguments from browser_use (minimal set for stability)
        args.extend([
            # Disable automation detection
            # '--disable-blink-features=AutomationControlled',
            # Basic stability
            "--disable-default-apps",
            "--disable-popup-blocking",
            # Prevent multiple tabs on startup
            "--disable-session-crashed-bubble",
            "--disable-infobars",
            # Prevent restoring previous session
            "--disable-restore-session-state",
            "--disable-sync",
            # Disable background networking that might open tabs
            "--disable-background-networking",
            "--disable-component-update",
            # No startup URLs
            "--no-service-autorun",
            "--disable-search-engine-choice-screen",
        ])

        # Custom arguments (filter out URLs - URLs should be passed via start_url)
        for arg in self.custom_args:
            # Skip URLs (http/https/about:)
            if (
                not arg.startswith("http://")
                and not arg.startswith("https://")
                and not arg.startswith("about:")
            ):
                args.append(arg)

        return args


class LocalBrowser:
    """Manages local browser subprocess lifecycle without browser_use dependency."""

    def __init__(
        self,
        user_data_dir: str | None = None,
        profile_directory: str | None = "Default",
        executable_path: str | None = None,
        headless: bool = True,
        custom_args: list[str] | None = None,
        start_url: str | None = None,  # DEPRECATED: Use CDP to navigate after launch
    ):
        """Initialize the local browser manager.

        Args:
                user_data_dir: Path to user data directory
                profile_directory: Browser profile directory name
                executable_path: Path to browser executable
                headless: Whether to run in headless mode
                custom_args: Additional command line arguments
                start_url: DEPRECATED - Do not use. Navigate via CDP after browser launches.
                        Adding URLs to launch args causes Chrome to open multiple tabs.
        """
        if start_url is not None:
            logger.warning(
                "[LocalBrowser] start_url parameter is deprecated and ignored. "
                "Chrome opens multiple tabs when URLs are passed as launch args. "
                "Use CDP to navigate after browser launches instead."
            )
        self.start_url = start_url  # Keep for backward compatibility but not used
        self.profile = BrowserProfile(
            user_data_dir=user_data_dir,
            profile_directory=profile_directory,
            executable_path=executable_path,
            headless=headless,
            args=custom_args,
        )

        self._subprocess: psutil.Process | None = None
        self._cdp_url: str | None = None
        self._debug_port: int | None = None
        self._temp_dirs_to_cleanup: list[Path] = []
        self._original_user_data_dir: str | None = None

    async def launch(self) -> str:
        """Launch the browser and return the CDP URL.

        Returns:
                CDP WebSocket URL for connecting to the browser

        Raises:
                RuntimeError: If browser fails to launch
        """
        try:
            logger.debug("[LocalBrowser] Launching browser...")
            process, cdp_url = await self._launch_browser()
            self._subprocess = process
            self._cdp_url = cdp_url
            logger.debug(
                f"[LocalBrowser] Browser launched successfully. CDP URL: {cdp_url}"
            )
            return cdp_url
        except Exception as e:
            logger.error(f"[LocalBrowser] Failed to launch browser: {e}", exc_info=True)
            raise

    async def kill(self) -> None:
        """Kill the browser process and clean up resources."""
        logger.debug("[LocalBrowser] Killing browser process")

        if self._subprocess:
            await self._cleanup_process(self._subprocess)
            self._subprocess = None

        # Clean up temp directories
        for temp_dir in self._temp_dirs_to_cleanup:
            self._cleanup_temp_dir(temp_dir)
        self._temp_dirs_to_cleanup.clear()

        # Reset URLs and ports
        self._cdp_url = None
        self._debug_port = None

        logger.debug("[LocalBrowser] Browser cleanup completed")

    async def is_running(self) -> bool:
        """Check if the browser is still running.

        Returns:
                True if browser is running, False otherwise
        """
        if self._subprocess:
            return self._subprocess.is_running()
        return False

    @property
    def cdp_url(self) -> str | None:
        """Get the CDP URL."""
        return self._cdp_url

    @property
    def browser_pid(self) -> int | None:
        """Get the browser process ID."""
        if self._subprocess:
            return self._subprocess.pid
        return None

    def _setup_preferences(self) -> None:
        """Setup Chrome preferences to prevent default pages and session restore.

        This creates/modifies the Preferences file in the user data directory
        to disable startup pages, homepage, and session restore.
        """
        import json
        from pathlib import Path

        if not self.profile.user_data_dir:
            return

        # Create profile directory if it doesn't exist
        profile_dir = Path(self.profile.user_data_dir) / (
            self.profile.profile_directory or "Default"
        )
        profile_dir.mkdir(parents=True, exist_ok=True)

        # Preferences file path
        prefs_file = profile_dir / "Preferences"

        # Load existing preferences or create new
        if prefs_file.exists():
            try:
                with open(prefs_file, encoding="utf-8") as f:
                    prefs = json.load(f)
            except Exception as e:
                logger.warning(
                    f"[LocalBrowser] Failed to load Preferences: {e}, creating new"
                )
                prefs = {}
        else:
            prefs = {}

        # Set preferences to prevent default pages
        prefs.setdefault("session", {})
        prefs["session"]["restore_on_startup"] = (
            5  # 5 = Open New Tab Page (but we'll override it)
        )
        prefs["session"]["startup_urls"] = []  # No startup URLs

        prefs.setdefault("browser", {})
        prefs["browser"]["show_home_button"] = False
        prefs["browser"]["check_default_browser"] = False

        prefs.setdefault("homepage", "")  # No homepage
        prefs.setdefault("homepage_is_newtabpage", False)

        # Disable restore prompts
        prefs.setdefault("profile", {})
        prefs["profile"]["exit_type"] = "Normal"
        prefs["profile"]["exited_cleanly"] = True

        # Write preferences back
        try:
            with open(prefs_file, "w", encoding="utf-8") as f:
                json.dump(prefs, f, indent=2)
            logger.debug(f"[LocalBrowser] Preferences configured: {prefs_file}")
        except Exception as e:
            logger.warning(f"[LocalBrowser] Failed to write Preferences: {e}")

    async def _launch_browser(self, max_retries: int = 3) -> tuple[psutil.Process, str]:
        """Launch browser process and return (process, cdp_url).

        Args:
                max_retries: Maximum number of retry attempts

        Returns:
                Tuple of (psutil.Process, cdp_url)

        Raises:
                RuntimeError: If browser fails to launch after all retries
        """
        # Keep track of original user_data_dir
        self._original_user_data_dir = (
            str(self.profile.user_data_dir) if self.profile.user_data_dir else None
        )
        self._temp_dirs_to_cleanup = []

        # Setup Chrome preferences to prevent default pages
        self._setup_preferences()

        for attempt in range(max_retries):
            try:
                # Get launch args
                launch_args = self.profile.get_args()

                # Note: Do NOT add any URL here in launch_args!
                # Chrome will open the URL as a command line argument, which may cause multiple tabs.
                # Instead, navigate to URLs via CDP after browser launches.
                # The browser will start with no tabs or a blank tab depending on settings.

                # Add debugging port
                debug_port = self._find_free_port()
                self._debug_port = debug_port
                launch_args.append(f"--remote-debugging-port={debug_port}")

                # Ensure user data dir is set
                if "--user-data-dir" not in str(launch_args):
                    raise ValueError(
                        "User data dir must be set to enable CDP attachment. "
                        "Pass user_data_dir parameter or use a custom profile."
                    )

                # Get browser executable path
                if self.profile.executable_path:
                    browser_path = self.profile.executable_path
                    logger.debug(
                        f"[LocalBrowser] Using custom executable: {browser_path}"
                    )
                else:
                    browser_path = self._find_installed_browser_path()
                    if not browser_path:
                        logger.error(
                            "[LocalBrowser] No browser found, installing with playwright..."
                        )
                        browser_path = await self._install_browser_with_playwright()

                logger.debug(f"[LocalBrowser] Browser executable: {browser_path}")
                if not browser_path:
                    raise RuntimeError("No Chrome/Chromium browser found")

                # Launch browser subprocess
                logger.info(
                    f"[LocalBrowser] Launching browser with {len(launch_args)} args..."
                )
                logger.info(
                    f"[LocalBrowser] Command: {browser_path} {' '.join(launch_args)}"
                )
                subprocess = await asyncio.create_subprocess_exec(
                    browser_path,
                    *launch_args,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                logger.debug(
                    f"[LocalBrowser] Browser PID: {subprocess.pid}, CDP port: {debug_port}"
                )

                # Wait a moment for browser to start or fail
                await asyncio.sleep(0.5)

                # Check if process is still running
                if subprocess.returncode is not None:
                    # Process exited, get error output
                    stdout, stderr = await subprocess.communicate()
                    error_msg = stderr.decode() if stderr else "Unknown error"
                    raise RuntimeError(
                        f"Browser exited with code {subprocess.returncode}: {error_msg}"
                    )

                # Convert to psutil.Process
                process = psutil.Process(subprocess.pid)

                # Wait for CDP to be ready
                cdp_url = await self._wait_for_cdp_url(debug_port)

                # Clean up unused temp dirs
                current_user_data_dir = str(self.profile.user_data_dir)
                unused_temp_dirs = [
                    tmp_dir
                    for tmp_dir in self._temp_dirs_to_cleanup
                    if str(tmp_dir) != current_user_data_dir
                ]
                for tmp_dir in unused_temp_dirs:
                    try:
                        shutil.rmtree(tmp_dir, ignore_errors=True)
                    except Exception:
                        pass

                # Keep only the in-use directory for cleanup
                if current_user_data_dir and "browseruse-tmp-" in current_user_data_dir:
                    self._temp_dirs_to_cleanup = [Path(current_user_data_dir)]
                else:
                    self._temp_dirs_to_cleanup = []

                return process, cdp_url

            except Exception as e:
                error_str = str(e).lower()

                # Check if this is a user_data_dir related error
                if any(
                    err in error_str
                    for err in [
                        "singletonlock",
                        "user data directory",
                        "cannot create",
                        "already in use",
                    ]
                ):
                    logger.warning(
                        f"Browser launch failed (attempt {attempt + 1}/{max_retries}): {e}"
                    )

                    if attempt < max_retries - 1:
                        # Create temporary directory
                        tmp_dir = Path(tempfile.mkdtemp(prefix="browseruse-tmp-"))
                        self._temp_dirs_to_cleanup.append(tmp_dir)

                        # Update profile
                        self.profile.user_data_dir = str(tmp_dir)
                        logger.debug(
                            f"Retrying with temporary user_data_dir: {tmp_dir}"
                        )

                        await asyncio.sleep(0.5)
                        continue

                # Restore original user_data_dir
                if self._original_user_data_dir is not None:
                    self.profile.user_data_dir = self._original_user_data_dir

                # Clean up temp dirs
                for tmp_dir in self._temp_dirs_to_cleanup:
                    try:
                        shutil.rmtree(tmp_dir, ignore_errors=True)
                    except Exception:
                        pass

                raise

        # Should not reach here
        if self._original_user_data_dir is not None:
            self.profile.user_data_dir = self._original_user_data_dir
        raise RuntimeError(f"Failed to launch browser after {max_retries} attempts")

    @staticmethod
    def _find_installed_browser_path() -> str | None:
        """Try to find browser executable from common locations.

        Prioritizes Chromium over Google Chrome for better headless support.

        Returns:
                Path to browser executable or None if not found
        """
        system = platform.system()
        patterns = []

        # Get playwright browsers path
        playwright_path = os.environ.get("PLAYWRIGHT_BROWSERS_PATH")

        if system == "Darwin":  # macOS
            if not playwright_path:
                playwright_path = "~/Library/Caches/ms-playwright"
            # Priority: Playwright Chromium > System Chromium > Google Chrome
            patterns = [
                f"{playwright_path}/chromium-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
                "/Applications/Chromium.app/Contents/MacOS/Chromium",
                f"{playwright_path}/chromium_headless_shell-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
                "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            ]
        elif system == "Linux":
            if not playwright_path:
                playwright_path = "~/.cache/ms-playwright"
            patterns = [
                f"{playwright_path}/chromium-*/chrome-linux*/chrome",
                "/usr/bin/chromium",
                "/usr/bin/chromium-browser",
                "/usr/local/bin/chromium",
                "/snap/bin/chromium",
                f"{playwright_path}/chromium_headless_shell-*/chrome-linux*/chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/google-chrome",
                "/usr/local/bin/google-chrome",
                "/usr/bin/google-chrome-beta",
                "/usr/bin/google-chrome-dev",
                "/usr/bin/brave-browser",
            ]
        elif system == "Windows":
            if not playwright_path:
                playwright_path = r"%LOCALAPPDATA%\ms-playwright"
            patterns = [
                f"{playwright_path}\\chromium-*\\chrome-win\\chrome.exe",
                r"C:\Program Files\Chromium\Application\chrome.exe",
                r"C:\Program Files (x86)\Chromium\Application\chrome.exe",
                r"%LOCALAPPDATA%\Chromium\Application\chrome.exe",
                f"{playwright_path}\\chromium_headless_shell-*\\chrome-win\\chrome.exe",
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe",
                r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe",
                r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
                r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
            ]

        for pattern in patterns:
            # Expand user home directory
            expanded_pattern = Path(pattern).expanduser()

            # Handle Windows environment variables
            if system == "Windows":
                pattern_str = str(expanded_pattern)
                for env_var in [
                    "%LOCALAPPDATA%",
                    "%PROGRAMFILES%",
                    "%PROGRAMFILES(X86)%",
                ]:
                    if env_var in pattern_str:
                        env_key = env_var.strip("%").replace("(X86)", " (x86)")
                        env_value = os.environ.get(env_key, "")
                        if env_value:
                            pattern_str = pattern_str.replace(env_var, env_value)
                expanded_pattern = Path(pattern_str)

            pattern_str = str(expanded_pattern)

            # Check if pattern contains wildcards
            if "*" in pattern_str:
                matches = glob.glob(pattern_str)
                if matches:
                    matches.sort()
                    browser_path = matches[-1]
                    if Path(browser_path).exists() and Path(browser_path).is_file():
                        return browser_path
            else:
                if expanded_pattern.exists() and expanded_pattern.is_file():
                    return str(expanded_pattern)

        return None

    async def _install_browser_with_playwright(self) -> str:
        """Install browser using playwright.

        Returns:
                Path to installed browser executable

        Raises:
                RuntimeError: If installation fails
        """
        cmd = ["uvx", "playwright", "install", "chrome"]
        if platform.system() == "Linux":
            cmd.append("--with-deps")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=60.0)
            logger.debug(f"[LocalBrowser] Playwright install output: {stdout}")
            browser_path = self._find_installed_browser_path()
            if browser_path:
                return browser_path
            logger.error(
                f"[LocalBrowser] Playwright install error: \n{stdout}\n{stderr}"
            )
            raise RuntimeError("No browser path found after playwright install")
        except TimeoutError:
            process.kill()
            await process.wait()
            raise RuntimeError("Timeout installing browser with playwright")
        except Exception as e:
            if process.returncode is None:
                process.kill()
                await process.wait()
            raise RuntimeError(f"Error installing browser: {e}")

    @staticmethod
    def _find_free_port() -> int:
        """Find a free port for the debugging interface.

        Returns:
                Available port number
        """
        import socket

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port

    @staticmethod
    async def _wait_for_cdp_url(port: int, timeout: float = 30) -> str:
        """Wait for the browser to start and return the CDP URL.

        Args:
                port: Debug port to connect to
                timeout: Maximum wait time in seconds

        Returns:
                CDP URL string

        Raises:
                TimeoutError: If browser doesn't start within timeout
        """
        import aiohttp

        start_time = asyncio.get_event_loop().time()
        attempt = 0

        while asyncio.get_event_loop().time() - start_time < timeout:
            attempt += 1
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"http://127.0.0.1:{port}/json/version",
                        timeout=aiohttp.ClientTimeout(total=1),
                    ) as resp:
                        if resp.status == 200:
                            logger.debug(
                                f"[LocalBrowser] CDP ready after {attempt * 0.1:.1f}s"
                            )
                            return f"http://127.0.0.1:{port}/"
                        else:
                            logger.debug(
                                f"[LocalBrowser] CDP not ready, status: {resp.status}"
                            )
                            await asyncio.sleep(0.1)
            except TimeoutError:
                logger.debug(
                    f"[LocalBrowser] CDP connection timeout (attempt {attempt})"
                )
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.debug(f"[LocalBrowser] CDP connection error: {e}")
                await asyncio.sleep(0.1)

        raise TimeoutError(
            f"Browser did not start within {timeout} seconds on port {port}"
        )

    @staticmethod
    async def _cleanup_process(process: psutil.Process) -> None:
        """Clean up browser process.

        Args:
                process: psutil.Process to terminate
        """
        if not process:
            return

        try:
            # Try graceful shutdown first
            process.terminate()

            # Wait up to 5 seconds
            for _ in range(50):
                if not process.is_running():
                    # Give time for pipes to flush
                    await asyncio.sleep(0.2)
                    return
                await asyncio.sleep(0.1)

            # Force kill if still running
            if process.is_running():
                process.kill()
                # Give time for pipes to flush
                await asyncio.sleep(0.2)

        except psutil.NoSuchProcess:
            pass
        except Exception:
            pass

    def _cleanup_temp_dir(self, temp_dir: Path | str) -> None:
        """Clean up temporary directory.

        Args:
                temp_dir: Path to temporary directory to remove
        """
        if not temp_dir:
            return

        try:
            temp_path = Path(temp_dir)
            if "browseruse-tmp-" in str(temp_path):
                shutil.rmtree(temp_path, ignore_errors=True)
        except Exception as e:
            logger.debug(f"Failed to cleanup temp dir {temp_dir}: {e}")

    async def __aenter__(self):
        """Async context manager entry."""
        await self.launch()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.kill()
