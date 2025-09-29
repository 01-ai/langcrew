import logging
import os
from typing import Any

from .llm import apply_bedrock_decorator, create_cache_modifier

logger = logging.getLogger(__name__)

# Default parameters
DEFAULT_TEMPERATURE = 0.0
DEFAULT_MAX_TOKENS = 4096


class LLMFactory:
    """Create LLM instances using langchain library, following existing code patterns"""

    @staticmethod
    def create_llm(config: dict[str, Any]):
        """根据配置创建LLM实例"""
        provider = config.get("provider", "openai")
        model_name = config.get("model")
        temperature = config.get("temperature", DEFAULT_TEMPERATURE)
        proxy = config.get("proxy")

        # Create LLM based on provider
        if provider == "openai":
            from langchain_openai import ChatOpenAI

            logger.info(f"Creating OpenAI client for {model_name}")
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")

            llm = ChatOpenAI(
                model=model_name,
                api_key=api_key,
                temperature=temperature,
                max_tokens=config.get("max_tokens", DEFAULT_MAX_TOKENS),
                max_retries=config.get("max_retries", 10),
                request_timeout=config.get("request_timeout", 60.0),
            )

        elif provider == "anthropic":
            from langchain_anthropic import ChatAnthropic

            logger.info(f"Creating Anthropic client for {model_name}")
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
            llm = ChatAnthropic(
                model=model_name,
                api_key=api_key,
                temperature=temperature,
                max_tokens=config.get("max_tokens", DEFAULT_MAX_TOKENS),
                max_retries=config.get("max_retries", 2),
                timeout=config.get("timeout", 60.0),
                # base_url= "https://gateway.ai.cloudflare.com/v1/1f099cb115a03f47e9c8b1fe5886bec4/ybw1392/anthropic"
            )

        elif provider == "bedrock":
            logger.info(f"Creating Bedrock client for model: {model_name}")
            from botocore.config import Config
            from langchain_aws import ChatBedrockConverse

            # Configure proxy for boto3 if proxy is defined
            proxy_config = None
            if proxy:
                proxies = {"http": proxy, "https": proxy}
                proxy_config = Config(
                    proxies=proxies,
                    read_timeout=config.get("read_timeout", 180.0),
                    connect_timeout=config.get("connect_timeout", 10.0),
                    retries={
                        "max_attempts": config.get("max_attempts", 1),
                        "mode": "standard",
                    },
                )

            # Create ChatBedrockConverse with the configured settings
            llm = ChatBedrockConverse(
                model_id=model_name,
                temperature=temperature,
                max_tokens=config.get("max_tokens", DEFAULT_MAX_TOKENS),
                region_name=config.get("region", "us-east-1"),
                provider=config.get("provider_id", "amazon"),
                config=proxy_config,
            )
            if config.get("cache", True):
                system_modifier, message_modifier, tools_modifier = (
                    create_cache_modifier(model_name)
                )
                llm = apply_bedrock_decorator(
                    llm,
                    system_modifier=system_modifier,
                    tools_modifier=tools_modifier,
                    message_modifier=message_modifier,
                )
            return llm

        elif provider == "dashscope":
            from langchain_openai import ChatOpenAI

            logger.info(f"Creating DashScope client for {model_name}")
            api_key = os.getenv("DASHSCOPE_API_KEY")
            if not api_key:
                raise ValueError("DASHSCOPE_API_KEY environment variable is not set")

            llm = ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
                temperature=temperature,
                max_tokens=config.get("max_tokens", DEFAULT_MAX_TOKENS),
                max_retries=config.get("max_retries", 1),
                request_timeout=config.get("request_timeout", 60.0),
            )

        elif provider == "deepseek":
            from langchain_deepseek import ChatDeepSeek

            logger.info(f"Creating DeepSeek client for {model_name}")
            api_key = os.getenv("DEEPSEEK_API_KEY")
            if not api_key:
                raise ValueError("DEEPSEEK_API_KEY environment variable is not set")

            llm = ChatDeepSeek(
                model=model_name,
                api_key=api_key,
                temperature=temperature,
                max_tokens=config.get("max_tokens", DEFAULT_MAX_TOKENS),
                max_retries=config.get("max_retries", 3),
                request_timeout=config.get("request_timeout", 60.0),
            )

        elif provider == "vertex":
            from .llm import VertexAIChat

            logger.info(f"Creating Vertex AI client for {model_name}")
            api_key = os.getenv("VERTEX_AI_API_KEY")
            if not api_key:
                raise ValueError("VERTEX_AI_API_KEY environment variable is not set")

            llm = VertexAIChat(
                name=model_name,
                api_key=api_key,
                temperature=temperature,
                max_tokens=config.get("max_tokens", DEFAULT_MAX_TOKENS),
                max_retries=config.get("max_retries", 3),
                request_timeout=config.get("request_timeout", 60.0),
            )

        elif provider == "openai_compatible":
            from langchain_openai import ChatOpenAI

            logger.info(f"Creating OpenAI-compatible client for {model_name}")

            # Allow custom API key environment variable name
            api_key_env = config.get("api_key_env", "OPENAI_API_KEY")
            api_key = os.getenv(api_key_env)
            if not api_key:
                raise ValueError(f"{api_key_env} environment variable is not set")

            # Require base_url for compatible providers
            base_url = config.get("base_url")
            if not base_url:
                raise ValueError("base_url is required for openai_compatible provider")

            llm = ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url=base_url,
                temperature=temperature,
                max_tokens=config.get("max_tokens", DEFAULT_MAX_TOKENS),
                max_retries=config.get("max_retries", 3),
                request_timeout=config.get("request_timeout", 60.0),
            )

        else:
            raise ValueError(f"Unknown provider: {provider}")

        # Configure proxy for non-Bedrock models
        if provider not in ["bedrock"] and proxy:
            import httpx

            # Create HTTP clients with proxy settings
            http_client = httpx.Client(
                proxy=proxy, timeout=config.get("timeout", 120.0)
            )
            async_http_client = httpx.AsyncClient(
                proxy=proxy, timeout=config.get("timeout", 120.0)
            )

            # Set HTTP clients with proxy settings
            if hasattr(llm, "_client") and hasattr(llm._client, "_client"):
                llm._client._client = http_client
            if hasattr(llm, "_async_client") and hasattr(llm._async_client, "_client"):
                llm._async_client._client = async_http_client

        return llm
