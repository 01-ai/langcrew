"""Citation mappings shared by LangCrew's built-in web tools."""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from langcrew.citation import CitationResultItem, CitationSource


def normalize_web_url(value: str) -> str:
    try:
        parts = urlsplit(value.strip())
        port = f":{parts.port}" if parts.port else ""
    except ValueError:
        return value.strip()
    scheme = parts.scheme.lower()
    hostname = (parts.hostname or "").lower()
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((scheme, f"{hostname}{port}", path, parts.query, ""))


def web_site_name(url: str) -> str:
    hostname = urlsplit(url).hostname or ""
    return hostname.removeprefix("www.")


def web_search_citation_item(item: dict[str, Any]) -> CitationResultItem | None:
    raw_metadata = item.get("metadata")
    metadata: dict[str, Any] = raw_metadata if isinstance(raw_metadata, dict) else {}
    url = str(item.get("url") or metadata.get("url") or "").strip()
    if not url:
        return None
    title = str(item.get("title") or item.get("name") or "").strip()
    evidence = str(
        item.get("text") or item.get("content") or metadata.get("snippet") or ""
    ).strip()
    snippet = str(metadata.get("snippet") or evidence).strip()[:1000]
    favicon = str(metadata.get("favicon") or metadata.get("siteIcon") or "")
    published_at = str(
        metadata.get("date_published") or metadata.get("datePublished") or ""
    )
    site_name = str(metadata.get("site_name") or "").strip() or web_site_name(url)
    return CitationResultItem(
        value=item,
        source=CitationSource(
            type="web",
            source_key=normalize_web_url(url),
            data={
                "title": title,
                "url": url,
                "site_name": site_name,
                "favicon_url": favicon,
                "published_at": published_at,
                "snippet": snippet,
            },
        ),
    )


def extract_web_search_citation_items(
    content: Any,
) -> list[CitationResultItem] | None:
    """Extract ordered Citation items from a Web Search ToolMessage content."""
    try:
        values = json.loads(content) if isinstance(content, str) else content
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError(
            "Web Search citation extraction expected a JSON array"
        ) from exc
    if not isinstance(values, list):
        raise ValueError("Web Search citation extraction expected a result array")

    items = [
        web_search_citation_item(value)
        if isinstance(value, dict)
        else CitationResultItem(value=value)
        for value in values
    ]
    resolved = [
        item if item is not None else CitationResultItem(value=value)
        for item, value in zip(items, values)
    ]
    return resolved if any(item.source is not None for item in resolved) else None


def web_fetch_citation_item(url: str, content: str) -> CitationResultItem | None:
    url = url.strip()
    content = content.strip()
    if (
        not url
        or urlsplit(url).scheme.lower() not in {"http", "https"}
        or not content
        or content.startswith("Failed to fetch ")
        or "Browser fetch returned minimal content" in content
    ):
        return None
    site_name = web_site_name(url)
    return CitationResultItem(
        value=content,
        source=CitationSource(
            type="web",
            source_key=normalize_web_url(url),
            data={
                "title": site_name or url,
                "url": url,
                "site_name": site_name,
                "snippet": content[:1000],
            },
        ),
    )
