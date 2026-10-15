import json
from unittest.mock import AsyncMock, Mock, patch

import pytest

from langcrew_tools.search.langchain_tools import (
    BochaSearchProvider,
    SerperSearchProvider,
    TavilySearchProvider,
)


def _response(payload: dict) -> Mock:
    response = Mock()
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


@pytest.mark.asyncio
async def test_bocha_preserves_upstream_site_name():
    response = _response(
        {
            "code": 200,
            "data": {
                "webPages": {
                    "value": [
                        {
                            "name": "Article title",
                            "url": "https://example.com/article",
                            "snippet": "Snippet",
                            "siteName": "Example News",
                        }
                    ]
                }
            },
        },
    )

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=response)):
        result = await BochaSearchProvider("key").search("query", 1)

    assert json.loads(result)[0]["metadata"]["site_name"] == "Example News"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("provider", "payload"),
    [
        (
            TavilySearchProvider("key"),
            {
                "results": [
                    {
                        "title": "Article title",
                        "url": "https://example.com/article",
                        "content": "Snippet",
                    }
                ]
            },
        ),
        (
            SerperSearchProvider("key"),
            {
                "organic": [
                    {
                        "title": "Article title",
                        "link": "https://example.com/article",
                        "snippet": "Snippet",
                    }
                ]
            },
        ),
    ],
)
async def test_provider_does_not_invent_missing_site_name(provider, payload):
    with patch(
        "httpx.AsyncClient.post",
        new=AsyncMock(return_value=_response(payload)),
    ):
        result = await provider.search("query", 1)

    assert "site_name" not in json.loads(result)[0]["metadata"]
