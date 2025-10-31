# Web Fetch Tools for LangChain
# Provides web crawling functionality using crawl4ai HTTP service

import asyncio
import logging
import os
import time
from typing import Any, ClassVar, Literal

import aiohttp
from langcrew.tools import ExternalCompletionBaseTool
from pydantic import BaseModel, Field

from ..base import BaseToolInput

logger = logging.getLogger(__name__)


class WebFetchInput(BaseToolInput):
    """Input for WebFetchInput."""

    url: str = Field(..., description="Target webpage URL to crawl")
    filter_type: Literal["llm", "pruning"] = Field(
        default="pruning",
        description="Content filter type: 'llm' for LLM-based filtering or 'pruning' for threshold-based filtering",
    )


class WebFetchTool(ExternalCompletionBaseTool):
    """Tool for crawling web pages and extracting content in markdown format.

    This tool uses crawl4ai HTTP service to extract content from web pages
    with support for LLM-based or pruning-based content filtering.
    """

    name: ClassVar[str] = "web_fetch"
    args_schema: type[BaseModel] = WebFetchInput
    description: ClassVar[str] = (
        "Crawl a web page and extract its content in markdown format. "
        "Automatically filters out navigation, ads, and other irrelevant content with optimized settings."
    )

    # Configuration with best practice defaults
    timeout: int = Field(default=120)
    max_content_length: int = Field(default=128000)  # Optimized for LLM token limits
    filter_type: Literal["llm", "pruning"] = Field(default="pruning")
    crawl4ai_service_url: str = Field(
        default="http://localhost:11235", description="Crawl4ai HTTP service URL"
    )
    crawl4ai_llm_provider: str = Field(
        default="openai/gpt-4o-mini",
        description="LLM provider for crawl4ai content filtering",
    )
    crawl4ai_llm_api_key: str = Field(
        default=None, description="API key for crawl4ai LLM provider"
    )
    proxy: str = Field(default=None)  # HTTP proxy for web requests

    def __init__(
        self,
        timeout: int | None = None,
        max_content_length: int | None = None,
        filter_type: Literal["llm", "pruning"] | None = None,
        crawl4ai_service_url: str | None = None,
        crawl4ai_llm_provider: str | None = None,
        crawl4ai_llm_api_key: str | None = None,
        proxy: str | None = None,
        **kwargs,
    ):
        """Initialize WebFetchTool with crawl4ai configuration.

        Configuration priority (highest to lowest):
        1. Constructor parameters
        2. Environment variables (LANGCREW_CRAWL4AI_*)
        3. OPENAI_API_KEY for crawl4ai_llm_api_key
        4. Field default values

        Args:
            timeout: Request timeout in seconds (default: 120)
            max_content_length: Maximum content length before truncation (default: 128000)
            filter_type: Content filter type: 'llm' or 'pruning' (default: 'pruning')
            crawl4ai_service_url: Crawl4ai HTTP service URL (default: 'http://localhost:11235')
            crawl4ai_llm_provider: LLM provider for crawl4ai content filtering (default: 'openai/gpt-4o-mini')
            crawl4ai_llm_api_key: API key for crawl4ai LLM provider (default: uses OPENAI_API_KEY)
            proxy: HTTP proxy for web requests (default: None)
        """
        super().__init__(**kwargs)

        # Load configuration with priority
        self.crawl4ai_service_url = (
            crawl4ai_service_url
            or os.getenv("LANGCREW_CRAWL4AI_SERVICE_URL")
            or self.crawl4ai_service_url
        )
        self.timeout = (
            timeout or int(os.getenv("LANGCREW_WEB_FETCH_TIMEOUT", "0")) or self.timeout
        )
        self.max_content_length = (
            max_content_length
            or int(os.getenv("LANGCREW_WEB_FETCH_MAX_CONTENT_LENGTH", "0"))
            or self.max_content_length
        )
        self.filter_type = (
            filter_type
            or os.getenv("LANGCREW_WEB_FETCH_FILTER_TYPE")
            or self.filter_type
        )
        self.crawl4ai_llm_provider = (
            crawl4ai_llm_provider
            or os.getenv("LANGCREW_CRAWL4AI_LLM_PROVIDER")
            or self.crawl4ai_llm_provider
        )
        self.crawl4ai_llm_api_key = (
            crawl4ai_llm_api_key
            or os.getenv("LANGCREW_CRAWL4AI_LLM_API_KEY")
            or os.getenv("OPENAI_API_KEY")  # Fallback to OPENAI_API_KEY
            or self.crawl4ai_llm_api_key
        )
        self.proxy = proxy or os.getenv("LANGCREW_WEB_FETCH_PROXY") or self.proxy

        # Intelligent fallback: if LLM mode selected but no API key, switch to pruning
        if self.filter_type == "llm" and not self.crawl4ai_llm_api_key:
            logger.warning(
                "LLM filter type selected but no crawl4ai API key provided. "
                "Falling back to pruning mode for better compatibility."
            )
            self.filter_type = "pruning"

    async def _arun_custom_event(
        self,
        url: str,
        filter_type: Literal["llm", "pruning"] | None = None,
        **kwargs,
    ) -> dict[str, Any]:
        """Crawl web page asynchronously using crawl4ai HTTP service."""
        logger.info(f"Starting web crawl via HTTP service. URL: {url}")
        start_time = time.time()

        # Use provided filter_type or fall back to instance default
        filter_type = filter_type or self.filter_type

        # Build strategy-specific configuration
        if filter_type == "pruning":
            content_filter_config = {
                "type": "PruningContentFilter",
                "params": {
                    "threshold": 0.45,
                    "threshold_type": "dynamic",
                    "min_word_threshold": 5,
                },
            }
            logger.info(
                "Using PruningContentFilter with threshold=0.45, type=dynamic, min_words=5"
            )
        else:
            content_filter_config = {
                "type": "LLMContentFilter",
                "params": {
                    "llm_config": {
                        "type": "LLMConfig",
                        "params": {
                            "provider": self.crawl4ai_llm_provider,
                            "api_token": self.crawl4ai_llm_api_key,
                        },
                    },
                    "instruction": """
                    Focus on extracting the core educational content.
                    Include:
                    - Key concepts and explanations
                    - Important code examples
                    - Essential technical details
                    - Main article content and blog posts
                    - Structured data like lists, tables when relevant
                    
                    Exclude:
                    - Navigation elements
                    - Sidebars
                    - Footer content
                    - Advertisements and promotional content
                    - Social media widgets and share buttons
                    - Comment sections and user-generated side content
                    - Copyright notices and legal disclaimers
                    
                    Format the output as clean markdown with proper code blocks and headers.
                    """,
                    "chunk_token_threshold": 4096,
                    "verbose": True,
                },
            }
            logger.info(f"Using LLMContentFilter with {self.crawl4ai_llm_provider}")

        # Build request payload following crawl4ai API structure
        payload = {
            "urls": [url],  # Must be a list
            "browser_config": {
                "type": "BrowserConfig",
                "params": {
                    "headless": True,
                    "viewport_width": 1920,
                    "viewport_height": 1080,
                    **({"proxy": self.proxy} if self.proxy else {}),
                },
            },
            "crawler_config": {
                "type": "CrawlerRunConfig",
                "params": {
                    "cache_mode": "bypass",
                    "excluded_tags": ["nav", "aside", "footer", "header"],
                    "exclude_external_links": True,
                    "exclude_social_media_links": True,
                    "remove_overlay_elements": True,
                    "remove_forms": True,
                    "process_iframes": False,
                    "screenshot": False,
                    "markdown_generator": {
                        "type": "DefaultMarkdownGenerator",
                        "params": {
                            "content_filter": content_filter_config,
                            "options": {
                                "type": "dict",
                                "value": {
                                    "skip_internal_links": True,
                                    "escape_html": False,
                                    "ignore_links": False,
                                    "body_only": True,
                                    "normalize_whitespace": True,
                                    "remove_comments": True,
                                    "remove_empty_tags": True,
                                    "skip_external_links": True,
                                    "beautify": True,
                                },
                            },
                        },
                    },
                },
            },
        }

        # Make HTTP request to crawl4ai service
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.crawl4ai_service_url}/crawl",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=self.timeout),
            ) as response:
                if response.status == 200:
                    data = await response.json()

                    # Extract content from crawl4ai response
                    if data.get("success"):
                        results = data.get("results", [])
                        if results and len(results) > 0:
                            first_result = results[0]

                            # Extract markdown content from result
                            markdown_data = first_result.get("markdown", {})
                            if isinstance(markdown_data, dict):
                                # Try to get fit_markdown first (for LLM filter), then raw_markdown
                                content = markdown_data.get(
                                    "fit_markdown"
                                ) or markdown_data.get("raw_markdown", "")
                            else:
                                content = markdown_data or ""

                            # Truncate if needed
                            if content and len(content) > self.max_content_length:
                                content = (
                                    content[: self.max_content_length]
                                    + "\n\n[Content truncated...]"
                                )

                            logger.info(
                                f"Web fetch completed. Time taken: {time.time() - start_time:.2f}s"
                            )
                            return content or "No content extracted"
                        else:
                            logger.error("No results returned from crawl4ai service")
                            return "No results returned from crawl4ai service"
                    else:
                        error_msg = data.get(
                            "error", "Unknown error from crawl4ai service"
                        )
                        logger.error(f"Crawl4ai service error: {error_msg}")
                        return f"Failed to crawl the webpage: {error_msg}"
                else:
                    error_text = await response.text()
                    logger.error(f"HTTP error {response.status}: {error_text}")
                    return f"HTTP error {response.status}: Failed to connect to crawl4ai service"
