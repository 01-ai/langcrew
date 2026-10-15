"""
Content extraction tools for browser automation

This module provides tools for extracting text and hyperlinks from web pages.
Supports Markdown conversion for better structure and readability.
"""

import logging
from typing import Literal

from langchain_core.callbacks import AsyncCallbackManagerForToolRun
from pydantic import BaseModel, Field

from .base import CDPBrowserTool

logger = logging.getLogger(__name__)


class ExtractTextInput(BaseModel):
    """Input schema for extract text tool"""

    format: Literal["markdown", "text", "html"] = Field(
        default="markdown",
        description=(
            "Output format: "
            "'markdown' (default, preserves structure, most readable), "
            "'text' (plain text only), "
            "'html' (cleaned HTML)"
        ),
    )
    max_chars: int = Field(
        default=10000,
        description="Maximum number of characters to extract (default: 10000 to save tokens)",
    )


class ExtractTextTool(CDPBrowserTool):
    """
    Extract main content from the current webpage in various formats.

    Uses intelligent content extraction (trafilatura) that automatically:
    - Removes ads, navigation, footers, CSS, JavaScript
    - Identifies and extracts main article/content
    - Preserves structure in Markdown format

    Supports Markdown (default, recommended), plain text, or cleaned HTML.
    """

    name: str = "browser_extract_text"
    description: str = "Extract full page content from the current webpage. Not only the viewport content, but the entire page content."
    args_schema: type[BaseModel] = ExtractTextInput

    async def _arun(
        self,
        format: Literal["markdown", "text", "html"] = "markdown",
        max_chars: int = 10000,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Extract content from the page in specified format"""
        try:
            # Check for beautifulsoup4
            try:
                from bs4 import BeautifulSoup
            except ImportError:
                return self._error_response(
                    "The 'beautifulsoup4' package is required. "
                    "Install it with: pip install beautifulsoup4 lxml"
                )

            page = await self._get_page()

            # Get HTML content
            html_content = await page.content()

            # Parse with BeautifulSoup
            # soup = BeautifulSoup(html_content, "lxml")

            # # Remove script, style, and other non-content elements
            # for tag in soup(["script", "style", "meta", "noscript", "svg", "path"]):
            #     tag.decompose()

            # Extract based on format
            if format == "markdown":
                # Try trafilatura first (best for content extraction)
                content = _extract_markdown_from_html(html_content)

                # If trafilatura fails or returns insufficient content, fallback to plain text
                if not content or len(content.strip()) < 50:
                    logger.warning(
                        "Markdown extraction insufficient, falling back to plain text"
                    )
                    soup = BeautifulSoup(html_content, "lxml")
                    for tag in soup([
                        "script",
                        "style",
                        "meta",
                        "noscript",
                        "svg",
                        "path",
                    ]):
                        tag.decompose()
                    content = " ".join(soup.stripped_strings)
            elif format == "text":
                soup = BeautifulSoup(html_content, "lxml")
                # Remove script, style, and other non-content elements
                for tag in soup(["script", "style", "meta", "noscript", "svg", "path"]):
                    tag.decompose()
                content = " ".join(soup.stripped_strings)
            elif format == "html":
                soup = BeautifulSoup(html_content, "lxml")
                # Remove script, style, and other non-content elements
                for tag in soup(["script", "style", "meta", "noscript", "svg", "path"]):
                    tag.decompose()
                # Clean HTML - remove excessive whitespace
                content = str(soup.body) if soup.body else str(soup)
            else:
                return self._error_response(f"Unsupported format: {format}")

            # Truncate if too long
            original_length = len(content)
            truncated = False
            if len(content) > max_chars:
                content = content[:max_chars]
                truncated = True
                logger.info(
                    f"Truncated content from {original_length} to {max_chars} characters"
                )

            # Get browser state for context
            state = await self._get_browser_state(page)

            result = {
                "url": state.get("url", ""),
                "title": state.get("title", ""),
                "content": content,
                "format": format,
                "char_count": len(content),
                "original_length": original_length,
                "truncated": truncated,
            }

            logger.info(
                f"Extracted {len(content)} characters ({format} format) from {state.get('url', '')}"
            )
            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Extract text error: {e}")
            return self._error_response(f"Failed to extract text: {str(e)}")


def _extract_markdown_from_html(html: str) -> str:
    """
    Extract main content from HTML and convert to Markdown

    Two-step approach (same as web_fetch.py):
    1. trafilatura extracts main content (removes ads, nav, CSS) → HTML
    2. markdownify converts clean HTML → Markdown

    Args:
        html: Raw HTML content

    Returns:
        Clean Markdown text or empty string if extraction fails
    """
    try:
        import trafilatura

        # Step 1: Extract main content as clean HTML
        extracted_html = trafilatura.extract(
            html,
            include_links=True,
            include_images=False,  # Images use too many tokens
            include_tables=True,
            no_fallback=False,
            favor_recall=True,  # Prefer getting all content
            favor_precision=False,
            deduplicate=True,
            output_format="html",  # ← Key: extract as HTML first, not markdown
        )

        if extracted_html and len(extracted_html.strip()) > 100:
            # Step 2: Convert clean HTML to Markdown
            try:
                from markdownify import markdownify as md

                markdown_text = md(
                    extracted_html,
                    heading_style="ATX",  # Use # for headings
                    bullets="-",  # Use - for lists
                    strip=["script", "style"],
                )
                logger.info(
                    "Successfully extracted markdown (trafilatura + markdownify)"
                )
                return markdown_text.strip()
            except ImportError:
                logger.warning("markdownify not available, returning extracted HTML")
                return extracted_html.strip()

        logger.warning("trafilatura returned insufficient content (< 100 chars)")
        return ""

    except ImportError:
        logger.debug("trafilatura not available")
        return ""
    except Exception as e:
        logger.error(f"Markdown extraction error: {e}")
        return ""


class ExtractHyperlinksInput(BaseModel):
    """Input schema for extract hyperlinks tool"""

    absolute_urls: bool = Field(
        default=True, description="Return absolute URLs (recommended, default True)"
    )
    include_text: bool = Field(
        default=True,
        description="Include link text for context (recommended, default True)",
    )
    max_links: int = Field(
        default=100,
        description="Maximum number of links to return (default: 100 to save tokens)",
    )


class ExtractHyperlinksTool(CDPBrowserTool):
    """
    Extract hyperlinks from the current webpage with text context.

    Returns structured link data including link text, URL, and optional title attribute.
    Much more useful than raw URLs as AI can understand what each link is for.
    """

    name: str = "extract_hyperlinks"
    description: str = (
        "Extract hyperlinks from the current webpage with link text for context. "
        "Returns a list of {text, url, title} objects (max 100 by default). "
        "This helps understand what each link is for, not just where it goes."
    )
    args_schema: type[BaseModel] = ExtractHyperlinksInput

    async def _arun(
        self,
        absolute_urls: bool = True,
        include_text: bool = True,
        max_links: int = 100,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Extract all hyperlinks from the page with context"""
        try:
            # Check for beautifulsoup4
            try:
                from bs4 import BeautifulSoup
            except ImportError:
                return self._error_response(
                    "The 'beautifulsoup4' package is required. "
                    "Install it with: pip install beautifulsoup4 lxml"
                )

            from urllib.parse import urljoin

            page = await self._get_page()

            # Get HTML content
            html_content = await page.content()

            # Parse with BeautifulSoup
            soup = BeautifulSoup(html_content, "lxml")

            # Find all anchor elements
            anchors = soup.find_all("a")

            base_url = page.url if absolute_urls else ""

            # Extract link data with context
            links = []
            seen_urls = set()  # For deduplication

            for anchor in anchors:
                href = anchor.get("href", "").strip()
                if not href or href.startswith(("#", "javascript:", "mailto:")):
                    continue

                # Convert to absolute URL if requested
                if absolute_urls:
                    url = urljoin(base_url, href)
                else:
                    url = href

                # Skip duplicates
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                if include_text:
                    # Extract link text (visible text within the anchor)
                    text = anchor.get_text(strip=True)
                    # If no text, try aria-label or title
                    if not text:
                        text = (
                            anchor.get("aria-label", "")
                            or anchor.get("title", "")
                            or "[No text]"
                        )

                    # Get title attribute if present
                    title_attr = anchor.get("title", "")

                    link_data = {
                        "text": text[:100],  # Limit text length
                        "url": url,
                    }
                    if title_attr:
                        link_data["title"] = title_attr[:100]

                    links.append(link_data)
                else:
                    # Simple URL list
                    links.append(url)

            # Limit number of links
            total_links = len(links)
            if len(links) > max_links:
                links = links[:max_links]
                logger.info(f"Limiting links from {total_links} to {max_links}")

            # Get browser state for context
            state = await self._get_browser_state(page)

            result = {
                "url": state.get("url", ""),
                "title": state.get("title", ""),
                "link_count": len(links),
                "total_links": total_links,
                "links": links,
                "format": "structured" if include_text else "simple",
            }

            logger.info(
                f"Extracted {len(links)} unique links "
                f"({'with text' if include_text else 'URLs only'}) "
                f"from {state.get('url', '')}"
            )
            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Extract hyperlinks error: {e}")
            return self._error_response(f"Failed to extract hyperlinks: {str(e)}")
