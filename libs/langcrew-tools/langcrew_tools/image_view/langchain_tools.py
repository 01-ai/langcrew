"""LangChain-compatible tools for projecting remote images into the model context."""

from typing import Any, ClassVar
from urllib.parse import urlparse

import httpx
from langchain_core.messages import ToolMessage
from langchain_core.tools import BaseTool
from langgraph.prebuilt.tool_node import ToolRuntime
from langgraph.types import Command
from pydantic import BaseModel, Field

from ..base import RuntimeAwareInput


class ViewImageUrlInput(RuntimeAwareInput):
    """Input for ViewImageUrlTool."""

    url: str = Field(..., description="HTTPS image URL to show to the model")


class ViewImageUrlTool(BaseTool):
    """Tool that returns a multimodal ToolMessage for a remote image URL."""

    name: ClassVar[str] = "view_image_url"
    args_schema: ClassVar[type[BaseModel]] = ViewImageUrlInput
    request_timeout: ClassVar[float] = 10.0
    sniff_bytes: ClassVar[int] = 4096
    generic_content_types: ClassVar[set[str]] = {
        "",
        "application/octet-stream",
        "binary/octet-stream",
    }
    description: ClassVar[str] = (
        "View an image from an HTTPS URL. "
        "Use this when the model should inspect or reference a remote image directly."
    )

    def _validate_url(self, url: str) -> str:
        """Validate that the URL is a basic HTTPS URL with a host."""
        normalized_url = url.strip()
        parsed = urlparse(normalized_url)

        if parsed.scheme.lower() != "https" or not parsed.hostname:
            raise ValueError(
                "view_image_url requires a valid HTTPS URL with a host"
            )

        return normalized_url

    async def _validate_remote_image(self, url: str) -> None:
        """Validate that the remote URL currently resolves to image content."""
        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=self.request_timeout,
            ) as client:
                response = await client.get(
                    url,
                    headers={
                        "Accept": "image/*,*/*;q=0.8",
                        "Range": f"bytes=0-{self.sniff_bytes - 1}",
                    },
                )
        except httpx.RequestError as e:
            raise ValueError(f"could not fetch image URL: {e}") from e

        if response.url.scheme.lower() != "https":
            raise ValueError("image URL redirected to a non-HTTPS location")

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise ValueError(
                f"image URL returned HTTP {e.response.status_code}"
            ) from e

        content = response.content[: self.sniff_bytes]
        if not content:
            raise ValueError("image URL returned an empty response")

        content_type = response.headers.get("content-type", "")
        media_type = content_type.split(";", 1)[0].strip().lower()
        if media_type.startswith("image/"):
            return

        if media_type not in self.generic_content_types:
            raise ValueError(
                f"image URL returned non-image content type: {content_type}"
            )

        if self._looks_like_image(content):
            return

        raise ValueError("image URL did not return recognizable image content")

    def _looks_like_image(self, content: bytes) -> bool:
        """Sniff common image signatures for URLs with missing/generic headers."""
        sample = content.lstrip()
        lower_sample = sample[:512].lower()

        signatures = (
            b"\xff\xd8\xff",  # JPEG
            b"\x89PNG\r\n\x1a\n",  # PNG
            b"GIF87a",
            b"GIF89a",
            b"BM",  # BMP
            b"II*\x00",  # TIFF little-endian
            b"MM\x00*",  # TIFF big-endian
        )
        if sample.startswith(signatures):
            return True

        if len(sample) >= 12 and sample[:4] == b"RIFF" and sample[8:12] == b"WEBP":
            return True

        if lower_sample.startswith(b"<svg") or (
            lower_sample.startswith(b"<?xml") and b"<svg" in lower_sample
        ):
            return True

        return False

    def _error_command(self, message: str, tool_call_id: str) -> Command:
        return Command(
            update={
                "messages": [
                    ToolMessage(
                        content=f"Invalid image URL: {message}",
                        tool_call_id=tool_call_id,
                        status="error",
                    )
                ]
            }
        )

    async def _arun(
        self,
        url: str,
        runtime: ToolRuntime,
        **kwargs: Any,
    ) -> Command:
        """Create a multimodal tool result for the provided image URL."""
        validated_url = self._validate_url(url)
        tool_call_id = runtime.tool_call_id or self.name

        try:
            await self._validate_remote_image(validated_url)
        except ValueError as e:
            return self._error_command(str(e), tool_call_id)

        summary = f"Viewing image from URL: {validated_url}"

        return Command(
            update={
                "messages": [
                    ToolMessage(
                        content=[
                            {"type": "text", "text": summary},
                            {
                                "type": "image_url",
                                "image_url": {"url": validated_url},
                            },
                        ],
                        tool_call_id=tool_call_id,
                    )
                ]
            }
        )

    def _run(self, *args: Any, **kwargs: Any) -> Any:
        """Synchronous execution is intentionally unsupported."""
        raise NotImplementedError("view_image_url only supports async execution.")
