"""
Unit tests for Context Configuration Management.

Tests cover configuration parsing, validation, and various input formats
for the type-safe Pydantic configuration system.
"""

import pytest
from pydantic import ValidationError

from langcrew.context.config import (
    AdaptiveWindowConfig,
    CompressionStrategy,
    CompressToolsConfig,
    ContextConfig,
    KeepLastConfig,
    SummaryConfig,
    create_context_config,
)


class TestContextConfig:
    """Test cases for base ContextConfig class."""

    def test_context_config_defaults(self):
        """Test ContextConfig default values."""
        config = ContextConfig()

        # ContextConfig only has pre_model now
        assert config.pre_model is None

    def test_context_config_custom_values(self):
        """Test ContextConfig with custom values."""
        pre_config = KeepLastConfig(keep_last=10)
        config = ContextConfig(pre_model=pre_config)

        # ContextConfig holds pre_model configuration
        assert config.pre_model == pre_config

    def test_context_config_validation(self):
        """Test ContextConfig validation rules."""
        # ContextConfig validation is handled by the pre_model configuration
        # Create valid configurations to ensure they work
        config = ContextConfig()
        assert config.pre_model is None


class TestKeepLastConfig:
    """Test cases for KeepLastConfig class."""

    def test_keep_last_config_defaults(self):
        """Test KeepLastConfig default values."""
        config = KeepLastConfig()

        assert config.strategy == CompressionStrategy.KEEP_LAST
        assert config.keep_last == 25
        assert config.execution_context_interval == 3

    def test_keep_last_config_custom_values(self):
        """Test KeepLastConfig with custom values."""
        config = KeepLastConfig(keep_last=20, execution_context_interval=2)

        assert config.strategy == CompressionStrategy.KEEP_LAST
        assert config.keep_last == 20
        assert config.execution_context_interval == 2

    def test_keep_last_config_validation(self):
        """Test KeepLastConfig validation rules."""
        # keep_last must be positive
        with pytest.raises(ValidationError, match="greater than or equal to 1"):
            KeepLastConfig(keep_last=0)

        with pytest.raises(ValidationError, match="greater than or equal to 1"):
            KeepLastConfig(keep_last=-1)

    def test_keep_last_config_model_dump(self):
        """Test KeepLastConfig model_dump output."""
        config = KeepLastConfig(keep_last=15)
        dump = config.model_dump()

        expected = {
            "execution_context_interval": 3,
            "strategy": CompressionStrategy.KEEP_LAST,
            "keep_last": 15,
        }
        assert dump == expected


class TestCompressToolsConfig:
    """Test cases for CompressToolsConfig class."""

    def test_compress_tools_config_with_custom_compressor(self):
        """Test CompressToolsConfig with custom compressor."""
        from langcrew.context.tool_call_compressor import ToolCallCompressor

        compressor = ToolCallCompressor(tools=["web_tool", "file_tool"], max_length=300)
        config = CompressToolsConfig(compressor=compressor)

        assert config.strategy == CompressionStrategy.COMPRESS_TOOLS
        assert config.compressor == compressor

    def test_compress_tools_config_with_default_compressor(self):
        """Test CompressToolsConfig using DefaultToolCompressor directly."""
        from langcrew.context.tool_call_compressor import ToolCallCompressor

        compressor = ToolCallCompressor(tools=["test_tool"], max_length=100)
        config = CompressToolsConfig(compressor=compressor)

        assert config.strategy == CompressionStrategy.COMPRESS_TOOLS
        assert config.compressor is compressor

    def test_compress_tools_config_validation(self):
        """Test CompressToolsConfig validation rules."""
        # Compressor is required
        with pytest.raises(ValidationError, match="Field required"):
            CompressToolsConfig()

    def test_compress_tools_config_model_dump(self):
        """Test CompressToolsConfig model_dump output."""
        from langcrew.context.tool_call_compressor import ToolCallCompressor

        compressor = ToolCallCompressor(tools=["test_tool"], max_length=200)
        config = CompressToolsConfig(compressor=compressor)
        dump = config.model_dump()

        # Compressor should be excluded from serialization
        expected = {
            "execution_context_interval": 3,
            "strategy": CompressionStrategy.COMPRESS_TOOLS,
            "keep_recent_rounds": 1,  # Default value
        }
        assert dump == expected


class TestSummaryConfig:
    """Test cases for SummaryConfig class."""

    def test_summary_config_defaults(self):
        """Test SummaryConfig default values."""
        config = SummaryConfig()

        assert config.strategy == CompressionStrategy.SUMMARY
        assert config.keep_recent_tokens == 64000
        assert config.llm is None

    def test_summary_config_custom_values(self):
        """Test SummaryConfig with custom values."""
        mock_llm = object()  # Mock LLM object
        config = SummaryConfig(
            keep_recent_tokens=80000, llm=mock_llm, compression_threshold=9000
        )

        assert config.strategy == CompressionStrategy.SUMMARY
        assert config.keep_recent_tokens == 80000
        assert config.llm is mock_llm
        assert config.compression_threshold == 9000

    def test_summary_config_validation(self):
        """Test SummaryConfig validation rules."""
        # keep_recent_tokens must be positive
        with pytest.raises(ValidationError, match="greater than 0"):
            SummaryConfig(keep_recent_tokens=0)

        with pytest.raises(ValidationError, match="greater than 0"):
            SummaryConfig(keep_recent_tokens=-1)

    def test_summary_config_model_dump_excludes_llm(self):
        """Test that SummaryConfig model_dump excludes LLM instance."""
        mock_llm = object()
        config = SummaryConfig(keep_recent_tokens=72000, llm=mock_llm)
        dump = config.model_dump()

        expected = {
            "compression_threshold": 150000,
            "execution_context_interval": 3,
            "strategy": CompressionStrategy.SUMMARY,
            "keep_recent_tokens": 72000,
        }
        assert dump == expected
        assert "llm" not in dump  # Should be excluded


class TestConfigurationEdgeCases:
    """Test edge cases and validation scenarios."""

    def test_base_config_inheritance(self):
        """Test that all config classes properly inherit from BaseConfig."""
        from langcrew.context.config import BaseConfig

        assert issubclass(KeepLastConfig, BaseConfig)
        assert issubclass(CompressToolsConfig, BaseConfig)
        assert issubclass(SummaryConfig, BaseConfig)

    def test_strategy_field_immutability(self):
        """Test that strategy fields are properly set and frozen (immutable)."""
        from langcrew.context.tool_call_compressor import ToolCallCompressor

        keep_config = KeepLastConfig()
        compressor = ToolCallCompressor(tools=[], max_length=100)
        compress_config = CompressToolsConfig(compressor=compressor)
        summary_config = SummaryConfig()

        assert keep_config.strategy == CompressionStrategy.KEEP_LAST
        assert compress_config.strategy == CompressionStrategy.COMPRESS_TOOLS
        assert summary_config.strategy == CompressionStrategy.SUMMARY

        # Test that strategy fields are frozen (cannot be changed)
        with pytest.raises(ValidationError, match="frozen"):
            keep_config.strategy = "something_else"

        with pytest.raises(ValidationError, match="frozen"):
            compress_config.strategy = "something_else"

        with pytest.raises(ValidationError, match="frozen"):
            summary_config.strategy = "something_else"

    def test_field_descriptions(self):
        """Test that fields have proper descriptions for documentation."""
        config = KeepLastConfig()

        # Check that field descriptions are present in the field info
        fields = config.model_fields
        assert fields["execution_context_interval"].description is not None
        assert fields["keep_last"].description is not None

    def test_config_serialization_roundtrip(self):
        """Test that configurations can be serialized and deserialized."""
        from langcrew.context.tool_call_compressor import ToolCallCompressor

        compressor = ToolCallCompressor(tools=["test"], max_length=200)
        original = CompressToolsConfig(compressor=compressor)

        # Serialize to dict (compressor is excluded)
        data = original.model_dump()
        assert "compressor" not in data  # Should be excluded
        assert data["strategy"] == CompressionStrategy.COMPRESS_TOOLS

    def test_invalid_type_raises_validation_error(self):
        """Test that invalid field types raise ValidationError."""
        with pytest.raises(ValidationError):
            KeepLastConfig(keep_last="invalid")  # Should be int

        # CompressToolsConfig with any type is now allowed due to arbitrary_types_allowed=True
        # This is intentional to support Protocol types


class TestConfigFactory:
    """Test cases for configuration factory function."""

    def test_create_keep_last_config(self):
        """Test creating KeepLastConfig from dictionary."""
        config_dict = {
            "strategy": "keep_last",
            "keep_last": 15,
        }

        config = create_context_config(config_dict)

        assert isinstance(config, KeepLastConfig)
        assert config.strategy == CompressionStrategy.KEEP_LAST
        assert config.keep_last == 15

    def test_create_compress_tools_config(self):
        """Test creating CompressToolsConfig from dictionary."""
        from langcrew.context.tool_call_compressor import ToolCallCompressor

        compressor = ToolCallCompressor(
            tools=["web_tool", "search_tool"], max_length=300
        )
        config_dict = {
            "strategy": "compress_tools",
            "compressor": compressor,
        }

        config = create_context_config(config_dict)

        assert isinstance(config, CompressToolsConfig)
        assert config.strategy == CompressionStrategy.COMPRESS_TOOLS
        assert config.compressor is compressor

    def test_create_compress_tools_config_missing_compressor(self):
        """Test creating CompressToolsConfig without compressor raises error."""
        config_dict = {
            "strategy": "compress_tools",
        }

        with pytest.raises(ValidationError, match="Field required"):
            create_context_config(config_dict)

    def test_create_summary_config(self):
        """Test creating SummaryConfig from dictionary."""
        config_dict = {
            "strategy": "summary",
            "keep_recent_tokens": 96000,
            "compression_threshold": 5000,
        }

        config = create_context_config(config_dict)

        assert isinstance(config, SummaryConfig)
        assert config.strategy == CompressionStrategy.SUMMARY
        assert config.keep_recent_tokens == 96000
        assert config.compression_threshold == 5000

    def test_factory_with_empty_dict(self):
        """Test factory returns None for empty dictionary."""
        assert create_context_config({}) is None
        assert create_context_config(None) is None

    def test_factory_with_missing_strategy(self):
        """Test factory raises error for missing strategy."""
        config_dict = {"keep_last": 10}

        with pytest.raises(ValueError, match="missing 'strategy' field"):
            create_context_config(config_dict)

    def test_factory_with_unknown_strategy(self):
        """Test factory raises error for unknown strategy."""
        config_dict = {"strategy": "unknown_strategy"}

        with pytest.raises(ValueError, match="Unknown strategy"):
            create_context_config(config_dict)

    def test_factory_with_invalid_values(self):
        """Test factory raises error for invalid configuration values."""
        config_dict = {
            "strategy": "keep_last",
            "keep_last": -1,  # Invalid: must be >= 1
        }

        with pytest.raises(ValidationError, match="greater than or equal to 1"):
            create_context_config(config_dict)


class TestAdaptiveWindowConfig:
    """Test cases for AdaptiveWindowConfig class."""

    def test_adaptive_window_config_defaults(self):
        """Test AdaptiveWindowConfig default values."""
        config = AdaptiveWindowConfig()

        assert config.strategy == CompressionStrategy.ADAPTIVE_WINDOW
        assert config.window_size == 64000
        assert config.execution_context_interval == 3

    def test_adaptive_window_config_custom_values(self):
        """Test AdaptiveWindowConfig with custom values."""
        config = AdaptiveWindowConfig(window_size=80000, execution_context_interval=2)

        assert config.strategy == CompressionStrategy.ADAPTIVE_WINDOW
        assert config.window_size == 80000
        assert config.execution_context_interval == 2

    def test_adaptive_window_config_validation(self):
        """Test AdaptiveWindowConfig validation rules."""
        # window_size must be positive
        with pytest.raises(ValidationError, match="greater than 0"):
            AdaptiveWindowConfig(window_size=0)

        with pytest.raises(ValidationError, match="greater than 0"):
            AdaptiveWindowConfig(window_size=-1)

    def test_adaptive_window_config_model_dump(self):
        """Test AdaptiveWindowConfig model_dump output."""
        config = AdaptiveWindowConfig(window_size=60000)
        dump = config.model_dump()

        expected = {
            "strategy": CompressionStrategy.ADAPTIVE_WINDOW,
            "window_size": 60000,
            "execution_context_interval": 3,
        }
        assert dump == expected

    def test_adaptive_window_config_strategy_immutable(self):
        """Test that strategy field is frozen (immutable)."""
        config = AdaptiveWindowConfig()

        with pytest.raises(ValidationError, match="frozen"):
            config.strategy = "something_else"

    def test_create_adaptive_window_config(self):
        """Test creating AdaptiveWindowConfig from dictionary."""
        config_dict = {
            "strategy": "adaptive_window",
            "window_size": 70000,
        }

        config = create_context_config(config_dict)

        assert isinstance(config, AdaptiveWindowConfig)
        assert config.strategy == CompressionStrategy.ADAPTIVE_WINDOW
        assert config.window_size == 70000

    def test_create_adaptive_window_config_with_defaults(self):
        """Test creating AdaptiveWindowConfig with default values."""
        config_dict = {
            "strategy": "adaptive_window",
        }

        config = create_context_config(config_dict)

        assert isinstance(config, AdaptiveWindowConfig)
        assert config.window_size == 64000  # Default

    def test_create_adaptive_window_config_invalid_values(self):
        """Test factory raises error for invalid values."""
        config_dict = {
            "strategy": "adaptive_window",
            "window_size": -1000,  # Invalid
        }

        with pytest.raises(ValidationError, match="greater than 0"):
            create_context_config(config_dict)

    def test_adaptive_window_config_description(self):
        """Test that configuration has proper field descriptions."""
        fields = AdaptiveWindowConfig.model_fields

        assert "window_size" in fields
        assert fields["window_size"].description is not None

        # Check that description contains guidance
        window_desc = fields["window_size"].description
        assert "Token budget for context window" in window_desc
