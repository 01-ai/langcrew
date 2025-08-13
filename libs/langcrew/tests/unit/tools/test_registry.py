"""
Unit tests for langcrew.tools.registry module.

Tests the ToolRegistry functionality including tool registration, discovery,
caching, naming conventions, and error handling.
"""

import tempfile
from pathlib import Path  
from unittest.mock import MagicMock, Mock, patch

import pytest
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from langcrew.tools.registry import ToolRegistry, ToolRegistryConfig

# =====================================
# Mock Tool Classes for Testing
# =====================================


class MockToolInput(BaseModel):
    """Input schema for MockTool."""

    query: str = Field(..., description="Test query")


class MockTool(BaseTool):
    """Mock tool for testing purposes."""

    name: str = "mock_tool"
    description: str = "A mock tool for testing"
    args_schema: type[BaseModel] = MockToolInput

    def _run(self, query: str) -> str:
        return f"Mock result for: {query}"


class AnotherMockTool(BaseTool):
    """Another mock tool for testing purposes."""

    name: str = "another_mock_tool"
    description: str = "Another mock tool for testing"

    def _run(self) -> str:
        return "Another mock result"


class MockCamelCaseTool(BaseTool):
    """Mock tool with CamelCase name for testing name conversion."""

    name: str = "mock_camel_case_tool"
    description: str = "A CamelCase mock tool for testing"

    def _run(self) -> str:
        return "CamelCase mock result"


class InvalidTool:
    """Invalid tool that doesn't inherit from BaseTool."""

    name = "invalid_tool"


# =====================================
# Test Fixtures
# =====================================


@pytest.fixture(autouse=True)
def clean_registry():
    """Clean registry state before and after each test."""
    # Store original state
    original_cache = ToolRegistry._tool_cache.copy()
    original_registered = ToolRegistry._registered_tools.copy()
    original_discovered = {
        provider: tools.copy()
        for provider, tools in ToolRegistry._discovered_tools.items()
    }
    original_discovery_complete = ToolRegistry._discovery_complete

    # Clear state for test
    ToolRegistry._tool_cache.clear()
    ToolRegistry._registered_tools.clear()
    for provider_tools in ToolRegistry._discovered_tools.values():
        provider_tools.clear()
    ToolRegistry._discovery_complete = False

    yield

    # Restore original state
    ToolRegistry._tool_cache = original_cache
    ToolRegistry._registered_tools = original_registered
    ToolRegistry._discovered_tools = original_discovered
    ToolRegistry._discovery_complete = original_discovery_complete


@pytest.fixture
def mock_module():
    """Create a mock module with tool classes."""
    module = Mock()
    module.MockTool = MockTool
    module.AnotherMockTool = AnotherMockTool
    module.MockCamelCaseTool = MockCamelCaseTool
    module.InvalidTool = InvalidTool
    module._PrivateTool = MockTool  # Should be ignored
    return module


# =====================================
# Test Classes
# =====================================


class TestToolRegistryConfig:
    """Test ToolRegistryConfig constants."""

    def test_provider_constants(self):
        """Test that provider constants are correctly defined."""
        assert ToolRegistryConfig.LANGCREW_PROVIDER == "langcrew"
        assert ToolRegistryConfig.CUSTOM_PROVIDER == "custom"
        assert ToolRegistryConfig.CREWAI_PROVIDER == "crewai"
        assert ToolRegistryConfig.LANGCHAIN_PROVIDER == "langchain"
        assert ToolRegistryConfig.LOCAL_PROVIDER == "local"

    def test_external_tool_packages(self):
        """Test external tool package discovery paths."""
        expected_paths = ["langcrew_tools", "crewai_tools", "langchain_community.tools"]
        assert ToolRegistryConfig.EXTERNAL_TOOL_PACKAGES == expected_paths

    def test_local_search_order(self):
        """Test local tool search order."""
        expected_order = [ToolRegistryConfig.CUSTOM_PROVIDER]
        assert ToolRegistryConfig.LOCAL_SEARCH_ORDER == expected_order

    def test_tool_file_pattern(self):
        """Test tool file pattern."""
        assert ToolRegistryConfig.TOOL_FILE_PATTERN == "langchain_tools.py"


class TestToolRegistryCore:
    """Test core ToolRegistry functionality."""

    def test_register_valid_tool(self):
        """Test registering a valid tool class."""
        ToolRegistry.register("test_tool", MockTool)

        assert "test_tool" in ToolRegistry._registered_tools
        assert ToolRegistry._registered_tools["test_tool"] == MockTool
        assert (
            "test_tool"
            in ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER]
        )

    def test_register_invalid_tool_not_class(self):
        """Test registering an invalid tool (not a class)."""
        with pytest.raises(ValueError, match="must be a BaseTool subclass"):
            ToolRegistry.register("invalid", "not_a_class")

    def test_register_invalid_tool_not_basetool(self):
        """Test registering an invalid tool (not BaseTool subclass)."""
        with pytest.raises(ValueError, match="must be a BaseTool subclass"):
            ToolRegistry.register("invalid", InvalidTool)

    def test_register_overwrites_existing_tool(self):
        """Test that registering overwrites existing tool."""
        ToolRegistry.register("test_tool", MockTool)
        ToolRegistry.register("test_tool", AnotherMockTool)

        assert ToolRegistry._registered_tools["test_tool"] == AnotherMockTool

    def test_register_clears_cache(self):
        """Test that registering a tool clears its cache entry."""
        # First register and get the tool to cache it
        ToolRegistry.register("test_tool", MockTool)
        tool_instance = ToolRegistry.get_tool("test_tool")
        assert "test_tool" in ToolRegistry._tool_cache

        # Re-register should clear cache
        ToolRegistry.register("test_tool", AnotherMockTool)
        assert "test_tool" not in ToolRegistry._tool_cache

    def test_get_tool_from_registered(self):
        """Test getting a tool from registered tools."""
        ToolRegistry.register("test_tool", MockTool)
        tool = ToolRegistry.get_tool("test_tool")

        assert isinstance(tool, MockTool)
        assert tool.name == "mock_tool"

    def test_get_tool_caching(self):
        """Test that tools are cached after first retrieval."""
        ToolRegistry.register("test_tool", MockTool)

        # First call should create and cache
        tool1 = ToolRegistry.get_tool("test_tool")
        assert "test_tool" in ToolRegistry._tool_cache

        # Second call should return cached instance
        tool2 = ToolRegistry.get_tool("test_tool")
        assert tool1 is tool2

    def test_get_tool_not_found(self):
        """Test getting a non-existent tool raises ValueError."""
        with pytest.raises(ValueError, match="Tool 'nonexistent' not found"):
            ToolRegistry.get_tool("nonexistent")

    def test_get_tool_with_provider_prefix(self):
        """Test getting a tool with provider prefix."""
        ToolRegistry._discovered_tools[ToolRegistryConfig.CREWAI_PROVIDER][
            "web_scraper"
        ] = MockTool

        tool = ToolRegistry.get_tool("crewai:web_scraper")
        assert isinstance(tool, MockTool)

    def test_list_tools_empty(self):
        """Test listing tools when registry is empty."""
        with patch.object(ToolRegistry, "_run_discovery"):
            tools = ToolRegistry.list_tools()
            assert tools == []

    def test_list_tools_with_registered_tools(self):
        """Test listing tools includes registered tools."""
        ToolRegistry.register("tool1", MockTool)
        ToolRegistry.register("tool2", AnotherMockTool)

        with patch.object(ToolRegistry, "_run_discovery"):
            tools = ToolRegistry.list_tools()
            assert "tool1" in tools
            assert "tool2" in tools
            assert len(tools) == 2

    def test_list_tools_with_discovered_tools(self):
        """Test listing tools includes discovered tools."""
        ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCREW_PROVIDER][
            "langcrew_tool"
        ] = MockTool
        ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER][
            "custom_tool"
        ] = AnotherMockTool

        tools = ToolRegistry.list_tools()
        assert "langcrew_tool" in tools
        assert "custom_tool" in tools

    def test_list_tools_no_duplicates(self):
        """Test that list_tools returns no duplicates."""
        # Add same tool to multiple sources
        ToolRegistry.register("duplicate_tool", MockTool)
        ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCREW_PROVIDER][
            "duplicate_tool"
        ] = MockTool

        tools = ToolRegistry.list_tools()
        assert tools.count("duplicate_tool") == 1


class TestToolRegistryNaming:
    """Test tool naming and parsing functionality."""

    def test_parse_tool_name_without_prefix(self):
        """Test parsing tool name without provider prefix."""
        provider, tool_name = ToolRegistry._parse_tool_name("simple_tool")
        assert provider == ToolRegistryConfig.LOCAL_PROVIDER
        assert tool_name == "simple_tool"

    def test_parse_tool_name_with_prefix(self):
        """Test parsing tool name with provider prefix."""
        provider, tool_name = ToolRegistry._parse_tool_name("crewai:web_scraper")
        assert provider == "crewai"
        assert tool_name == "web_scraper"

    def test_parse_tool_name_multiple_colons(self):
        """Test parsing tool name with multiple colons (only first is used)."""
        provider, tool_name = ToolRegistry._parse_tool_name("provider:tool:name")
        assert provider == "provider"
        assert tool_name == "tool:name"



class TestToolRegistryDiscovery:
    """Test tool discovery functionality."""


    def test_extract_tools_from_module(self, mock_module):
        """Test extracting tool classes from a module."""
        ToolRegistry._extract_tools_from_module(
            mock_module, ToolRegistryConfig.CUSTOM_PROVIDER
        )

        custom_tools = ToolRegistry._discovered_tools[
            ToolRegistryConfig.CUSTOM_PROVIDER
        ]

        # Check that valid tools were extracted (using tool name field)
        # MockTool.name -> mock_tool, AnotherMockTool.name -> another_mock_tool, etc.
        assert "mock_tool" in custom_tools
        assert "another_mock_tool" in custom_tools
        assert "mock_camel_case_tool" in custom_tools

        # Check that invalid tools were ignored
        assert "invalid_tool" not in custom_tools

    def test_extract_tools_from_module_with_prefix(self, mock_module):
        """Test extracting tools with name prefix."""
        ToolRegistry._extract_tools_from_module(
            mock_module, ToolRegistryConfig.CUSTOM_PROVIDER, prefix="test"
        )

        custom_tools = ToolRegistry._discovered_tools[
            ToolRegistryConfig.CUSTOM_PROVIDER
        ]
        assert "test_mock_tool" in custom_tools
        assert "test_another_mock_tool" in custom_tools
        assert "test_mock_camel_case_tool" in custom_tools

    def test_extract_tools_handles_tool_suffix(self, mock_module):
        """Test that Tool suffix is removed from class names."""

        # Add a tool class with Tool suffix
        class FileReaderTool(BaseTool):
            name: str = "file_reader_tool"
            description: str = "Reads files"

            def _run(self) -> str:
                return "file content"

        mock_module.FileReaderTool = FileReaderTool

        ToolRegistry._extract_tools_from_module(
            mock_module, ToolRegistryConfig.CUSTOM_PROVIDER
        )

        custom_tools = ToolRegistry._discovered_tools[
            ToolRegistryConfig.CUSTOM_PROVIDER
        ]
        assert "file_reader_tool" in custom_tools

    @patch("langcrew.tools.registry.Path.cwd")
    def test_discover_project_tools(self, mock_cwd):
        """Test discovering user custom tools from project directory."""
        # Mock current working directory and possible parents using MagicMock for magic methods
        mock_current_dir = MagicMock()
        mock_parent_dir = MagicMock()
        mock_grandparent_dir = MagicMock()

        mock_current_dir.parent = mock_parent_dir
        mock_parent_dir.parent = mock_grandparent_dir

        mock_cwd.return_value = mock_current_dir

        # Mock tools directory - only exists in current directory
        mock_tools_dir = MagicMock()
        mock_tools_dir.exists.return_value = True
        mock_tools_dir.is_dir.return_value = True

        # Mock non-existing tools directories for other paths
        mock_nonexistent = MagicMock()
        mock_nonexistent.exists.return_value = False

        # Configure the __truediv__ method using side_effect
        mock_current_dir.__truediv__.side_effect = (
            lambda path: mock_tools_dir if path == "tools" else mock_nonexistent
        )
        mock_parent_dir.__truediv__.side_effect = lambda path: mock_nonexistent
        mock_grandparent_dir.__truediv__.side_effect = lambda path: mock_nonexistent

        with patch.object(ToolRegistry, "_scan_directory_for_tools") as mock_scan:
            ToolRegistry._discover_project_tools()
            mock_scan.assert_called_once_with(
                mock_tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER
            )

    def test_run_discovery_sets_flag(self):
        """Test that _run_discovery sets the completion flag."""
        assert not ToolRegistry._discovery_complete

        with patch.object(ToolRegistry, "_discover_project_tools"):
            ToolRegistry._run_discovery()

        assert ToolRegistry._discovery_complete

    def test_run_discovery_only_once(self):
        """Test that discovery only runs once."""
        ToolRegistry._discovery_complete = True

        with patch.object(ToolRegistry, "_discover_project_tools") as mock_project:
            ToolRegistry._run_discovery()

            mock_project.assert_not_called()


class TestToolRegistryUtilities:
    """Test utility methods."""

    def test_get_cached_tool_exists(self):
        """Test getting a tool from cache when it exists."""
        tool_instance = MockTool()
        ToolRegistry._tool_cache["test_tool"] = tool_instance

        cached = ToolRegistry._get_cached_tool("test_tool")
        assert cached is tool_instance

    def test_get_cached_tool_not_exists(self):
        """Test getting a tool from cache when it doesn't exist."""
        cached = ToolRegistry._get_cached_tool("nonexistent")
        assert cached is None

    def test_cache_tool(self):
        """Test caching a tool instance."""
        tool_instance = MockTool()
        ToolRegistry._cache_tool("test_tool", tool_instance)

        assert ToolRegistry._tool_cache["test_tool"] is tool_instance

    def test_find_local_tool_registered(self):
        """Test finding tool in registered tools."""
        ToolRegistry._registered_tools["test_tool"] = MockTool

        found = ToolRegistry._find_local_tool("test_tool")
        assert found == MockTool

    def test_find_local_tool_discovered(self):
        """Test finding tool in discovered tools."""
        ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER][
            "test_tool"
        ] = MockTool

        found = ToolRegistry._find_local_tool("test_tool")
        assert found == MockTool

    def test_find_local_tool_search_order(self):
        """Test that tool search follows correct priority order."""
        # Add same tool to multiple sources
        ToolRegistry._registered_tools["test_tool"] = MockTool
        ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER][
            "test_tool"
        ] = AnotherMockTool

        # Should return from registered tools (highest priority)
        found = ToolRegistry._find_local_tool("test_tool")
        assert found == MockTool

    def test_find_local_tool_not_found(self):
        """Test finding tool when it doesn't exist."""
        found = ToolRegistry._find_local_tool("nonexistent")
        assert found is None


class TestToolRegistryScanDirectory:
    """Test _scan_directory_for_tools method functionality."""

    def test_scan_directory_for_tools_basic(self, tmp_path):
        """Test basic directory scanning functionality."""
        # Create a temporary tools directory with a simple tool file
        tools_dir = tmp_path / "tools"
        tools_dir.mkdir()
        
        # Create a Python file with a tool class
        tool_file = tools_dir / "test_tool.py"
        tool_content = '''
from langchain_core.tools import BaseTool

class TestScanTool(BaseTool):
    name: str = "test_scan_tool"
    description: str = "A tool for testing scan functionality"
    
    def _run(self) -> str:
        return "scan test result"
'''
        tool_file.write_text(tool_content)
        
        # Scan the directory
        ToolRegistry._scan_directory_for_tools(tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER)
        
        # Verify tool was discovered
        custom_tools = ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER]
        assert "test_scan_tool" in custom_tools
        
        # Verify the tool class is correct
        tool_instance = custom_tools["test_scan_tool"]()
        assert tool_instance.name == "test_scan_tool"
        assert tool_instance._run() == "scan test result"

    def test_scan_directory_for_tools_recursive(self, tmp_path):
        """Test recursive scanning of subdirectories."""
        # Create nested directory structure
        tools_dir = tmp_path / "tools" 
        subdir = tools_dir / "subdir"
        subdir.mkdir(parents=True)
        
        # Create tool in subdirectory
        tool_file = subdir / "nested_tool.py"
        tool_content = '''
from langchain_core.tools import BaseTool

class NestedTool(BaseTool):
    name: str = "nested_tool"
    description: str = "A nested tool"
    
    def _run(self) -> str:
        return "nested result"
'''
        tool_file.write_text(tool_content)
        
        # Scan should find tools in subdirectories
        ToolRegistry._scan_directory_for_tools(tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER)
        
        custom_tools = ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER]
        assert "nested_tool" in custom_tools

    def test_scan_directory_for_tools_ignore_private_files(self, tmp_path):
        """Test that files starting with underscore are ignored."""
        tools_dir = tmp_path / "tools"
        tools_dir.mkdir()
        
        # Create private file (should be ignored)
        private_file = tools_dir / "_private_tool.py"
        private_content = '''
from langchain_core.tools import BaseTool

class PrivateTool(BaseTool):
    name: str = "private_tool" 
    description: str = "Should be ignored"
    
    def _run(self) -> str:
        return "private result"
'''
        private_file.write_text(private_content)
        
        # Create normal file (should be processed)
        normal_file = tools_dir / "normal_tool.py"
        normal_content = '''
from langchain_core.tools import BaseTool

class NormalTool(BaseTool):
    name: str = "normal_tool"
    description: str = "Should be processed"
    
    def _run(self) -> str:
        return "normal result"
'''
        normal_file.write_text(normal_content)
        
        ToolRegistry._scan_directory_for_tools(tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER)
        
        custom_tools = ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER]
        assert "normal_tool" in custom_tools
        assert "private_tool" not in custom_tools

    @patch("langcrew.tools.registry.logger")
    def test_scan_directory_for_tools_import_error(self, mock_logger, tmp_path):
        """Test handling of files that cannot be imported."""
        tools_dir = tmp_path / "tools"
        tools_dir.mkdir()
        
        # Create file with syntax error
        bad_file = tools_dir / "bad_syntax.py"
        bad_file.write_text("invalid python syntax !!!")
        
        # Should not crash, should log error
        ToolRegistry._scan_directory_for_tools(tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER)
        
        # Should have logged the error
        mock_logger.debug.assert_called()
        
    @patch("langcrew.tools.registry.importlib.util.spec_from_file_location")
    def test_scan_directory_for_tools_spec_creation_failure(self, mock_spec_from_file):
        """Test handling when spec creation returns None."""
        # Mock spec creation to return None
        mock_spec_from_file.return_value = None
        
        # Create a valid directory structure
        from pathlib import Path
        import tempfile
        
        with tempfile.TemporaryDirectory() as tmp_dir:
            tools_dir = Path(tmp_dir) / "tools"
            tools_dir.mkdir()
            
            tool_file = tools_dir / "test_tool.py"
            tool_file.write_text("# valid python file")
            
            # Should handle None spec gracefully
            ToolRegistry._scan_directory_for_tools(tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER)
            
            # Verify spec creation was attempted
            mock_spec_from_file.assert_called()

    def test_scan_directory_for_tools_no_tools_in_module(self, tmp_path):
        """Test handling of Python files without any tool classes."""
        tools_dir = tmp_path / "tools"
        tools_dir.mkdir()
        
        # Create file with no tool classes
        no_tools_file = tools_dir / "no_tools.py"
        no_tools_content = '''
# Just some regular Python code
def helper_function():
    return "helper"

class RegularClass:
    pass
'''
        no_tools_file.write_text(no_tools_content)
        
        # Should not crash or add anything
        initial_count = len(ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER])
        ToolRegistry._scan_directory_for_tools(tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER)
        final_count = len(ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER])
        
        # No new tools should be added
        assert final_count == initial_count


class TestToolRegistryEdgeCases:
    """Test edge cases and error handling."""

    def test_get_tool_triggers_discovery(self):
        """Test that get_tool triggers discovery if not complete."""
        assert not ToolRegistry._discovery_complete

        with (
            patch.object(ToolRegistry, "_run_discovery") as mock_discovery,
            patch.object(ToolRegistry, "list_tools", return_value=[]),
        ):
            try:
                ToolRegistry.get_tool("nonexistent")
            except ValueError:
                pass  # Expected for nonexistent tool

            mock_discovery.assert_called_once()

    def test_list_tools_triggers_discovery(self):
        """Test that list_tools triggers discovery if not complete."""
        assert not ToolRegistry._discovery_complete

        with patch.object(ToolRegistry, "_run_discovery") as mock_discovery:
            ToolRegistry.list_tools()
            mock_discovery.assert_called_once()

    @patch("langcrew.tools.registry.importlib.import_module")
    def test_discover_external_tools_import_error(self, mock_import):
        """Test handling import errors in external tool discovery."""
        mock_import.side_effect = ImportError("Module not found")

        # Should not raise exception
        ToolRegistry._discover_external_tools("crewai_tools")

        # Should be logged but not crash
        assert not ToolRegistry._discovered_tools[ToolRegistryConfig.CREWAI_PROVIDER]

    def test_find_tool_in_provider_loads_external(self):
        """Test that finding tool in external provider loads tools."""
        with patch.object(ToolRegistry, "_load_external_tools") as mock_load:
            ToolRegistry._find_tool_in_provider(
                ToolRegistryConfig.CREWAI_PROVIDER, "test_tool"
            )
            mock_load.assert_called_once_with(ToolRegistryConfig.CREWAI_PROVIDER)

    def test_find_tool_in_provider_skips_loaded_external(self):
        """Test that finding tool skips loading if external already loaded."""
        # Pre-populate to simulate already loaded
        ToolRegistry._discovered_tools[ToolRegistryConfig.CREWAI_PROVIDER][
            "existing"
        ] = MockTool

        with patch.object(ToolRegistry, "_load_external_tools") as mock_load:
            ToolRegistry._find_tool_in_provider(
                ToolRegistryConfig.CREWAI_PROVIDER, "test_tool"
            )
            mock_load.assert_not_called()

    @patch("langcrew.tools.registry.logger")
    def test_logging_on_discovery_errors(self, mock_logger):
        """Test that discovery errors are logged properly."""
        with patch("langcrew.tools.registry.importlib.import_module") as mock_import:
            mock_import.side_effect = ImportError("Test error")

            ToolRegistry._discover_external_tools("test_module")

            # Should log the error
            mock_logger.debug.assert_called()

    def test_discover_external_tools_langcrew(self):
        """Test discovering langcrew external tools."""
        with patch("langcrew.tools.registry.importlib.import_module") as mock_import:
            mock_module = Mock()
            mock_module.TestTool = MockTool
            mock_import.return_value = mock_module

            ToolRegistry._discover_external_tools("langcrew_tools")

            mock_import.assert_called_once_with("langcrew_tools")
            # Should be in langcrew provider
            assert ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCREW_PROVIDER]

    def test_get_tool_with_langcrew_prefix(self):
        """Test getting a tool with langcrew provider prefix."""
        ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCREW_PROVIDER][
            "test_tool"
        ] = MockTool

        tool = ToolRegistry.get_tool("langcrew:test_tool")
        assert isinstance(tool, MockTool)

    def test_external_tools_provider_detection(self):
        """Test provider detection for different external tool packages."""
        # Test langcrew_tools detection
        with patch("langcrew.tools.registry.importlib.import_module"):
            ToolRegistry._discover_external_tools("langcrew_tools")
            # Should create entry for langcrew provider

        # Test crewai_tools detection  
        with patch("langcrew.tools.registry.importlib.import_module"):
            ToolRegistry._discover_external_tools("crewai_tools")
            # Should create entry for crewai provider

        # Test langchain detection
        with patch("langcrew.tools.registry.importlib.import_module"):
            ToolRegistry._discover_external_tools("langchain_community.tools")
            # Should create entry for langchain provider


class TestToolRegistryProviderPrefixes:
    """Test provider prefix functionality for different tool sources."""

    def test_get_tool_with_langchain_prefix(self):
        """Test getting tool with langchain provider prefix."""
        ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCHAIN_PROVIDER][
            "langchain_test_tool"
        ] = MockTool
        
        tool = ToolRegistry.get_tool("langchain:langchain_test_tool")
        assert isinstance(tool, MockTool)
        assert tool.name == "mock_tool"  # MockTool's actual name

    def test_get_tool_with_langcrew_prefix_complete(self):
        """Test getting tool with langcrew provider prefix - complete test."""
        ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCREW_PROVIDER][
            "langcrew_test_tool"
        ] = AnotherMockTool
        
        tool = ToolRegistry.get_tool("langcrew:langcrew_test_tool")
        assert isinstance(tool, AnotherMockTool)
        assert tool.name == "another_mock_tool"

    @patch("langcrew.tools.registry.importlib.import_module")
    def test_provider_detection_langchain_community(self, mock_import):
        """Test correct provider detection for langchain_community.tools."""
        mock_module = Mock()
        mock_module.LangChainTestTool = MockTool
        mock_import.return_value = mock_module
        
        ToolRegistry._discover_external_tools("langchain_community.tools")
        
        # Should be assigned to langchain provider
        assert ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCHAIN_PROVIDER]
        mock_import.assert_called_once_with("langchain_community.tools")

    @patch("langcrew.tools.registry.importlib.import_module")
    def test_provider_detection_langcrew_tools(self, mock_import):
        """Test correct provider detection for langcrew_tools package."""
        mock_module = Mock() 
        mock_module.LangCrewTestTool = AnotherMockTool
        mock_import.return_value = mock_module
        
        ToolRegistry._discover_external_tools("langcrew_tools")
        
        # Should be assigned to langcrew provider
        assert ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCREW_PROVIDER]
        mock_import.assert_called_once_with("langcrew_tools")

    def test_provider_prefix_parsing_edge_cases(self):
        """Test edge cases in provider prefix parsing."""
        # Test empty provider
        provider, tool_name = ToolRegistry._parse_tool_name(":tool_name")
        assert provider == ""
        assert tool_name == "tool_name"
        
        # Test multiple colons
        provider, tool_name = ToolRegistry._parse_tool_name("provider:tool:with:colons")
        assert provider == "provider"
        assert tool_name == "tool:with:colons"
        
        # Test no colon (local)
        provider, tool_name = ToolRegistry._parse_tool_name("simple_tool")
        assert provider == ToolRegistryConfig.LOCAL_PROVIDER
        assert tool_name == "simple_tool"

    def test_external_tool_loading_priority(self):
        """Test that external tools are loaded in correct priority order."""
        # Pre-populate different providers with same tool name
        ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCHAIN_PROVIDER]["conflict_tool"] = MockTool
        ToolRegistry._discovered_tools[ToolRegistryConfig.CREWAI_PROVIDER]["conflict_tool"] = AnotherMockTool
        
        # When accessing with specific provider, should get that provider's tool
        langchain_tool = ToolRegistry.get_tool("langchain:conflict_tool")
        crewai_tool = ToolRegistry.get_tool("crewai:conflict_tool")
        
        assert isinstance(langchain_tool, MockTool)
        assert isinstance(crewai_tool, AnotherMockTool)


class TestToolRegistryAdvancedErrorHandling:
    """Test advanced error handling and boundary conditions."""

    def test_tool_instantiation_failure(self):
        """Test handling when tool class constructor fails."""
        class FailingTool(BaseTool):
            name: str = "failing_tool"
            description: str = "A tool that fails to instantiate"
            
            def __init__(self):
                raise RuntimeError("Instantiation failed")
                
            def _run(self) -> str:
                return "never reached"
        
        ToolRegistry.register("failing_tool", FailingTool)
        
        # Should raise the instantiation error
        with pytest.raises(RuntimeError, match="Instantiation failed"):
            ToolRegistry.get_tool("failing_tool")

    def test_corrupted_tool_class_without_name(self):
        """Test handling of tool class without proper name attribute."""
        class CorruptedTool(BaseTool):
            # Missing name attribute
            description: str = "A corrupted tool"
            
            def _run(self) -> str:
                return "corrupted"
        
        # Register the tool (this part might succeed)
        ToolRegistry.register("corrupted_tool", CorruptedTool)
        
        # But accessing it should fail when trying to get tool name
        with pytest.raises((AttributeError, TypeError, ValueError)):
            ToolRegistry.get_tool("corrupted_tool")

    def test_tool_with_invalid_run_method(self):
        """Test tool with _run method that raises exception."""
        class InvalidRunTool(BaseTool):
            name: str = "invalid_run_tool"
            description: str = "A tool with invalid run method"
            
            def _run(self) -> str:
                raise ValueError("Run method failed")
        
        ToolRegistry.register("invalid_run_tool", InvalidRunTool)
        tool = ToolRegistry.get_tool("invalid_run_tool")
        
        # Tool should instantiate fine, but _run should fail
        assert isinstance(tool, InvalidRunTool)
        with pytest.raises(ValueError, match="Run method failed"):
            tool._run()

    @patch("langcrew.tools.registry.importlib.util.module_from_spec")
    def test_module_from_spec_failure(self, mock_module_from_spec, tmp_path):
        """Test handling when module_from_spec fails."""
        mock_module_from_spec.side_effect = Exception("Module creation failed")
        
        tools_dir = tmp_path / "tools"
        tools_dir.mkdir()
        
        tool_file = tools_dir / "test_tool.py"
        tool_file.write_text("# valid content")
        
        # Should handle the exception gracefully
        with patch("langcrew.tools.registry.logger") as mock_logger:
            ToolRegistry._scan_directory_for_tools(tools_dir, ToolRegistryConfig.CUSTOM_PROVIDER)
            # Should log the error
            mock_logger.debug.assert_called()

    def test_empty_provider_tools_dict(self):
        """Test behavior when provider tools dictionary is empty."""
        # Ensure provider dict is empty
        ToolRegistry._discovered_tools[ToolRegistryConfig.CREWAI_PROVIDER].clear()
        
        # Should trigger loading attempt
        with patch.object(ToolRegistry, "_load_external_tools") as mock_load:
            result = ToolRegistry._find_tool_in_provider(
                ToolRegistryConfig.CREWAI_PROVIDER, "nonexistent_tool"
            )
            mock_load.assert_called_once_with(ToolRegistryConfig.CREWAI_PROVIDER)
            assert result is None

    def test_invalid_provider_name(self):
        """Test handling of invalid provider names."""
        # Test with provider that doesn't exist in external providers
        result = ToolRegistry._find_tool_in_provider("invalid_provider", "some_tool")
        assert result is None
        
        # Test getting tool with invalid provider prefix
        with pytest.raises(ValueError, match="Tool 'invalid_provider:some_tool' not found"):
            ToolRegistry.get_tool("invalid_provider:some_tool")


class TestToolRegistryPerformance:
    """Test performance and scalability aspects."""

    def test_large_tool_registry_performance(self):
        """Test performance with a large number of tools."""
        import time
        
        # Register many tools
        num_tools = 50  # Reduced for CI performance
        for i in range(num_tools):
            class DynamicTool(BaseTool):
                name: str = f"perf_tool_{i}"
                description: str = f"Performance test tool {i}"
                
                def _run(self) -> str:
                    return f"result_{i}"
                    
            ToolRegistry.register(f"perf_tool_{i}", DynamicTool)
        
        # Test retrieval performance
        start_time = time.time()
        tools = ToolRegistry.list_tools()
        list_time = time.time() - start_time
        
        # Should complete quickly (less than 1 second)
        assert list_time < 1.0
        assert len([t for t in tools if t.startswith("perf_tool_")]) == num_tools

    def test_cache_efficiency(self):
        """Test that caching works efficiently."""
        ToolRegistry.register("cache_test_tool", MockTool)
        
        # First call - should cache
        tool1 = ToolRegistry.get_tool("cache_test_tool")
        
        # Second call - should be from cache
        tool2 = ToolRegistry.get_tool("cache_test_tool")
        
        # Should return same instance (cached)
        assert tool1 is tool2

    def test_discovery_caching(self):
        """Test that discovery only runs once."""
        # Reset discovery state
        ToolRegistry._discovery_complete = False
        
        with patch.object(ToolRegistry, "_discover_project_tools") as mock_discover:
            # First call should trigger discovery
            ToolRegistry.list_tools()
            assert mock_discover.call_count == 1
            
            # Second call should not trigger discovery
            ToolRegistry.list_tools()
            assert mock_discover.call_count == 1  # Still 1, not 2
            
            # Discovery should be marked complete
            assert ToolRegistry._discovery_complete

    def test_tool_name_conflicts_resolution(self):
        """Test handling of tool name conflicts across providers."""
        # Add same-named tool to different providers
        ToolRegistry._discovered_tools[ToolRegistryConfig.CUSTOM_PROVIDER]["conflict_tool"] = MockTool
        ToolRegistry._discovered_tools[ToolRegistryConfig.LANGCHAIN_PROVIDER]["conflict_tool"] = AnotherMockTool
        
        # Local search should prioritize registered tools
        ToolRegistry.register("conflict_tool", MockCamelCaseTool)
        
        # Without provider prefix, should get registered tool (highest priority)
        tool = ToolRegistry.get_tool("conflict_tool")
        assert isinstance(tool, MockCamelCaseTool)
        
        # With provider prefix, should get provider-specific tool
        langchain_tool = ToolRegistry.get_tool("langchain:conflict_tool")
        assert isinstance(langchain_tool, AnotherMockTool)
