# Search Tools for LangChain
# Provides web search functionality using external retriever service

import logging
import os
import time
from typing import Any, ClassVar

import httpx
from langcrew.tools import ExternalCompletionBaseTool
from pydantic import BaseModel, Field

from ..base import BaseToolInput

logger = logging.getLogger(__name__)


class WebSearchInput(BaseToolInput):
    """Input for WebSearchTool."""

    query: str = Field(..., description="Search keywords")
    query_num: int = Field(default=20, description="Number of search results to return")


class WebSearchTool(ExternalCompletionBaseTool):
    """Tool for performing web search to obtain latest information."""

    name: ClassVar[str] = "web_search"
    args_schema: type[BaseModel] = WebSearchInput
    description: ClassVar[str] = (
        "Perform web search to obtain the latest information related to the query. "
        "Returns a list of search results containing titles, URLs and snippets."
    )

    # Configuration for the retriever service
    endpoint: str = Field(default=None, description="Web search service endpoint URL")
    api_key: str = Field(default=None, description="API key for authentication")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    language: str = Field(default="en", description="Default search language")

    def __init__(
        self,
        endpoint: str | None = None,
        api_key: str | None = None,
        timeout: int | None = None,
        language: str | None = None,
        **kwargs,
    ):
        """Initialize WebSearchTool with optional configuration.

        Configuration priority (highest to lowest):
        1. Constructor parameters
        2. Environment variables (LANGCREW_WEB_SEARCH_*)
        3. Field default values

        Args:
            endpoint: Web search service endpoint URL
            api_key: API key for authentication
            timeout: Request timeout in seconds
            language: Default search language ('en' or 'zh')
        """
        super().__init__(**kwargs)

        # Load configuration with priority
        self.endpoint = (
            endpoint or os.getenv("LANGCREW_WEB_SEARCH_ENDPOINT") or self.endpoint
        )
        self.api_key = (
            api_key or os.getenv("LANGCREW_WEB_SEARCH_API_KEY") or self.api_key
        )
        self.timeout = (
            timeout
            or int(os.getenv("LANGCREW_WEB_SEARCH_TIMEOUT", "0"))
            or self.timeout
        )
        self.language = (
            language or os.getenv("LANGCREW_WEB_SEARCH_LANGUAGE") or self.language
        )

        # Validate required configuration
        if not self.endpoint:
            raise ValueError(
                "Web search endpoint is required. "
                "Please set it via constructor parameter or "
                "LANGCREW_WEB_SEARCH_ENDPOINT environment variable."
            )
        if not self.api_key:
            raise ValueError(
                "API key is required. "
                "Please set it via constructor parameter or "
                "LANGCREW_WEB_SEARCH_API_KEY environment variable."
            )

    async def _arun_custom_event(
        self,
        query: str,
        query_num: int = 10,
        **kwargs,
    ) -> list[dict[str, Any]]:
        """Perform web search asynchronously."""
        logger.info(f"Starting web search. Query: {query}, Language: {self.language}")
        start_time = time.time()

        headers = {
            "Authorization": self.api_key,
            "Content-type": "application/json",
        }

        request_data = {
            "connectors": ["search_one_v3"],
            "customQuery": [query],
            "skip_judger": True,
            "queryNum": query_num,
            "closeOnlineCrawler": False,
            "closeDatabase": False,
            "closeReranker": False,
        }

        # Set retriever_source based on language
        if self.language == "zh":
            request_data["retriever_source"] = "bocha"

        search_result_list = []
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url=self.endpoint,
                    headers=headers,
                    json=request_data,
                )
                response.raise_for_status()
                response_data = response.json()
                search_result_list = response_data.get("data", {}).get(
                    "search_info", []
                )

        except Exception as e:
            logger.error(f"An error occurred during web search: {e}")
            # Don't log sensitive information like API keys
            if "401" in str(e) or "403" in str(e):
                logger.error(
                    "Authentication failed. Please check your API key configuration."
                )
            # Return empty list instead of raising exception to avoid breaking the flow
            return []

        logger.info(
            f"Web search completed. Time taken: {time.time() - start_time:.2f}s. "
            f"Results: {len(search_result_list)}"
        )

        return search_result_list
