import ipaddress
import logging
from typing import ClassVar
from urllib.parse import urlparse

import chardet
import httpx
import trafilatura
from langchain.tools import BaseTool
from langchain.tools.tool_node import ToolCallRequest
from langchain_core.messages import ToolMessage
from langcrew.citation import CitationResultItem, CitationResultProvider
from markdownify import markdownify as md
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..citation import web_fetch_citation_item

logger = logging.getLogger(__name__)

# Fallback encodings when chardet detection fails or is incorrect
FALLBACK_ENCODINGS = ['gbk', 'gb2312', 'gb18030', 'big5']


class WebFetchInput(BaseToolInput):
    """Input for Web Fetch tool."""

    url: str = Field(
        description="URL of the webpage to extract content from (e.g., https://example.com/article)"
    )


class WebFetchTool(BaseTool, CitationResultProvider):
    handle_tool_error: bool = Field(
        default=True, description="Whether to handle tool error"
    )
    name: ClassVar[str] = "web_fetch"
    description: str = """
    Retrieves content from a specified URL and converts it to readable Markdown format.
    Use this tool when you need to:
    - Extract content from HTML web pages and convert it to Markdown format
    - Get clean text without ads or navigation from websites
    
    When NOT to use:
    - PDFs and Office documents (Word, Excel, PowerPoint)
    - Plain text files (.txt, .log, .md if raw markdown)
    - Code files (.py, .js, .ts, .java, .cpp, etc.)
    - Configuration files (.json, .xml, .yaml, .ini, .toml, etc.)
    """
    args_schema: type[BaseModel] = WebFetchInput
    timeout: int = Field(default=60, description="Request timeout in seconds")
    # Realistic browser headers
    headers: dict = Field(
        default={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
        }
    )
    max_chars: int = Field(
        default=50000,
        description="Maximum number of characters to extract from the webpage",
    )

    def _validate_url(self, url: str) -> None:
        """
        Prevent SSRF attacks by validating URLs.

        Args:
            url: URL to validate

        Raises:
            ValueError: If URL is invalid or unsafe
        """
        parsed = urlparse(url)

        # Only allow http/https
        if parsed.scheme not in ["http", "https"]:
            raise ValueError(f"Invalid URL: Unsupported protocol {parsed.scheme}")

        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Invalid URL: Missing hostname")

        # Block office document and non-HTML text file extensions
        # This tool uses trafilatura which expects HTML input, so we should block
        # plain text files, code files, and configuration files
        forbidden_extensions = [
            # Office documents
            ".pdf",
            ".doc",
            ".docx",
            ".csv",
            ".xlsx",
            ".xls",
            ".ppt",
            ".pptx",
            # Plain text files
            ".txt",
            ".log",
            ".md",  # Markdown (if server returns raw markdown, not HTML)
            # Code files
            ".py",
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".java",
            ".cpp",
            ".c",
            ".h",
            ".hpp",
            ".sh",
            ".bash",
            ".rb",
            ".go",
            ".rs",
            ".php",
            ".css",
            ".less",
            ".scss",
            ".sass",
            # Configuration/data files
            ".json",
            ".xml",
            ".yaml",
            ".yml",
            ".ini",
            ".conf",
            ".cfg",
            ".properties",
            ".toml",
        ]
        path = parsed.path.lower()
        if any(path.endswith(ext) for ext in forbidden_extensions):
            raise ValueError(
                "Invalid URL: Web_fetch tool only supports HTML web pages. "
                "It cannot parse office documents, plain text files, code files, or configuration files. "
                "Please use other tools for these file types."
            )

        # Block private IPs and localhost
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                raise ValueError(
                    f"Invalid URL: Access denied to private network {hostname}"
                )
        except ValueError:
            # Not an IP, check forbidden domains
            if hostname in ["localhost", "127.0.0.1", "0.0.0.0", "::1"]:
                raise ValueError(f"Invalid URL: Access denied to {hostname}")

    def _try_decode(self, content_bytes: bytes, encoding: str) -> str | None:
        """Try to decode bytes with given encoding, return None if fails."""
        try:
            return content_bytes.decode(encoding)
        except (UnicodeDecodeError, LookupError, AttributeError):
            return None

    async def _fetch_with_httpx(self, url: str) -> str:
        """Fetch HTML using httpx with async I/O and proper encoding detection."""
        self._validate_url(url)

        try:
            async with httpx.AsyncClient(
                headers=self.headers, follow_redirects=True, verify=False
            ) as client:
                response = await client.get(url, timeout=self.timeout)

                if response.status_code == 403:
                    raise Exception("ACCESS_DENIED_403")
                if response.status_code == 404:
                    raise Exception("NOT_FOUND_404")

                response.raise_for_status()

                content_bytes = response.content
                
                # Try HTTP header encoding
                if response.charset_encoding:
                    result = self._try_decode(content_bytes, response.charset_encoding)
                    if result:
                        return result
                    logger.warning(f"Failed to decode with charset {response.charset_encoding}")
                
                # Auto-detect encoding with chardet
                detected = chardet.detect(content_bytes)
                encoding = detected.get('encoding')
                confidence = detected.get('confidence', 0)
                
                if encoding:
                    logger.info(f"Detected encoding: {encoding} (confidence: {confidence:.2%})")
                    result = self._try_decode(content_bytes, encoding)
                    if result:
                        return result
                    logger.warning(f"Failed to decode with detected encoding {encoding}")
                
                # Try fallback encodings (chardet can be wrong about CJK encodings)
                for fallback_encoding in FALLBACK_ENCODINGS:
                    result = self._try_decode(content_bytes, fallback_encoding)
                    if result:
                        return result

                # Final fallback: use utf-8 and ignore errors
                return content_bytes.decode('utf-8', errors='replace')

        except httpx.HTTPStatusError as e:
            raise Exception(f"HTTP_{e.response.status_code}")
        except httpx.RequestError as e:
            raise Exception(f"URL_ERROR: {str(e)}")
        except Exception as e:
            raise Exception(f"FETCH_ERROR: {str(e)}")

    async def _fetch_with_browser(self, url: str, max_chars: int) -> str:
        try:
            html = await self._fetch_with_playwright(url)
            markdown = self._extract_markdown_from_html(html)

            if len(markdown.strip()) < 50:
                return (
                    f"⚠️ Browser fetch returned minimal content from {url}\n"
                    f"The page may be:\n"
                    f"- Empty or error page\n"
                    f"- Requires login/authentication\n"
                    f"- Blocked automated access\n"
                )

            return self._format_success(url, markdown, max_chars)

        except Exception:
            raise

    async def _fetch_with_playwright(self, url: str) -> str:
        """Fetch HTML using Playwright with proper resource cleanup."""
        try:
            async with Stealth().use_async(async_playwright()) as p:
                browser = await p.chromium.launch(
                    headless=True,
                    channel="chromium",
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                        "--disable-web-security",
                        "--disable-features=IsolateOrigins,site-per-process",
                    ],
                )
                context = await browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent=self.headers["User-Agent"],
                    ignore_https_errors=True,
                )
                page = await context.new_page()

                await page.goto(
                    url, wait_until="networkidle", timeout=self.timeout * 1000
                )
                content = await page.content()

                await browser.close()
                return content

        except Exception as e:
            raise Exception(f"PLAYWRIGHT_ERROR: {str(e)}")

    def _extract_markdown_from_html(self, html: str) -> str:
        try:
            extracted_html = trafilatura.extract(
                html,
                include_links=True,
                include_images=True,
                include_tables=True,
                no_fallback=False,
                favor_recall=True,
                favor_precision=False,
                deduplicate=True,
                output_format="html",
            )

            if extracted_html and len(extracted_html.strip()) > 100:
                # Convert to Markdown
                markdown_text = md(
                    extracted_html,
                    heading_style="ATX",
                    bullets="-",
                    strip=["script", "style"],
                )
                return markdown_text.strip()

            logger.warning("trafilatura failed to extract content")
            return ""

        except Exception as e:
            logger.error(f"trafilatura Exception: {e}")
            return ""

    def _run(
        self,
        url: str,
        **kwargs,
    ) -> str:
        raise NotImplementedError("web_fetch only supports async execution.")

    async def _arun(
        self,
        url: str,
        **kwargs,
    ) -> str:
        """Run the tool asynchronously."""
        return await self._arun_internal(url)

    def extract_citation_items(
        self,
        request: ToolCallRequest,
        message: ToolMessage,
    ) -> list[CitationResultItem] | None:
        """Extract fetched evidence without changing normal Tool output."""
        args = request.tool_call.get("args", {})
        url = str(args.get("url") or "") if isinstance(args, dict) else ""
        if not isinstance(message.content, str):
            raise ValueError("Web Fetch citation extraction expected text content")
        content = message.content
        item = web_fetch_citation_item(url, content)
        return [item] if item is not None else None

    async def _arun_internal(
        self,
        url: str,
    ) -> str:
        """
        Internal async implementation with multi-layer fallback.
        """
        markdown = ""
        error_type = ""
        try:
            # Key change: use await to call async httpx fetcher
            html_content = await self._fetch_with_httpx(url)
            markdown = self._extract_markdown_from_html(html_content)

            if len(markdown.strip()) >= 100:
                logger.info(f"✓ Fast fetch successful: {url}")
                return self._format_success(url, markdown, self.max_chars)

            logger.warning(f"Content too short ({len(markdown)} chars), may need JS")
            error_type = "CONTENT_TOO_SHORT"
        except Exception as e:
            error_type = str(e)
            logger.warning(f"Fast fetch failed: {error_type}")

        # Check if should retry with browser
        should_retry = self._should_retry_with_browser(error_type, markdown)
        if not should_retry:
            logger.info(f"Error not retriable: {error_type}")
            return self._format_error(error_type, url)

        # Fallback to browser
        logger.info(f"🔄 Falling back to browser: {url}")
        try:
            return await self._fetch_with_browser(url, self.max_chars)
        except Exception as browser_error:
            # Both methods failed
            logger.error(f"Both methods failed for {url}: {str(browser_error)}")
            return self._format_error(error_type, url)

    def _should_retry_with_browser(self, error_type: str, content: str = "") -> bool:
        """Intelligently determine if we should retry with browser.

        Args:
            error_type: The error type from urllib fetch
            content: The content extracted (if any)

        Returns:
            True if should retry with browser, False otherwise
        """
        # 1. Anti-bot/access denied → Must retry
        if any(
            x in error_type for x in ["403", "ACCESS_DENIED", "Forbidden", "Cloudflare"]
        ):
            return True

        # 2. Content quality poor → May need JS rendering
        if "CONTENT_TOO_SHORT" in error_type:
            return True

        # 3. Clearly unrecoverable errors → Don't retry
        if any(
            x in error_type for x in ["404", "NOT_FOUND", "DNS", "Connection refused"]
        ):
            return False

        # 4. Timeout → Don't retry (browser will be slower)
        if "timeout" in error_type.lower():
            return False

        # 4. Invalid URL → Don't retry
        if "Invalid URL" in error_type:
            return False

        # 6. Other errors → Default to retry once
        return True

    def _format_success(self, url: str, content: str, max_chars: int) -> str:
        """Format successful result with metadata."""
        result = f"# Content from {url}\n"
        result += "---\n\n"

        if len(content) > max_chars:
            result += content[:max_chars]
            result += f"\n\n_[Content truncated: {len(content)} total chars, showing {max_chars}]_"
        else:
            result += content

        return result

    def _format_error(self, error_type: str, url: str) -> str:
        return f"Failed to fetch {url}\nError: {error_type}"
