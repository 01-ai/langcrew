"""In-memory filesystem backend for eval — no real sandbox or S3 needed."""


class InMemoryFilesystemBackend:
    """In-memory FilesystemBackend for eval — no real sandbox/S3 needed."""

    def __init__(self):
        self._files: dict[str, str] = {}

    async def write(self, path: str, content: str) -> None:
        self._files[path] = content

    async def read(self, path: str, **_) -> str:
        if path not in self._files:
            raise FileNotFoundError(f"File not found: {path}")
        return self._files[path]

    async def read_bytes(self, path: str) -> bytes:
        return (await self.read(path)).encode("utf-8")

    async def exists(self, path: str) -> bool:
        return path in self._files

    async def list(self, path: str = "/") -> list[str]:
        prefix = path.rstrip("/") + "/"
        names = set()
        for p in self._files:
            if p.startswith(prefix):
                remainder = p[len(prefix):]
                names.add(remainder.split("/")[0])
        return sorted(names)

    async def remove(self, path: str) -> None:
        self._files.pop(path, None)

    async def make_dir(self, path: str) -> None:
        pass  # no-op for in-memory

    async def rename(self, old_path: str, new_path: str) -> None:
        if old_path in self._files:
            self._files[new_path] = self._files.pop(old_path)
