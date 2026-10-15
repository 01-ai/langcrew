import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# Default parameters
DEFAULT_TEMPERATURE = 0.0
DEFAULT_MAX_TOKENS = 8192
DEFAULT_TIMEOUT = 180.0


class LLMFactory:
    """Create LLM instances using langchain library with flexible configuration.

    TODO: Rewrite as a thin wrapper around ``init_chat_model``.
    - Remove all manual provider switch-case logic and custom Chat classes
      (``llm/anthropic_bedrock_chat.py``, ``llm/vertex_chat_model.py``,
      ``llm/bedrock_decorator.py``).
    - Keep the ``create_llm(dict)`` public interface unchanged so callers
      require zero modifications.
    - Target: ~30 lines (currently 326).
    """

    # Common LLM parameters that are explicitly handled
    # All other parameters will be passed as **extra_kwargs to the LLM constructor
    COMMON_PARAMS = {
        "provider", "model", "api_key", "proxy", "base_url",
        "disable_streaming", "api_key_env",
        "temperature", "max_tokens", "timeout", "max_retries", "streaming",
        # 思考模式（thinking mode）适配开关：为 True 时使用 ChatOpenAIReasoning，
        # 保留并回传 reasoning_content，避免网关报 400。
        "preserve_reasoning_content",
    }

    @staticmethod
    def _should_preserve_reasoning(provider: str, config: dict[str, Any], extra_kwargs: dict[str, Any]) -> bool:
        """判断是否需要启用 reasoning_content 保留/回传能力。

        显式配置 ``preserve_reasoning_content`` 优先；未配置时，
        ``openai_reasoning`` provider 默认启用，其余 provider 默认关闭。
        """
        explicit = config.get("preserve_reasoning_content")
        if explicit is not None:
            return bool(explicit)
        return provider == "openai_reasoning"

    @staticmethod
    def create_llm(config: dict[str, Any]):
        """Create LLM instance based on configuration
        
        Args:
            config: Configuration dictionary
            
        Required parameters:
            - provider: LLM provider name
            - model: Model name/ID
        
        Common parameters:
            - api_key: API key (optional, falls back to env var)
            - temperature: Temperature for generation (default: 0.0).
              Set to None to omit the provider temperature parameter.
            - max_tokens: Maximum tokens to generate (default: 8192)
            - timeout: Request timeout in seconds (default: 180.0)
            - max_retries: Maximum retry attempts (default: 1)
            - streaming: Enable streaming responses (default: True)
            - proxy: Proxy URL
            - base_url: Custom API base URL
            - disable_streaming: Force disable streaming attribute
        
        Extra parameters (provider-specific):
            - Any other parameters are passed directly to the LLM constructor
            - Examples: top_p, frequency_penalty, presence_penalty, etc.
            
        Bedrock-specific:
            - region (default: "us-east-1")
            - provider_id (default: "amazon")
            - cache (default: True)
            - read_timeout, connect_timeout, max_attempts
        
        Example:
            config = {
                "provider": "openai",
                "model": "gpt-4",
                "api_key": "sk-xxx",
                "temperature": 0.7,
                "top_p": 0.9,
                "frequency_penalty": 0.5,
            }
            llm = LLMFactory.create_llm(config)
        """
        if "provider" not in config:
            raise ValueError("'provider' is required in config")
        if "model" not in config:
            raise ValueError("'model' is required in config")

        # Extract common parameters
        provider = config["provider"]
        model = config["model"]
        api_key = config.get("api_key")
        proxy = config.get("proxy")
        base_url = config.get("base_url")
        disable_streaming = config.get("disable_streaming", False)
        api_key_env = config.get("api_key_env")

        temperature = config.get("temperature", DEFAULT_TEMPERATURE)
        temperature_kwargs = {} if temperature is None else {"temperature": temperature}
        max_tokens = config.get("max_tokens", DEFAULT_MAX_TOKENS)
        timeout = config.get("timeout", DEFAULT_TIMEOUT)
        max_retries = config.get("max_retries", 1)
        streaming = config.get("streaming", True)

        # Collect extra parameters (provider-specific)
        # All parameters NOT in COMMON_PARAMS go to extra_kwargs
        extra_kwargs = {
            k: v for k, v in config.items() 
            if k not in LLMFactory.COMMON_PARAMS
        }

        # Create LLM based on provider
        if provider in ("openai", "openai_reasoning"):
            logger.info(f"Creating OpenAI client for {model}")
            api_key = api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY must be provided via config or environment variable")

            if LLMFactory._should_preserve_reasoning(provider, config, extra_kwargs):
                from .llm import ChatOpenAIReasoning

                logger.info(
                    "Using ChatOpenAIReasoning (preserve & pass back reasoning_content) for %s",
                    model,
                )
                llm_cls = ChatOpenAIReasoning
            else:
                from langchain_openai import ChatOpenAI

                llm_cls = ChatOpenAI

            llm = llm_cls(
                model=model,
                api_key=api_key,
                base_url=base_url,
                openai_proxy=proxy,
                max_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
                streaming=streaming,
                **temperature_kwargs,
                **extra_kwargs,
            )

        elif provider == "anthropic":
            from langchain_anthropic import ChatAnthropic

            logger.info(f"Creating Anthropic client for {model}")
            api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY must be provided via config or environment variable")

            llm = ChatAnthropic(
                model=model,
                api_key=api_key,
                base_url=base_url,
                anthropic_proxy=proxy,
                max_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
                streaming=streaming,
                **temperature_kwargs,
                **extra_kwargs,
            )

        elif provider == "bedrock":
            logger.info(f"Creating Bedrock client for model: {model}")
            from botocore.config import Config
            from langchain_aws import ChatBedrockConverse

            from .llm import apply_bedrock_decorator, create_cache_modifier

            bedrock_api_key = api_key or os.getenv("AWS_BEARER_TOKEN_BEDROCK")
            if bedrock_api_key:
                os.environ["AWS_BEARER_TOKEN_BEDROCK"] = bedrock_api_key

            # Extract bedrock-specific parameters
            region = extra_kwargs.pop("region", "us-east-1")
            provider_id = extra_kwargs.pop("provider_id", "amazon")
            cache = extra_kwargs.pop("cache", True)
            read_timeout = extra_kwargs.pop("read_timeout", DEFAULT_TIMEOUT)
            connect_timeout = extra_kwargs.pop("connect_timeout", 10.0)
            max_attempts = extra_kwargs.pop("max_attempts", 1)

            # Configure proxy for boto3
            proxy_config = None
            if proxy:
                proxies = {"http": proxy, "https": proxy}
                proxy_config = Config(
                    proxies=proxies,
                    read_timeout=read_timeout,
                    connect_timeout=connect_timeout,
                    retries={"max_attempts": max_attempts, "mode": "standard"},
                )

            llm = ChatBedrockConverse(
                model_id=model,
                max_tokens=max_tokens,
                region_name=region,
                provider=provider_id,
                base_url=base_url,
                config=proxy_config,
                **temperature_kwargs,
                **extra_kwargs,
            )
            
            if cache:
                system_modifier, message_modifier, tools_modifier = (
                    create_cache_modifier(model)
                )
                llm = apply_bedrock_decorator(
                    llm,
                    system_modifier=system_modifier,
                    tools_modifier=tools_modifier,
                    message_modifier=message_modifier,
                )

        elif provider == "anthropic_bedrock":
            from .llm import ChatAnthropicBedrock

            logger.info(f"Creating Anthropic Bedrock client for model: {model}")
            api_key = api_key or os.getenv("AWS_BEARER_TOKEN_BEDROCK")
            if not api_key:
                raise ValueError("AWS_BEARER_TOKEN_BEDROCK must be provided via config or environment variable")
            os.environ["AWS_BEARER_TOKEN_BEDROCK"] = api_key

            region = extra_kwargs.pop("region", "us-east-1")

            llm = ChatAnthropicBedrock(
                model=model,
                max_tokens=max_tokens,
                timeout=timeout,
                region_name=region,
                anthropic_proxy=proxy,
                **temperature_kwargs,
                **extra_kwargs,
            )

        elif provider == "dashscope":
            from langchain_openai import ChatOpenAI

            logger.info(f"Creating DashScope client for {model}")
            api_key = api_key or os.getenv("DASHSCOPE_API_KEY")
            if not api_key:
                raise ValueError("DASHSCOPE_API_KEY must be provided via config or environment variable")

            llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1",
                max_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
                streaming=streaming,
                **temperature_kwargs,
                **extra_kwargs,
            )

        elif provider == "deepseek":
            from .llm import ChatDeepSeek

            logger.info(f"Creating DeepSeek client for {model}")
            api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
            if not api_key:
                raise ValueError("DEEPSEEK_API_KEY must be provided via config or environment variable")
            
            llm_kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "timeout": timeout,
                "max_retries": max_retries,
                "streaming": streaming,
                **extra_kwargs,
            }
            if temperature is not None:
                llm_kwargs["temperature"] = temperature
            if api_key:
                llm_kwargs["api_key"] = api_key
            if base_url:
                llm_kwargs["api_base"] = base_url

            llm = ChatDeepSeek(**llm_kwargs)

        elif provider == "vertex":
            from .llm import VertexAIChat

            logger.info(f"Creating Vertex AI client for {model}")
            api_key = api_key or os.getenv("VERTEX_AI_API_KEY")
            if not api_key:
                raise ValueError("VERTEX_AI_API_KEY must be provided via config or environment variable")

            llm = VertexAIChat(
                name=model,
                api_key=api_key,
                proxy=proxy,
                timeout=timeout,
                **extra_kwargs,
            )

        elif provider == "openai_compatible":
            logger.info(f"Creating OpenAI-compatible client for {model}")

            # Allow custom API key environment variable name
            env_var = api_key_env or "OPENAI_API_KEY"
            api_key = api_key or os.getenv(env_var)
            if not api_key:
                raise ValueError(f"{env_var} must be provided via config or environment variable")

            if not base_url:
                raise ValueError("base_url is required for openai_compatible provider")

            if LLMFactory._should_preserve_reasoning(provider, config, extra_kwargs):
                from .llm import ChatOpenAIReasoning

                logger.info(
                    "Using ChatOpenAIReasoning (preserve & pass back reasoning_content) for %s",
                    model,
                )
                llm_cls = ChatOpenAIReasoning
            else:
                from langchain_openai import ChatOpenAI

                llm_cls = ChatOpenAI

            llm = llm_cls(
                model=model,
                api_key=api_key,
                base_url=base_url,
                openai_proxy=proxy,
                max_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
                streaming=streaming,
                **temperature_kwargs,
                **extra_kwargs,
            )

        elif provider == "gemini":
            from langchain_google_genai import ChatGoogleGenerativeAI

            logger.info(f"Creating Google GenAI client for {model}")

            env_var = api_key_env or "GOOGLE_API_KEY"
            api_key = api_key or os.getenv(env_var)
            if not api_key:
                raise ValueError(f"{env_var} must be provided via config or environment variable")

            llm = ChatGoogleGenerativeAI(
                base_url=base_url,
                google_api_key=api_key,
                model=model,
                max_output_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
                streaming=streaming,
                client_args={"proxy": proxy} if proxy else None,
                **temperature_kwargs,
                **extra_kwargs,
            )

        else:
            raise ValueError(f"Unknown provider: {provider}")

        # Set disable_streaming if supported
        if hasattr(llm, "disable_streaming"):
            llm.disable_streaming = disable_streaming

        return llm
