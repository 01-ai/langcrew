# Search Tools for LangChain
import json
import logging
import os
from abc import ABC, abstractmethod
from enum import Enum
from typing import ClassVar, Literal

import httpx
from langchain.tools import BaseTool
from langchain.tools.tool_node import ToolCallRequest
from langchain_core.messages import ToolMessage
from langcrew.citation import CitationResultItem, CitationResultProvider
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..citation import extract_web_search_citation_items

logger = logging.getLogger(__name__)


class SearchSource(str, Enum):
    """Search source enumeration"""

    BOCHA = "bocha"
    TAVILY = "tavily"
    SERPER = "serper"


class BaseSearchProvider(ABC):
    """Base class (interface) for search providers"""

    @abstractmethod
    async def search(
        self, query: str, query_num: int, time_range: str | None = None, **kwargs
    ) -> str:
        """
        Execute search

        Args:
            query: Search keywords
            query_num: Number of results to return
            time_range: Time range filter (optional, day/week/month/year)

        Returns:
            JSON formatted search results string
        """
        pass


class BochaSearchProvider(BaseSearchProvider):
    """Bocha AI search implementation"""

    def __init__(
        self,
        api_key: str,
        base_url: str | None = None,
    ):
        self.api_key = api_key
        self.base_url = (
            base_url.strip()
            if base_url and base_url.strip()
            else "https://api.bochaai.com/v1/web-search"
        )

    async def search(
        self, query: str, query_num: int, time_range: str | None = None, **kwargs
    ) -> str:
        """Execute search using Bocha AI"""
        # Build request
        payload = {
            "query": query,
            "summary": True,
            "count": query_num,
        }

        # Add time filter only if specified
        if time_range:
            freshness_map = {
                "day": "oneDay",
                "week": "oneWeek",
                "month": "oneMonth",
                "year": "oneYear",
            }
            payload["freshness"] = freshness_map.get(time_range, "noLimit")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # Use async HTTP client to send request
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()

            # Parse response
            result = response.json()

        if result.get("code") != 200:
            return json.dumps(
                [{"error": f"API Error: {result.get('msg', 'Unknown error')}"}],
                ensure_ascii=False,
            )

        # Extract search results
        web_pages = result.get("data", {}).get("webPages", {}).get("value", [])

        # Format results
        formatted_results = []
        for page in web_pages:
            formatted_results.append({
                "title": page.get("name", ""),
                "text": page.get("summary", ""),
                "metadata": {
                    "url": page.get("url", ""),
                    "snippet": page.get("snippet", ""),
                    "site_name": page.get("siteName", ""),
                    "favicon": page.get("siteIcon", ""),
                    "date_published": page.get("datePublished", ""),
                    "engine": "bocha",
                },
            })

        return json.dumps(formatted_results, ensure_ascii=False)


class TavilySearchProvider(BaseSearchProvider):
    """Tavily search implementation"""

    def __init__(self, api_key: str, base_url: str | None = None):
        self.api_key = api_key
        self.base_url = (
            base_url.strip()
            if base_url and base_url.strip()
            else "https://api.tavily.com/search"
        )

    async def search(
        self, query: str, query_num: int, time_range: str | None = None, **kwargs
    ) -> str:
        """Execute search using Tavily"""
        # Build search parameters
        search_params = {
            "api_key": self.api_key,
            "query": query,
            "max_results": query_num,
            "include_favicon": True,
        }

        # Add time_range if provided
        if time_range:
            search_params["time_range"] = time_range

        # Execute search using async HTTP client
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, json=search_params)
            response.raise_for_status()
            result = response.json()

        # Format results
        formatted_results = []
        for item in result.get("results", []):
            formatted_results.append({
                "title": item.get("title", ""),
                "text": item.get("raw_content", ""),
                "metadata": {
                    "url": item.get("url", ""),
                    "snippet": item.get("content", ""),
                    "engine": "tavily",
                    "favicon": item.get("favicon", ""),
                },
            })

        return json.dumps(formatted_results, ensure_ascii=False)


class SerperSearchProvider(BaseSearchProvider):
    """Serper (Google) search implementation"""

    def __init__(self, api_key: str, base_url: str | None = None):
        self.api_key = api_key
        self.base_url = (
            base_url.strip()
            if base_url and base_url.strip()
            else "https://google.serper.dev/search"
        )

    async def search(
        self, query: str, query_num: int, time_range: str | None = None, **kwargs
    ) -> str:
        """Execute search using Serper"""
        # Map time_range to Serper's tbs parameter
        tbs_map = {
            "day": "qdr:d",  # past day
            "week": "qdr:w",  # past week
            "month": "qdr:m",  # past month
            "year": "qdr:y",  # past year
        }

        # Build search parameters
        search_params = {"q": query, "num": query_num}

        # Add time filter if provided
        if time_range and time_range in tbs_map:
            search_params["tbs"] = tbs_map[time_range]

        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}

        # Execute search using async HTTP client
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.base_url, headers=headers, json=search_params
            )
            response.raise_for_status()
            results = response.json()

        # Extract organic search results
        organic = results.get("organic", [])

        # Format results to match other providers' output format
        formatted_results = []
        for item in organic:
            formatted_results.append({
                "title": item.get("title", ""),
                "text": "",
                "metadata": {
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "engine": "serper",
                    "favicon": "",
                },
            })
        return json.dumps(formatted_results, ensure_ascii=False)


class WebSearchInput(BaseToolInput):
    """Input schema for Search Tool"""

    query: str = Field(description="Search keywords, use 1-3 keywords per search")
    query_num: int = Field(default=10, description="Number of search results to return")
    time_range: Literal["day", "week", "month", "year"] | None = Field(
        default=None, description="Time range filter: day, week, month, or year"
    )


class WebSearchTool(BaseTool, CitationResultProvider):
    """Multi-source search tool - specify search source at initialization"""

    name: ClassVar[str] = "web_search"
    description: str = """Perform web search to obtain the latest information related to the query. 
        Returns a list of search results containing titles, URLs and snippets."""
    args_schema: type[BaseModel] = WebSearchInput

    source: SearchSource = Field(description="Search source")
    _provider: BaseSearchProvider = None

    def __init__(
        self,
        source: SearchSource = SearchSource.BOCHA,
        api_key: str = "",
        base_url: str | None = None,
        **kwargs,
    ):
        """
        Initialize multi-source search tool

        Args:
            source: Search source (BOCHA, TAVILY, or SERPER)
            api_key: API Key for the selected search source.
                     If not provided, will fall back to environment variables:
                     - BOCHA_API_KEY for Bocha
                     - TAVILY_API_KEY for Tavily
                     - SERPER_API_KEY for Serper
            base_url: Optional base URL for the search API. If non-empty, overrides
                      the default endpoint; otherwise the provider default is used.
        """
        super().__init__(source=source, **kwargs)

        # Determine the environment variable name based on source
        env_var_map = {
            SearchSource.BOCHA: "BOCHA_API_KEY",
            SearchSource.TAVILY: "TAVILY_API_KEY",
            SearchSource.SERPER: "SERPER_API_KEY",
        }

        # Get API key from parameter or environment variable
        env_var_name = env_var_map.get(source)
        final_api_key = api_key or os.getenv(env_var_name, "")

        if not final_api_key:
            raise ValueError(
                f"api_key is required for {source.value} search source. "
                f"Provide it as parameter or set {env_var_name} environment variable"
            )

        # Initialize the corresponding provider based on the specified search source
        if source == SearchSource.BOCHA:
            self._provider = BochaSearchProvider(
                api_key=final_api_key, base_url=base_url
            )
        elif source == SearchSource.TAVILY:
            self._provider = TavilySearchProvider(
                api_key=final_api_key, base_url=base_url
            )
        elif source == SearchSource.SERPER:
            self._provider = SerperSearchProvider(
                api_key=final_api_key, base_url=base_url
            )
        else:
            raise ValueError(f"Unsupported search source: {source}")

    def _run(
        self, query: str, query_num: int = 5, time_range: str | None = None, **kwargs
    ) -> str:
        """Synchronous method is not supported, please use async version"""
        raise NotImplementedError(
            "Synchronous method is not supported, please use async framework to call _arun method."
            "This tool only supports async execution. Use _arun instead."
        )

    async def _arun(
        self, query: str, query_num: int = 5, time_range: str | None = None, **kwargs
    ) -> str:
        """Execute search asynchronously and return results"""
        try:
            # Use the search provider specified at initialization (async call)
            return await self._provider.search(
                query=query, query_num=query_num, time_range=time_range, **kwargs
            )

        except Exception as e:
            logger.error(f"Search error: {e}")
            return json.dumps(
                [{"error": f"Search error: {str(e)}"}], ensure_ascii=False
            )

    def extract_citation_items(
        self,
        request: ToolCallRequest,
        message: ToolMessage,
    ) -> list[CitationResultItem] | None:
        """Extract citable search entries without changing normal Tool output."""
        return extract_web_search_citation_items(message.content)
