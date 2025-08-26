"""Tool registration and management for LangCrew framework

This module provides a unified tool registry that:
1. Auto-discovers tools from langcrew, custom directories, and third-party packages
2. Supports simplified tool names without provider prefixes
3. Handles tool instantiation and caching
"""

import importlib
import inspect
import logging
from pathlib import Path
from typing import Any

from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)


class ToolRegistryConfig:
    """Configuration for tool registry"""

    # Provider names
    CUSTOM_PROVIDER = "custom"
    LANGCREW_PROVIDER = "langcrew"
    CREWAI_PROVIDER = "crewai"
    LANGCHAIN_PROVIDER = "langchain"
    LOCAL_PROVIDER = "local"

    # Discovery paths for external tool packages
    EXTERNAL_TOOL_PACKAGES = [
        "langcrew_tools",
        "crewai_tools",
        "langchain_community.tools",
    ]

    # Search order for local providers
    LOCAL_SEARCH_ORDER = [CUSTOM_PROVIDER]

    # Tool discovery file patterns
    TOOL_FILE_PATTERN = "langchain_tools.py"


class ToolRegistry:
    """Unified tool registry with auto-discovery and simplified naming"""

    # Tool cache - stores instantiated tools
    _tool_cache: dict[str, BaseTool] = {}

    # Registered tool classes by name
    _registered_tools: dict[str, type[BaseTool]] = {}

    # Auto-discovered tools from various sources
    _discovered_tools: dict[str, dict[str, type[BaseTool]]] = {
        ToolRegistryConfig.CUSTOM_PROVIDER: {},  # User custom tools from project
        ToolRegistryConfig.LANGCREW_PROVIDER: {},  # External LangCrew tools
        ToolRegistryConfig.CREWAI_PROVIDER: {},  # External CrewAI tools
        ToolRegistryConfig.LANGCHAIN_PROVIDER: {},  # External LangChain community tools
    }

    # Flag to track if discovery has been run
    _discovery_complete = False

    # =====================================
    # Public API Methods
    # =====================================

    @classmethod
    def get_tool(cls, name: str) -> BaseTool:
        """Get a tool instance by name

        Args:
            name: Tool name (e.g., "file_read", "csv_analyzer")
                  Can optionally include provider prefix (e.g., "crewai:scrape_website")
                  Without prefix, defaults to "local" provider with search priority

        Returns:
            Tool instance

        Raises:
            ValueError: If tool not found
        """
        # Ensure discovery has been run
        if not cls._discovery_complete:
            cls._run_discovery()

        # Check cache first
        cached_tool = cls._get_cached_tool(name)
        if cached_tool:
            return cached_tool

        # Parse provider and tool name
        provider, tool_name = cls._parse_tool_name(name)

        # Find and instantiate tool
        tool_instance = cls._find_and_instantiate_tool(provider, tool_name, name)

        # Cache and return
        cls._cache_tool(name, tool_instance)
        return tool_instance

    @classmethod
    def _find_and_instantiate_tool(
        cls, provider: str, tool_name: str, original_name: str
    ) -> BaseTool:
        """Find tool class and instantiate it"""
        tool_class = cls._find_tool_in_provider(provider, tool_name)
        if not tool_class:
            available = cls.list_tools()
            raise ValueError(
                f"Tool '{original_name}' not found. Available tools: {available}"
            )

        return tool_class()

    @classmethod
    def register(cls, name: str, tool_class: type[BaseTool]) -> None:
        """Register a tool class

        Args:
            name: Tool name
            tool_class: Tool class (must inherit from BaseTool)
        """
        if not inspect.isclass(tool_class) or not issubclass(tool_class, BaseTool):
            raise ValueError(f"{tool_class} must be a BaseTool subclass")

        cls._registered_tools[name] = tool_class
        # Also add to custom tools for consistency
        cls._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER][name] = tool_class

        # Clear cache entry if exists
        if name in cls._tool_cache:
            del cls._tool_cache[name]

    @classmethod
    def list_tools(cls) -> list[str]:
        """List all available tools"""
        if not cls._discovery_complete:
            cls._run_discovery()

        tools = set()

        # Add registered tools
        tools.update(cls._registered_tools.keys())

        # Add discovered tools
        for _, provider_tools in cls._discovered_tools.items():
            tools.update(provider_tools.keys())

        return sorted(list(tools))

    # =====================================
    # Core Logic Methods
    # =====================================

    @classmethod
    def _parse_tool_name(cls, name: str) -> tuple[str, str]:
        """Parse tool name into provider and tool name

        Args:
            name: Tool name (e.g., "file_read" or "crewai:scrape_website")

        Returns:
            Tuple of (provider, tool_name)
        """
        if ":" in name:
            provider, tool_name = name.split(":", 1)
        else:
            provider = ToolRegistryConfig.LOCAL_PROVIDER
            tool_name = name
        return provider, tool_name

    @classmethod
    def _get_cached_tool(cls, name: str) -> BaseTool | None:
        """Get tool from cache if available"""
        return cls._tool_cache.get(name)

    @classmethod
    def _cache_tool(cls, name: str, tool_instance: BaseTool) -> None:
        """Cache a tool instance"""
        cls._tool_cache[name] = tool_instance

    @classmethod
    def _run_discovery(cls) -> None:
        """Run tool discovery from all sources"""
        if cls._discovery_complete:
            return

        # Discover user custom tools
        cls._discover_project_tools()

        # Discover external tools (lazy - only when requested)
        # We don't run this proactively to avoid import errors

        cls._discovery_complete = True

    # =====================================
    # Tool Discovery Methods
    # =====================================

    @classmethod
    def _discover_project_tools(cls) -> None:
        """Discover user custom tools from project directory"""
        # Try multiple possible project root locations
        current_dir = Path.cwd()
        possible_roots = [
            current_dir,
        ]

        for root in possible_roots:
            tools_dir = root / "tools"
            if tools_dir.exists() and tools_dir.is_dir():
                cls._scan_directory_for_tools(
                    tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER
                )
                break

    @classmethod
    def _scan_directory_for_tools(cls, directory: Path, provider: str) -> None:
        """Scan a directory for tool classes"""
        for py_file in directory.glob("**/*.py"):
            if py_file.name.startswith("_"):
                continue

            # Build module path
            relative_path = py_file.relative_to(directory.parent)
            module_path = str(relative_path.with_suffix("")).replace("/", ".")

            try:
                spec = importlib.util.spec_from_file_location(module_path, py_file)
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    cls._extract_tools_from_module(module, provider)
            except Exception as e:
                logger.debug(f"Failed to import {py_file}: {e}")

    # =====================================
    # Utility Methods
    # =====================================

    @classmethod
    def _extract_tools_from_module(
        cls, module: Any, provider: str, prefix: str = ""
    ) -> None:
        """Extract tool classes from a module"""
        for name, obj in inspect.getmembers(module):
            if (
                inspect.isclass(obj)
                and issubclass(obj, BaseTool)
                and obj != BaseTool
                and not name.startswith("_")
            ):
                # Use the tool's name field directly
                tool_instance = obj()
                tool_name = tool_instance.name

                # Add prefix if specified (for namespacing)
                if prefix:
                    tool_name = f"{prefix}_{tool_name}"

                cls._discovered_tools[provider][tool_name] = obj

    @classmethod
    def _discover_external_tools(cls, module_path: str) -> None:
        """Discover tools from external tool packages on demand"""
        if ToolRegistryConfig.LANGCREW_PROVIDER in module_path:
            provider = ToolRegistryConfig.LANGCREW_PROVIDER
        elif ToolRegistryConfig.CREWAI_PROVIDER in module_path:
            provider = ToolRegistryConfig.CREWAI_PROVIDER
        else:
            provider = ToolRegistryConfig.LANGCHAIN_PROVIDER

        # Skip if already discovered
        if cls._discovered_tools[provider]:
            return

        try:
            module = importlib.import_module(module_path)
            cls._extract_tools_from_module(module, provider)
        except ImportError as e:
            logger.debug(f"Failed to import {module_path}: {e}")

    @classmethod
    def _find_tool_in_provider(
        cls, provider: str, tool_name: str
    ) -> type[BaseTool] | None:
        """Find a tool in a specific provider"""
        # Handle local provider with search priority
        if provider == ToolRegistryConfig.LOCAL_PROVIDER:
            return cls._find_local_tool(tool_name)

        # Ensure external tools are loaded if needed
        external_providers = [
            ToolRegistryConfig.CREWAI_PROVIDER,
            ToolRegistryConfig.LANGCHAIN_PROVIDER,
            ToolRegistryConfig.LANGCREW_PROVIDER,
        ]
        if provider in external_providers and not cls._discovered_tools[provider]:
            cls._load_external_tools(provider)

        return cls._discovered_tools.get(provider, {}).get(tool_name)

    @classmethod
    def _find_local_tool(cls, tool_name: str) -> type[BaseTool] | None:
        """Find tool in local sources with priority order"""
        # Search order: manually registered -> user custom
        if tool_name in cls._registered_tools:
            return cls._registered_tools[tool_name]

        # Search local tool sources (framework built-in and user custom)
        for source in ToolRegistryConfig.LOCAL_SEARCH_ORDER:
            if tool_name in cls._discovered_tools[source]:
                return cls._discovered_tools[source][tool_name]

        return None

    @classmethod
    def _load_external_tools(cls, provider: str) -> None:
        """Load external tools for a specific provider"""
        for module_path in ToolRegistryConfig.EXTERNAL_TOOL_PACKAGES:
            if provider in module_path:
                cls._discover_external_tools(module_path)
                break
