"""
Unit tests for langcrew.llm_factory module.

Tests core functionality: provider creation, API key handling, and error cases.
"""

import os
from unittest.mock import Mock, patch

import pytest

from langcrew.llm_factory import DEFAULT_TEMPERATURE, LLMFactory


def test_default_temperature_value():
    """Test that DEFAULT_TEMPERATURE is set correctly."""
    assert DEFAULT_TEMPERATURE == 0.0


# ============================================================================
# OpenAI Provider Tests
# ============================================================================


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_openai_llm_basic(mock_chat_openai):
    """Test creating OpenAI LLM with basic configuration."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {"provider": "openai", "model": "gpt-4", "temperature": 0.5}

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    mock_chat_openai.assert_called_once_with(
        model="gpt-4",
        api_key="test_key",
        base_url=None,
        temperature=0.5,
        max_tokens=8192,
        max_retries=1,
        timeout=180.0,
        streaming=True,
        openai_proxy=None,
    )


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_openai_llm_omits_temperature_when_none(mock_chat_openai):
    """Test temperature=None omits the temperature constructor argument."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {"provider": "openai", "model": "gpt-4", "temperature": None}

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    assert "temperature" not in mock_chat_openai.call_args.kwargs


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_openai_llm_defaults_temperature_when_omitted(mock_chat_openai):
    """Test omitted temperature still uses the factory default."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {"provider": "openai", "model": "gpt-4"}

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    assert mock_chat_openai.call_args.kwargs["temperature"] == DEFAULT_TEMPERATURE


@patch("langchain_openai.ChatOpenAI")
def test_create_openai_llm_with_api_key_in_config(mock_chat_openai):
    """Test that config api_key is used when provided."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "openai",
        "model": "gpt-4",
        "api_key": "config_api_key",
        "temperature": 0.5,
    }

    with patch.dict(os.environ, {}, clear=True):
        result = LLMFactory.create_llm(config)

        assert result == mock_llm
        mock_chat_openai.assert_called_once_with(
            model="gpt-4",
            api_key="config_api_key",
            base_url=None,
            temperature=0.5,
            max_tokens=8192,
            max_retries=1,
            timeout=180.0,
            streaming=True,
            openai_proxy=None,
        )


@patch.dict(os.environ, {"OPENAI_API_KEY": "env_api_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_openai_llm_config_api_key_priority(mock_chat_openai):
    """Test that config api_key takes priority over environment variable."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "openai",
        "model": "gpt-4",
        "api_key": "config_api_key",
        "temperature": 0.5,
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    # Should use config api_key, not env
    assert mock_chat_openai.call_args[1]["api_key"] == "config_api_key"


def test_create_openai_llm_missing_api_key():
    """Test creating OpenAI LLM without API key raises error."""
    config = {"provider": "openai", "model": "gpt-4"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="OPENAI_API_KEY must be provided"
        ):
            LLMFactory.create_llm(config)


# ============================================================================
# Anthropic Provider Tests
# ============================================================================


@patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test_key"})
@patch("langchain_anthropic.ChatAnthropic")
def test_create_anthropic_llm_basic(mock_chat_anthropic):
    """Test creating Anthropic LLM with basic configuration."""
    mock_llm = Mock()
    mock_chat_anthropic.return_value = mock_llm

    config = {
        "provider": "anthropic",
        "model": "claude-3-sonnet-20240229",
        "temperature": 0.7,
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    mock_chat_anthropic.assert_called_once_with(
        model="claude-3-sonnet-20240229",
        api_key="test_key",
        base_url=None,
        temperature=0.7,
        max_tokens=8192,
        max_retries=1,
        timeout=180.0,
        streaming=True,
        anthropic_proxy=None,
    )


@patch("langchain_anthropic.ChatAnthropic")
def test_create_anthropic_llm_with_api_key_in_config(mock_chat_anthropic):
    """Test creating Anthropic LLM with API key in config."""
    mock_llm = Mock()
    mock_chat_anthropic.return_value = mock_llm

    config = {
        "provider": "anthropic",
        "model": "claude-3-sonnet-20240229",
        "api_key": "config_anthropic_key",
        "temperature": 0.7,
    }

    with patch.dict(os.environ, {}, clear=True):
        result = LLMFactory.create_llm(config)

        assert result == mock_llm
        assert mock_chat_anthropic.call_args[1]["api_key"] == "config_anthropic_key"


def test_create_anthropic_llm_missing_api_key():
    """Test creating Anthropic LLM without API key raises error."""
    config = {"provider": "anthropic", "model": "claude-3-sonnet-20240229"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="ANTHROPIC_API_KEY must be provided"
        ):
            LLMFactory.create_llm(config)


# ============================================================================
# Bedrock Provider Tests
# ============================================================================


@patch.dict(
    os.environ,
    {"AWS_ACCESS_KEY_ID": "test_key", "AWS_SECRET_ACCESS_KEY": "test_secret"},
)
@patch("langchain_aws.ChatBedrockConverse")
def test_create_bedrock_llm_basic(mock_chat_bedrock_converse):
    """Test creating Bedrock LLM with basic configuration."""
    mock_llm = Mock()
    mock_chat_bedrock_converse.return_value = mock_llm

    config = {
        "provider": "bedrock",
        "model": "anthropic.claude-3-sonnet-20240229-v1:0",
        "temperature": 0.2,
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    mock_chat_bedrock_converse.assert_called_once_with(
        model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        temperature=0.2,
        max_tokens=8192,
        region_name="us-east-1",
        provider="amazon",
        base_url=None,
        config=None,
    )


# ============================================================================
# DashScope Provider Tests
# ============================================================================


@patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_dashscope_llm_basic(mock_chat_openai):
    """Test creating DashScope LLM with basic configuration."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {"provider": "dashscope", "model": "qwen-turbo", "temperature": 0.8}

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    mock_chat_openai.assert_called_once_with(
        model="qwen-turbo",
        api_key="test_key",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        temperature=0.8,
        max_tokens=8192,
        max_retries=1,
        timeout=180.0,
        streaming=True,
    )


@patch("langchain_openai.ChatOpenAI")
def test_create_dashscope_llm_with_api_key_in_config(mock_chat_openai):
    """Test creating DashScope LLM with API key in config."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "dashscope",
        "model": "qwen-turbo",
        "api_key": "config_dashscope_key",
        "temperature": 0.8,
    }

    with patch.dict(
        os.environ,
        {"DASHSCOPE_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1"},
        clear=True,
    ):
        result = LLMFactory.create_llm(config)

        assert result == mock_llm
        assert mock_chat_openai.call_args[1]["api_key"] == "config_dashscope_key"


def test_create_dashscope_llm_missing_api_key():
    """Test creating DashScope LLM without API key raises error."""
    config = {"provider": "dashscope", "model": "qwen-turbo"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="DASHSCOPE_API_KEY must be provided"
        ):
            LLMFactory.create_llm(config)


# ============================================================================
# DeepSeek Provider Tests
# ============================================================================

deepseek_available = pytest.mark.skipif(
    not __import__("importlib").util.find_spec("langchain_deepseek"),
    reason="langchain_deepseek not installed",
)


@deepseek_available
@patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test_key"})
@patch("langcrew.llm.ChatDeepSeek")
def test_create_deepseek_llm_basic(mock_chat_deepseek):
    """Test creating DeepSeek LLM with basic configuration."""
    mock_llm = Mock()
    mock_chat_deepseek.return_value = mock_llm

    config = {"provider": "deepseek", "model": "deepseek-chat", "temperature": 0.3}

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    mock_chat_deepseek.assert_called_once_with(
        model="deepseek-chat",
        api_key="test_key",
        temperature=0.3,
        max_tokens=8192,
        max_retries=1,
        timeout=180.0,
        streaming=True,
    )


@deepseek_available
@patch("langcrew.llm.ChatDeepSeek")
def test_create_deepseek_llm_with_api_key_in_config(mock_chat_deepseek):
    """Test creating DeepSeek LLM with API key in config."""
    mock_llm = Mock()
    mock_chat_deepseek.return_value = mock_llm

    config = {
        "provider": "deepseek",
        "model": "deepseek-chat",
        "api_key": "config_deepseek_key",
        "temperature": 0.3,
    }

    with patch.dict(os.environ, {}, clear=True):
        result = LLMFactory.create_llm(config)

        assert result == mock_llm
        assert mock_chat_deepseek.call_args[1]["api_key"] == "config_deepseek_key"


@deepseek_available
def test_create_deepseek_llm_missing_api_key():
    """Test creating DeepSeek LLM without API key raises error."""
    config = {"provider": "deepseek", "model": "deepseek-chat"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="DEEPSEEK_API_KEY must be provided"
        ):
            LLMFactory.create_llm(config)


# ============================================================================
# Vertex AI Provider Tests
# ============================================================================


@patch("langcrew.llm.VertexAIChat")
def test_create_vertex_llm_with_api_key_in_config(mock_vertex_chat):
    """Test creating Vertex AI LLM with API key in config."""
    mock_llm = Mock()
    mock_vertex_chat.return_value = mock_llm

    config = {
        "provider": "vertex",
        "model": "gemini-pro",
        "api_key": "config_vertex_key",
    }

    with patch.dict(os.environ, {}, clear=True):
        result = LLMFactory.create_llm(config)

        assert result == mock_llm
        mock_vertex_chat.assert_called_once_with(
            name="gemini-pro",
            api_key="config_vertex_key",
            proxy=None,
            timeout=180.0,
        )


@patch.dict(os.environ, {"VERTEX_AI_API_KEY": "env_vertex_key"})
@patch("langcrew.llm.VertexAIChat")
def test_create_vertex_llm_from_env(mock_vertex_chat):
    """Test creating Vertex AI LLM with API key from environment."""
    mock_llm = Mock()
    mock_vertex_chat.return_value = mock_llm

    config = {"provider": "vertex", "model": "gemini-pro"}

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    assert mock_vertex_chat.call_args[1]["api_key"] == "env_vertex_key"


def test_create_vertex_llm_missing_api_key():
    """Test creating Vertex AI LLM without API key raises error."""
    config = {"provider": "vertex", "model": "gemini-pro"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="VERTEX_AI_API_KEY must be provided"
        ):
            LLMFactory.create_llm(config)


# ============================================================================
# OpenAI Compatible Provider Tests
# ============================================================================


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_openai_compatible_llm_basic(mock_chat_openai):
    """Test creating OpenAI Compatible LLM with basic configuration."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "openai_compatible",
        "model": "custom-model",
        "base_url": "https://api.example.com/v1",
        "temperature": 0.5,
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    mock_chat_openai.assert_called_once_with(
        model="custom-model",
        api_key="test_key",
        base_url="https://api.example.com/v1",
        temperature=0.5,
        max_tokens=8192,
        max_retries=1,
        timeout=180.0,
        streaming=True,
        openai_proxy=None,
    )


def test_create_openai_compatible_llm_missing_base_url():
    """Test that openai_compatible requires base_url."""
    config = {"provider": "openai_compatible", "model": "custom-model"}

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
        with pytest.raises(
            ValueError, match="base_url is required for openai_compatible provider"
        ):
            LLMFactory.create_llm(config)


# ============================================================================
# Gemini Provider Tests
# ============================================================================


@patch.dict(os.environ, {"GOOGLE_API_KEY": "test_key"})
@patch("langchain_google_genai.ChatGoogleGenerativeAI")
def test_create_gemini_llm_omits_temperature_when_none(mock_chat_google):
    """Test temperature=None avoids passing a value rejected by Gemini wrapper."""
    mock_llm = Mock()
    mock_chat_google.return_value = mock_llm

    config = {"provider": "gemini", "model": "gemini-pro", "temperature": None}

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    assert "temperature" not in mock_chat_google.call_args.kwargs


@patch.dict(os.environ, {"GOOGLE_API_KEY": "test_key"})
@patch("langchain_google_genai.ChatGoogleGenerativeAI")
def test_create_gemini_llm_defaults_temperature_when_omitted(mock_chat_google):
    """Test omitted temperature still uses the factory default for Gemini."""
    mock_llm = Mock()
    mock_chat_google.return_value = mock_llm

    config = {"provider": "gemini", "model": "gemini-pro"}

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    assert mock_chat_google.call_args.kwargs["temperature"] == DEFAULT_TEMPERATURE


# ============================================================================
# Anthropic Bedrock Provider Tests
# ============================================================================


@patch("langcrew.llm.ChatAnthropicBedrock")
def test_create_anthropic_bedrock_llm_with_api_key_in_config(
    mock_chat_anthropic_bedrock,
):
    """Test creating Anthropic Bedrock LLM with API key in config."""
    mock_llm = Mock()
    mock_chat_anthropic_bedrock.return_value = mock_llm

    config = {
        "provider": "anthropic_bedrock",
        "model": "anthropic.claude-3-sonnet-20240229-v1:0",
        "api_key": "config_bedrock_token",
        "temperature": 0.7,
    }

    with patch.dict(os.environ, {}, clear=True):
        result = LLMFactory.create_llm(config)

        assert result == mock_llm
        assert os.environ.get("AWS_BEARER_TOKEN_BEDROCK") == "config_bedrock_token"


@patch.dict(os.environ, {"AWS_BEARER_TOKEN_BEDROCK": "env_bedrock_token"})
@patch("langcrew.llm.ChatAnthropicBedrock")
def test_create_anthropic_bedrock_llm_from_env(mock_chat_anthropic_bedrock):
    """Test creating Anthropic Bedrock LLM with API key from environment."""
    mock_llm = Mock()
    mock_chat_anthropic_bedrock.return_value = mock_llm

    config = {
        "provider": "anthropic_bedrock",
        "model": "anthropic.claude-3-sonnet-20240229-v1:0",
        "temperature": 0.5,
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    assert os.environ.get("AWS_BEARER_TOKEN_BEDROCK") == "env_bedrock_token"


def test_create_anthropic_bedrock_llm_missing_api_key():
    """Test creating Anthropic Bedrock LLM without API key raises error."""
    config = {
        "provider": "anthropic_bedrock",
        "model": "anthropic.claude-3-sonnet-20240229-v1:0",
    }

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="AWS_BEARER_TOKEN_BEDROCK must be provided"
        ):
            LLMFactory.create_llm(config)


# ============================================================================
# Error Handling Tests
# ============================================================================


def test_create_llm_unsupported_provider():
    """Test creating LLM with unsupported provider raises error."""
    config = {"provider": "unsupported", "model": "some-model"}

    with pytest.raises(ValueError, match="Unknown provider: unsupported"):
        LLMFactory.create_llm(config)


def test_create_llm_missing_provider():
    """Test creating LLM without provider raises error."""
    config = {"model": "gpt-4"}

    with pytest.raises(ValueError, match="'provider' is required in config"):
        LLMFactory.create_llm(config)
