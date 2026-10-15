"""Local filesystem backend implementing FilesystemBackend protocol.

This backend operates directly on the local filesystem without any sandbox,
suitable for projects running on bare metal or VMs.
"""
from __future__ import annotations

import os

import aiofiles

from .utils import format_content_with_line_numbers


class LocalFilesystemBackend:
    """Local filesystem backend implementing FilesystemBackend protocol."""

    async def read(
        self,
        path: str,
        offset: int = 0,
        limit: int | None = None,
        with_line_numbers: bool = False,
    ) -> str:
        async with aiofiles.open(path, "r", encoding="utf-8") as f:
            content = await f.read()

        if offset == 0 and limit is None and not with_line_numbers:
            return content

        lines = content.splitlines()
        if offset >= len(lines):
            return ""

        if limit is not None:
            lines = lines[offset : offset + limit]
        elif offset > 0:
            lines = lines[offset:]

        if with_line_numbers:
            return format_content_with_line_numbers(lines, start_line=offset + 1)

        return "\n".join(lines)

    async def read_bytes(self, path: str) -> bytes:
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def write(self, path: str, content: str) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        async with aiofiles.open(path, "w", encoding="utf-8") as f:
            await f.write(content)

    async def exists(self, path: str) -> bool:
        return os.path.exists(path)

    async def remove(self, path: str) -> None:
        os.remove(path)

    async def list(self, path: str = "/") -> list[str]:
        return os.listdir(path)

    async def make_dir(self, path: str) -> None:
        os.makedirs(path, exist_ok=True)

    async def rename(self, old_path: str, new_path: str) -> None:
        os.rename(old_path, new_path)
