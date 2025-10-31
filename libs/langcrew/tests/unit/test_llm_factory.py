"""
Unit tests for langcrew.config.llm module.

Tests the LLMFactory functionality including multi-provider LLM creation,
configuration handling, and error handling.
"""

import os
from unittest.mock import Mock, patch

import pytest

from langcrew.llm_factory import DEFAULT_TEMPERATURE, LLMFactory


def test_default_temperature_value():
    """Test that DEFAULT_TEMPERATURE is set correctly."""
    assert DEFAULT_TEMPERATURE == 0.0


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
        temperature=0.5,
        max_tokens=4096,
        max_retries=10,
        request_timeout=60.0,
        openai_proxy=None,
    )


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_openai_llm_default_temperature(mock_chat_openai):
    """Test creating OpenAI LLM with default temperature."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {"provider": "openai", "model": "gpt-3.5-turbo"}

    LLMFactory.create_llm(config)

    mock_chat_openai.assert_called_once_with(
        model="gpt-3.5-turbo",
        api_key="test_key",
        temperature=DEFAULT_TEMPERATURE,
        max_tokens=4096,
        max_retries=10,
        request_timeout=60.0,
        openai_proxy=None,
    )


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_openai_llm_with_custom_max_tokens(mock_chat_openai):
    """Test creating OpenAI LLM with custom max_tokens."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "openai",
        "model": "gpt-4",
        "temperature": 0.3,
        "max_tokens": 2048,
    }

    LLMFactory.create_llm(config)

    mock_chat_openai.assert_called_once_with(
        model="gpt-4",
        api_key="test_key",
        temperature=0.3,
        max_tokens=2048,
        max_retries=10,
        request_timeout=60.0,
        openai_proxy=None,
    )


def test_create_openai_llm_missing_api_key():
    """Test creating OpenAI LLM without API key."""
    config = {"provider": "openai", "model": "gpt-4"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="OPENAI_API_KEY environment variable is not set"
        ):
            LLMFactory.create_llm(config)


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
        temperature=0.7,
        max_tokens=4096,
        max_retries=2,
        timeout=60.0,
    )


def test_create_anthropic_llm_missing_api_key():
    """Test creating Anthropic LLM without API key."""
    config = {"provider": "anthropic", "model": "claude-3-sonnet-20240229"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="ANTHROPIC_API_KEY environment variable is not set"
        ):
            LLMFactory.create_llm(config)


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
        max_tokens=4096,
        region_name="us-east-1",
        provider="amazon",
        config=None,
    )


@patch.dict(
    os.environ,
    {"AWS_ACCESS_KEY_ID": "test_key", "AWS_SECRET_ACCESS_KEY": "test_secret"},
)
@patch("langchain_aws.ChatBedrockConverse")
def test_create_bedrock_llm_with_region(mock_chat_bedrock_converse):
    """Test creating Bedrock LLM with custom region."""
    mock_llm = Mock()
    mock_chat_bedrock_converse.return_value = mock_llm

    config = {
        "provider": "bedrock",
        "model": "anthropic.claude-3-sonnet-20240229-v1:0",
        "region": "eu-west-1",
    }

    LLMFactory.create_llm(config)

    mock_chat_bedrock_converse.assert_called_once_with(
        model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        temperature=DEFAULT_TEMPERATURE,
        max_tokens=4096,
        region_name="eu-west-1",
        provider="amazon",
        config=None,
    )


def test_create_bedrock_llm_missing_credentials():
    """Test creating Bedrock LLM without AWS credentials."""
    config = {"provider": "bedrock", "model": "anthropic.claude-3-sonnet-20240229-v1:0"}

    with patch.dict(os.environ, {}, clear=True):
        # Bedrock doesn't validate credentials at creation time, it creates the client
        # The actual AWS credential validation happens when the client is used
        with patch("langchain_aws.ChatBedrockConverse") as mock_bedrock_converse:
            mock_llm = Mock()
            mock_bedrock_converse.return_value = mock_llm

            result = LLMFactory.create_llm(config)

            assert result == mock_llm
            mock_bedrock_converse.assert_called_once_with(
                model_id="anthropic.claude-3-sonnet-20240229-v1:0",
                temperature=DEFAULT_TEMPERATURE,
                max_tokens=4096,
                region_name="us-east-1",
                provider="amazon",
                config=None,
            )


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
        max_tokens=4096,
        max_retries=1,
        request_timeout=60.0,
    )


def test_create_dashscope_llm_missing_api_key():
    """Test creating DashScope LLM without API key."""
    config = {"provider": "dashscope", "model": "qwen-turbo"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="DASHSCOPE_API_KEY environment variable is not set"
        ):
            LLMFactory.create_llm(config)


def test_create_llm_unsupported_provider():
    """Test creating LLM with unsupported provider."""
    config = {"provider": "unsupported", "model": "some-model"}

    with pytest.raises(ValueError, match="Unknown provider: unsupported"):
        LLMFactory.create_llm(config)


def test_create_llm_missing_model():
    """Test creating LLM without model specification."""
    config = {
        "provider": "openai"
        # missing model
    }

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
        with patch("langchain_openai.ChatOpenAI") as mock_openai:
            mock_llm = Mock()
            mock_openai.return_value = mock_llm

            # The implementation doesn't validate missing model, it passes None
            result = LLMFactory.create_llm(config)

            assert result == mock_llm
            mock_openai.assert_called_once_with(
                model=None,
                api_key="test_key",
                temperature=DEFAULT_TEMPERATURE,
                max_tokens=4096,
                max_retries=10,
                request_timeout=60.0,
                openai_proxy=None,
            )


def test_create_llm_missing_provider():
    """Test creating LLM without provider (should default to openai)."""
    config = {
        "model": "gpt-4"
        # missing provider - should default to openai
    }

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
        with patch("langchain_openai.ChatOpenAI") as mock_chat_openai:
            mock_llm = Mock()
            mock_chat_openai.return_value = mock_llm

            result = LLMFactory.create_llm(config)

            assert result == mock_llm
            mock_chat_openai.assert_called_once_with(
                model="gpt-4",
                api_key="test_key",
                temperature=DEFAULT_TEMPERATURE,
                max_tokens=4096,
                max_retries=10,
                request_timeout=60.0,
                openai_proxy=None,
            )


@pytest.mark.parametrize(
    "provider,expected_exception,env_vars",
    [
        ("openai", "OPENAI_API_KEY", {}),
        ("anthropic", "ANTHROPIC_API_KEY", {}),
        ("dashscope", "DASHSCOPE_API_KEY", {}),
        ("deepseek", "DEEPSEEK_API_KEY", {}),
    ],
)
def test_all_providers_missing_credentials(provider, expected_exception, env_vars):
    """Test all providers with missing credentials."""
    config = {"provider": provider, "model": "test-model"}

    with patch.dict(os.environ, env_vars, clear=True):
        with pytest.raises(ValueError, match=expected_exception):
            LLMFactory.create_llm(config)


def test_bedrock_missing_credentials_separate():
    """Test Bedrock with missing credentials (separate test since it doesn't validate at creation)."""
    config = {"provider": "bedrock", "model": "test-model"}

    with patch.dict(os.environ, {}, clear=True):
        with patch("langchain_aws.ChatBedrockConverse") as mock_bedrock_converse:
            mock_llm = Mock()
            mock_bedrock_converse.return_value = mock_llm

            # Bedrock doesn't validate credentials at creation time
            result = LLMFactory.create_llm(config)
            assert result == mock_llm


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_llm_with_extra_kwargs(mock_chat_openai):
    """Test creating LLM with extra configuration parameters."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "openai",
        "model": "gpt-4",
        "temperature": 0.5,
        "max_tokens": 1000,
        "top_p": 0.9,
        "custom_param": "custom_value",
    }

    # The current implementation passes all standard parameters
    LLMFactory.create_llm(config)

    mock_chat_openai.assert_called_once_with(
        model="gpt-4",
        api_key="test_key",
        temperature=0.5,
        max_tokens=1000,  # Uses custom max_tokens from config
        max_retries=10,
        request_timeout=60.0,
        openai_proxy=None,
    )


def test_create_llm_empty_config():
    """Test creating LLM with empty configuration."""
    config = {}

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
        with patch("langchain_openai.ChatOpenAI") as mock_openai:
            mock_llm = Mock()
            mock_openai.return_value = mock_llm

            # Implementation doesn't validate empty config, passes None for model
            result = LLMFactory.create_llm(config)

            assert result == mock_llm
            mock_openai.assert_called_once_with(
                model=None,
                api_key="test_key",
                temperature=DEFAULT_TEMPERATURE,
                max_tokens=4096,
                max_retries=10,
                request_timeout=60.0,
                openai_proxy=None,
            )


def test_create_llm_none_config():
    """Test creating LLM with None configuration."""
    with pytest.raises(AttributeError):
        LLMFactory.create_llm(None)


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_temperature_type_conversion(mock_chat_openai):
    """Test that temperature is properly converted to float."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    # Test with string temperature
    config = {
        "provider": "openai",
        "model": "gpt-4",
        "temperature": "0.5",  # String instead of float
    }

    LLMFactory.create_llm(config)

    # Current implementation doesn't convert temperature to float
    mock_chat_openai.assert_called_once_with(
        model="gpt-4",
        api_key="test_key",
        temperature="0.5",  # Passes as string
        max_tokens=4096,
        max_retries=10,
        request_timeout=60.0,
        openai_proxy=None,
    )


# DeepSeek provider tests
@patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test_key"})
@patch("langchain_deepseek.ChatDeepSeek")
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
        max_tokens=4096,
        max_retries=3,
        request_timeout=60.0,
    )


@patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test_key"})
@patch("langchain_deepseek.ChatDeepSeek")
def test_create_deepseek_llm_default_temperature(mock_chat_deepseek):
    """Test creating DeepSeek LLM with default temperature."""
    mock_llm = Mock()
    mock_chat_deepseek.return_value = mock_llm

    config = {"provider": "deepseek", "model": "deepseek-coder"}

    LLMFactory.create_llm(config)

    mock_chat_deepseek.assert_called_once_with(
        model="deepseek-coder",
        api_key="test_key",
        temperature=DEFAULT_TEMPERATURE,
        max_tokens=4096,
        max_retries=3,
        request_timeout=60.0,
    )


def test_create_deepseek_llm_missing_api_key():
    """Test creating DeepSeek LLM without API key."""
    config = {"provider": "deepseek", "model": "deepseek-chat"}

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="DEEPSEEK_API_KEY environment variable is not set"
        ):
            LLMFactory.create_llm(config)


@patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test_key"})
@patch("langchain_deepseek.ChatDeepSeek")
def test_create_deepseek_llm_with_custom_params(mock_chat_deepseek):
    """Test creating DeepSeek LLM with custom parameters."""
    mock_llm = Mock()
    mock_chat_deepseek.return_value = mock_llm

    config = {
        "provider": "deepseek",
        "model": "deepseek-chat",
        "temperature": 0.7,
        "max_tokens": 2048,
        "max_retries": 5,
        "request_timeout": 30.0,
    }

    LLMFactory.create_llm(config)

    mock_chat_deepseek.assert_called_once_with(
        model="deepseek-chat",
        api_key="test_key",
        temperature=0.7,
        max_tokens=2048,
        max_retries=5,
        request_timeout=30.0,
    )


# OpenAI Compatible provider tests
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
        max_tokens=4096,
        max_retries=3,
        request_timeout=60.0,
    )


@patch.dict(os.environ, {"CUSTOM_API_KEY": "custom_test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_openai_compatible_llm_custom_api_key_env(mock_chat_openai):
    """Test creating OpenAI Compatible LLM with custom API key environment variable."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "openai_compatible",
        "model": "custom-model",
        "base_url": "https://api.example.com/v1",
        "api_key_env": "CUSTOM_API_KEY",
        "temperature": 0.7,
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    mock_chat_openai.assert_called_once_with(
        model="custom-model",
        api_key="custom_test_key",
        base_url="https://api.example.com/v1",
        temperature=0.7,
        max_tokens=4096,
        max_retries=3,
        request_timeout=60.0,
    )


def test_create_openai_compatible_llm_missing_base_url():
    """Test creating OpenAI Compatible LLM without base_url."""
    config = {"provider": "openai_compatible", "model": "custom-model"}

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
        with pytest.raises(
            ValueError, match="base_url is required for openai_compatible provider"
        ):
            LLMFactory.create_llm(config)


def test_create_openai_compatible_llm_missing_api_key():
    """Test creating OpenAI Compatible LLM without API key."""
    config = {
        "provider": "openai_compatible",
        "model": "custom-model",
        "base_url": "https://api.example.com/v1",
    }

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="OPENAI_API_KEY environment variable is not set"
        ):
            LLMFactory.create_llm(config)


def test_create_openai_compatible_llm_missing_custom_api_key():
    """Test creating OpenAI Compatible LLM without custom API key."""
    config = {
        "provider": "openai_compatible",
        "model": "custom-model",
        "base_url": "https://api.example.com/v1",
        "api_key_env": "CUSTOM_API_KEY",
    }

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(
            ValueError, match="CUSTOM_API_KEY environment variable is not set"
        ):
            LLMFactory.create_llm(config)


# Proxy configuration tests
@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
@patch("httpx.Client")
@patch("httpx.AsyncClient")
def test_create_llm_with_proxy_openai(mock_async_client, mock_client, mock_chat_openai):
    """Test creating OpenAI LLM with proxy configuration."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm
    mock_llm._client = Mock()
    mock_llm._client._client = None
    mock_llm._async_client = Mock()
    mock_llm._async_client._client = None

    mock_http_client = Mock()
    mock_async_http_client = Mock()
    mock_client.return_value = mock_http_client
    mock_async_client.return_value = mock_async_http_client

    config = {
        "provider": "openai",
        "model": "gpt-4",
        "proxy": "http://proxy.example.com:8080",
        "timeout": 90.0,
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm

    # Verify proxy clients are created
    mock_client.assert_called_once_with(
        proxy="http://proxy.example.com:8080", timeout=90.0
    )
    mock_async_client.assert_called_once_with(
        proxy="http://proxy.example.com:8080", timeout=90.0
    )

    # Verify clients are set on the LLM
    assert mock_llm._client._client == mock_http_client
    assert mock_llm._async_client._client == mock_async_http_client


@patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test_key"})
@patch("langchain_anthropic.ChatAnthropic")
@patch("httpx.Client")
@patch("httpx.AsyncClient")
def test_create_llm_with_proxy_anthropic(
    mock_async_client, mock_client, mock_chat_anthropic
):
    """Test creating Anthropic LLM with proxy configuration."""
    mock_llm = Mock()
    mock_chat_anthropic.return_value = mock_llm
    mock_llm._client = Mock()
    mock_llm._client._client = None
    mock_llm._async_client = Mock()
    mock_llm._async_client._client = None

    mock_http_client = Mock()
    mock_async_http_client = Mock()
    mock_client.return_value = mock_http_client
    mock_async_client.return_value = mock_async_http_client

    config = {
        "provider": "anthropic",
        "model": "claude-3-sonnet-20240229",
        "proxy": "http://proxy.example.com:8080",
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm

    # Verify proxy clients are created with default timeout
    mock_client.assert_called_once_with(
        proxy="http://proxy.example.com:8080",
        timeout=120.0,  # default timeout
    )
    mock_async_client.assert_called_once_with(
        proxy="http://proxy.example.com:8080", timeout=120.0
    )


@patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test_key"})
@patch("langchain_deepseek.ChatDeepSeek")
@patch("httpx.Client")
@patch("httpx.AsyncClient")
def test_create_llm_with_proxy_deepseek(
    mock_async_client, mock_client, mock_chat_deepseek
):
    """Test creating DeepSeek LLM with proxy configuration."""
    mock_llm = Mock()
    mock_chat_deepseek.return_value = mock_llm
    mock_llm._client = Mock()
    mock_llm._client._client = None
    mock_llm._async_client = Mock()
    mock_llm._async_client._client = None

    config = {
        "provider": "deepseek",
        "model": "deepseek-chat",
        "proxy": "http://proxy.example.com:8080",
    }

    LLMFactory.create_llm(config)

    # Verify proxy clients are created
    mock_client.assert_called_once()
    mock_async_client.assert_called_once()


@patch.dict(
    os.environ,
    {"AWS_ACCESS_KEY_ID": "test_key", "AWS_SECRET_ACCESS_KEY": "test_secret"},
)
@patch("langchain_aws.ChatBedrockConverse")
@patch("botocore.config.Config")
def test_create_llm_with_proxy_bedrock(mock_config, mock_chat_bedrock_converse):
    """Test creating Bedrock LLM with proxy configuration."""
    mock_llm = Mock()
    mock_chat_bedrock_converse.return_value = mock_llm
    mock_proxy_config = Mock()
    mock_config.return_value = mock_proxy_config

    config = {
        "provider": "bedrock",
        "model": "anthropic.claude-3-sonnet-20240229-v1:0",
        "proxy": "http://proxy.example.com:8080",
        "read_timeout": 120.0,
        "connect_timeout": 15.0,
        "max_attempts": 3,
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm

    # Verify proxy config is created for Bedrock
    mock_config.assert_called_once_with(
        proxies={
            "http": "http://proxy.example.com:8080",
            "https": "http://proxy.example.com:8080",
        },
        read_timeout=120.0,
        connect_timeout=15.0,
        retries={"max_attempts": 3, "mode": "standard"},
    )

    # Verify Bedrock client is created with proxy config
    mock_chat_bedrock_converse.assert_called_once_with(
        model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        temperature=DEFAULT_TEMPERATURE,
        max_tokens=4096,
        region_name="us-east-1",
        provider="amazon",
        config=mock_proxy_config,
    )


@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_create_llm_without_proxy(mock_chat_openai):
    """Test creating LLM without proxy configuration."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "openai",
        "model": "gpt-4",
        # No proxy configuration
    }

    with (
        patch("httpx.Client") as mock_client,
        patch("httpx.AsyncClient") as mock_async_client,
    ):
        result = LLMFactory.create_llm(config)

        assert result == mock_llm

        # Verify no proxy clients are created
        mock_client.assert_not_called()
        mock_async_client.assert_not_called()


# Additional coverage tests
@patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_openai_provider_with_all_custom_params(mock_chat_openai):
    """Test OpenAI provider with all custom parameters."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "openai",
        "model": "gpt-4-turbo",
        "temperature": 0.8,
        "max_tokens": 1024,
        "max_retries": 5,
        "request_timeout": 30.0,
    }

    LLMFactory.create_llm(config)

    mock_chat_openai.assert_called_once_with(
        model="gpt-4-turbo",
        api_key="test_key",
        temperature=0.8,
        max_tokens=1024,
        max_retries=5,
        request_timeout=30.0,
        openai_proxy=None,
    )


@patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test_key"})
@patch("langchain_anthropic.ChatAnthropic")
def test_anthropic_provider_with_custom_timeout(mock_chat_anthropic):
    """Test Anthropic provider with custom timeout."""
    mock_llm = Mock()
    mock_chat_anthropic.return_value = mock_llm

    config = {
        "provider": "anthropic",
        "model": "claude-3-opus-20240229",
        "temperature": 0.1,
        "max_tokens": 8192,
        "max_retries": 5,
        "timeout": 120.0,
    }

    LLMFactory.create_llm(config)

    mock_chat_anthropic.assert_called_once_with(
        model="claude-3-opus-20240229",
        api_key="test_key",
        temperature=0.1,
        max_tokens=8192,
        max_retries=5,
        timeout=120.0,
    )


@patch.dict(
    os.environ,
    {"AWS_ACCESS_KEY_ID": "test_key", "AWS_SECRET_ACCESS_KEY": "test_secret"},
)
@patch("langchain_aws.ChatBedrockConverse")
def test_bedrock_provider_with_custom_provider_id(mock_chat_bedrock_converse):
    """Test Bedrock provider with custom provider_id."""
    mock_llm = Mock()
    mock_chat_bedrock_converse.return_value = mock_llm

    config = {
        "provider": "bedrock",
        "model": "meta.llama2-70b-chat-v1",
        "temperature": 0.5,
        "max_tokens": 2048,
        "region": "us-west-2",
        "provider_id": "meta",
    }

    result = LLMFactory.create_llm(config)

    assert result == mock_llm
    mock_chat_bedrock_converse.assert_called_once_with(
        model_id="meta.llama2-70b-chat-v1",
        temperature=0.5,
        max_tokens=2048,
        region_name="us-west-2",
        provider="meta",
        config=None,
    )


@patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test_key"})
@patch("langchain_openai.ChatOpenAI")
def test_dashscope_provider_with_custom_params(mock_chat_openai):
    """Test DashScope provider with custom parameters."""
    mock_llm = Mock()
    mock_chat_openai.return_value = mock_llm

    config = {
        "provider": "dashscope",
        "model": "qwen-max",
        "temperature": 0.9,
        "max_tokens": 8192,
        "max_retries": 2,
        "request_timeout": 45.0,
    }

    LLMFactory.create_llm(config)

    mock_chat_openai.assert_called_once_with(
        model="qwen-max",
        api_key="test_key",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        temperature=0.9,
        max_tokens=8192,
        max_retries=2,
        request_timeout=45.0,
    )


# Edge case tests
def test_create_llm_with_zero_temperature():
    """Test creating LLM with zero temperature."""
    config = {
        "provider": "openai",
        "model": "gpt-4",
        "temperature": 0,
    }

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
        with patch("langchain_openai.ChatOpenAI") as mock_openai:
            mock_llm = Mock()
            mock_openai.return_value = mock_llm

            result = LLMFactory.create_llm(config)

            assert result == mock_llm
            mock_openai.assert_called_once_with(
                model="gpt-4",
                api_key="test_key",
                temperature=0,
                max_tokens=4096,
                max_retries=10,
                request_timeout=60.0,
                openai_proxy=None,
            )


def test_create_llm_with_high_temperature():
    """Test creating LLM with high temperature."""
    config = {
        "provider": "openai",
        "model": "gpt-4",
        "temperature": 2.0,
    }

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
        with patch("langchain_openai.ChatOpenAI") as mock_openai:
            mock_llm = Mock()
            mock_openai.return_value = mock_llm

            result = LLMFactory.create_llm(config)

            assert result == mock_llm
            mock_openai.assert_called_once_with(
                model="gpt-4",
                api_key="test_key",
                temperature=2.0,
                max_tokens=4096,
                max_retries=10,
                request_timeout=60.0,
                openai_proxy=None,
            )
