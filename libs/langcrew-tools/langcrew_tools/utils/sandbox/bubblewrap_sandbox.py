from __future__ import annotations

import asyncio
import base64
import logging
import shlex
import uuid
from typing import Any, Literal

import httpx

logger = logging.getLogger(__name__)

APPLICATION_STATUS_WORKING = "working"
APPLICATION_POLL_INTERVAL_SECONDS = 0.5
APPLICATION_DEPLOY_TIMEOUT_SECONDS = 120.0


class ConnectDescriptor:
    """Descriptor that allows 'connect' to be called on both class and instance."""

    def __get__(self, instance, owner):
        if instance is None:

            async def class_connect(sandbox_id: str | None = None, **kwargs):
                """Create or connect to a sandbox by sandbox_id."""
                inst = owner(sandbox_id=sandbox_id, **kwargs)
                await inst._register_sandbox()
                return inst

            return class_connect
        else:

            async def instance_connect(**kwargs):
                """Return the existing sandbox instance."""
                return instance

            return instance_connect


class CommandResult:
    """Result of a command execution - placeholder."""

    def __init__(self, stdout: str = "", stderr: str = "", exit_code: int = 0):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code


class AsyncSandbox:
    """Replacement for agentbox.AsyncSandbox - skeleton implementation."""

    connect = ConnectDescriptor()

    def __init__(
        self,
        sandbox_id: str | None = None,
        domain: str | None = None,
        api_key: str | None = None,
        timeout: int = 300,
        envs: dict[str, str] | None = None,
        binds: list[dict] | None = None,
    ):
        self._sandbox_id = sandbox_id or "placeholder"
        self.files = SandboxFiles(self)
        self.commands = SandboxCommands(self)
        # services：管理 sandbox 内长寿命 Web 服务（前后端预览）。
        self.services = SandboxServices(self)
        self.adb_shell = None
        self.domain = domain
        self.api_key = api_key
        self.timeout = timeout
        self._envs = envs
        self._binds = binds
        client_kwargs = {}
        if domain:
            client_kwargs["base_url"] = f"http://{domain}"
        self.client = httpx.AsyncClient(**client_kwargs)

    @property
    def sandbox_id(self) -> str:
        return self._sandbox_id

    @property
    def envs(self) -> dict[str, str]:
        return self._envs or {}

    @classmethod
    async def beta_create(cls, **kwargs) -> "AsyncSandbox":
        """Create a new sandbox (beta)."""
        sandbox_id = uuid.uuid4().hex
        domain = kwargs.get("domain", "127.0.0.1")
        envs = kwargs.get("envs") or {}
        binds = kwargs.get("binds")
        instance = cls(sandbox_id=sandbox_id, domain=domain, envs=envs, binds=binds)
        logger.info(f"create sandbox sandbox_id: {sandbox_id}")
        await instance._register_sandbox()
        return instance

    @classmethod
    async def create(cls, **kwargs) -> "AsyncSandbox":
        """Create a new sandbox."""
        sandbox_id = uuid.uuid4().hex
        domain = kwargs.get("domain", "127.0.0.1")
        envs = kwargs.get("envs") or {}
        binds = kwargs.get("binds")
        instance = cls(sandbox_id=sandbox_id, domain=domain, envs=envs, binds=binds)
        await instance._register_sandbox()
        return instance

    async def _register_sandbox(self) -> None:
        """Register the sandbox via POST /v1/sandbox/create."""
        payload: dict = {"sandbox_id": self._sandbox_id}
        if self._envs:
            payload["envs"] = self._envs
        if self._binds:
            payload["mounts"] = [
                {
                    "host_path": b["host_path"],
                    "sandbox_path": b.get("mount_point", b.get("sandbox_path", "")),
                    "mount_type": "ro_bind" if b.get("readonly") else "rw_bind",
                }
                for b in self._binds
            ]
        resp = await self.client.post("/v1/sandbox/create", json=payload, timeout=30)
        if resp.status_code not in (200, 201):
            raise Exception(f"Failed to create sandbox: {resp.text}")

    async def is_running(self) -> bool:
        """Check if sandbox is running."""
        return True

    def get_host(self, port: int) -> str:
        """Get host for a given port."""
        domain = self.domain or "127.0.0.1"
        return f"{domain.split(':')[0]}:{port}"

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


class SandboxCommands:
    """Namespace for command operations - placeholder."""

    def __init__(self, async_sandbox: AsyncSandbox):
        self.async_sandbox = async_sandbox

    async def run(self, cmd: str, user="user", **kwargs) -> CommandResult:
        """Run a command in the sandbox."""
        await self.async_sandbox._register_sandbox()

        if isinstance(cmd, list):
            cmd_str = " ".join(shlex.quote(arg) for arg in cmd)
        else:
            cmd_str = cmd

        payload = {
            "sandbox_id": self.async_sandbox.sandbox_id,
            "command": [cmd_str],
            **kwargs,
        }
        logger.info(
            f"{self.async_sandbox.client.base_url}, run command payload: {payload}"
        )
        response = await self.async_sandbox.client.post(
            "/v1/sandbox/run", json=payload, timeout=kwargs.get("timeout", 300)
        )
        if response.status_code != 200:
            logger.error(f"run command response: {response.text}")
            raise Exception(f"Failed to run command: {response.text}")
        data = response.json()
        logger.debug(f"run command response: {data}")

        return CommandResult(
            stdout="\n".join(data.get("logs", [])), stderr="", exit_code=0
        )


class SandboxServices:
    """Namespace for managing long-lived web services inside the sandbox.

    服务进程运行在独立的 network namespace 中：默认可经 slirp4netns NAT 访问公网
    （调用 LLM API 等），但访问不到宿主 loopback 与内网；外部仅能通过 sandbox-api
    反向代理（预览子域名）访问。前端需使用 **production 构建产物** 起服务（非 dev/HMR）。
    """

    def __init__(self, async_sandbox: "AsyncSandbox"):
        self.async_sandbox = async_sandbox

    async def start(
        self,
        service_name: str,
        command: list[str] | str,
        envs: dict[str, str] | None = None,
        domain_id: str | None = None,
        preview_base_url: str | None = None,
    ) -> dict[str, Any]:
        """启动（或重启）一个 sandbox 内的长寿命 Web 服务。

        ``command`` 是底层 service 启动原语。如需安装依赖或构建产物，调用方应在同一个 shell
        command 中编排，并在最后一步 ``exec`` 真正的服务进程，例如
        ``npm ci && npm run build && exec npx vite preview --host 0.0.0.0 --port $PORT``。

        **端口约定（sandbox 自动处理）**：

        sandbox 分配端口后自动将 ``PORT=<端口号>`` 注入进程环境（覆盖调用方同名值）。
        生成 App 代码时，启动命令使用 ``$PORT`` 即可，无需关心 ``internal_port`` 参数：
          - Python/uvicorn：``uvicorn main:app --host 0.0.0.0 --port $PORT``
          - Node/Express：``node server.js``（代码中 ``process.env.PORT``）
          - 静态产物：``npx serve dist -p $PORT -s``

        返回 ServiceInfo dict，其中 ``preview_url`` 为可直接点击的预览子域名地址。
        """
        await self.async_sandbox._register_sandbox()

        cmd_list = [command] if isinstance(command, str) else list(command)
        payload: dict[str, Any] = {
            "sandbox_id": self.async_sandbox.sandbox_id,
            "service_name": service_name,
            "command": cmd_list,
            "envs": envs or {},
        }
        if domain_id is not None:
            payload["domain_id"] = domain_id
        base = preview_base_url or getattr(self.async_sandbox, "preview_base_url", None)
        if base:
            payload["preview_base_url"] = base

        resp = await self.async_sandbox.client.post(
            "/v1/sandbox/services/start", json=payload, timeout=120
        )
        if resp.status_code != 200:
            raise Exception(f"Failed to start service: {resp.text}")
        return resp.json()

    async def stop(self, service_name: str) -> dict[str, Any]:
        """停止指定 service。"""
        resp = await self.async_sandbox.client.delete(
            f"/v1/sandbox/services/{self.async_sandbox.sandbox_id}/{service_name}",
            timeout=30,
        )
        if resp.status_code != 200:
            raise Exception(f"Failed to stop service: {resp.text}")
        return resp.json()

    async def list(self) -> list[dict[str, Any]]:
        """列出 sandbox 内所有 service。"""
        resp = await self.async_sandbox.client.get(
            f"/v1/sandbox/services/{self.async_sandbox.sandbox_id}", timeout=30
        )
        if resp.status_code != 200:
            raise Exception(f"Failed to list services: {resp.text}")
        return resp.json().get("services", [])

    async def get(self, service_name: str) -> dict[str, Any]:
        """读取指定 service 的 readiness 与 preview reachability 状态。"""
        resp = await self.async_sandbox.client.get(
            f"/v1/sandbox/services/{self.async_sandbox.sandbox_id}/{service_name}",
            timeout=30,
        )
        if resp.status_code != 200:
            raise Exception(f"Failed to get service: {resp.text}")
        return resp.json()

    async def deploy_app(
        self,
        application_name: str,
        frontend_service: str,
        backend_service: str,
        preview_base_url: str | None = None,
    ) -> dict[str, Any]:
        """注册 full-stack application，并等待公开 Preview 路由可访问。"""
        info: dict[str, Any] = {}
        payload: dict[str, Any] = {
            "sandbox_id": self.async_sandbox.sandbox_id,
            "application_name": application_name,
            "frontend_service": frontend_service,
            "backend_service": backend_service,
        }
        base = preview_base_url or getattr(self.async_sandbox, "preview_base_url", None)
        if base:
            payload["preview_base_url"] = base
        try:
            async with asyncio.timeout(APPLICATION_DEPLOY_TIMEOUT_SECONDS):
                resp = await self.async_sandbox.client.post(
                    "/v1/sandbox/apps/deploy",
                    json=payload,
                    timeout=120,
                )
                if resp.status_code != 200:
                    raise Exception(f"Failed to deploy application: {resp.text}")

                info = resp.json()
                while info.get("status") == APPLICATION_STATUS_WORKING:
                    await asyncio.sleep(APPLICATION_POLL_INTERVAL_SECONDS)
                    resp = await self.async_sandbox.client.get(
                        (
                            f"/v1/sandbox/apps/{self.async_sandbox.sandbox_id}/"
                            f"{application_name}"
                        ),
                        timeout=30,
                    )
                    if resp.status_code != 200:
                        raise Exception(f"Failed to get application: {resp.text}")
                    info = resp.json()
                return info
        except TimeoutError as exc:
            raise Exception(
                "Application deployment timed out while waiting for Preview: "
                f"{info.get('details', {})}"
            ) from exc

    async def logs(self, service_name: str, tail: str | int = "200") -> list[str]:
        """读取指定 service 的 stdout/stderr 合并日志。"""
        resp = await self.async_sandbox.client.get(
            f"/v1/sandbox/services/{self.async_sandbox.sandbox_id}/{service_name}/logs",
            params={"tail": str(tail)},
            timeout=30,
        )
        if resp.status_code != 200:
            raise Exception(f"Failed to get service logs: {resp.text}")
        return resp.json().get("logs", [])

    async def get_url(self, service_name: str) -> str | None:
        """获取指定 service 的预览子域名地址（preview_url）。"""
        for svc in await self.list():
            if svc.get("service_name") == service_name:
                return svc.get("preview_url")
        return None


class SandboxFiles:
    """Namespace for file operations - placeholder."""

    def __init__(self, async_sandbox: AsyncSandbox):
        self.async_sandbox = async_sandbox

    async def write(self, path: str, content: str | bytes) -> None:
        """Write content to a file via POST /v2/filesystem (action=write)."""
        await self.async_sandbox._register_sandbox()

        if isinstance(content, bytes):
            payload = {
                "action": "write",
                "sandbox_id": self.async_sandbox.sandbox_id,
                "path": path,
                "content": base64.b64encode(content).decode(),
                "encoding": "base64",
            }
        else:
            payload = {
                "action": "write",
                "sandbox_id": self.async_sandbox.sandbox_id,
                "path": path,
                "content": content,
            }
        ret = await self.async_sandbox.client.post(
            "/v2/filesystem", json=payload, timeout=30
        )
        if ret.status_code != 200:
            raise Exception(f"Failed to write file: {ret.text}")

    async def read(self, path: str, format: Literal["text", "bytes"] = "text") -> Any:
        """Read content from a file via POST /v2/filesystem (action=read)."""
        await self.async_sandbox._register_sandbox()

        payload = {
            "action": "read",
            "sandbox_id": self.async_sandbox.sandbox_id,
            "path": path,
        }
        r = await self.async_sandbox.client.post(
            "/v2/filesystem", json=payload, timeout=30
        )
        if r.status_code != 200:
            raise Exception(f"Failed to read file: {r.text}")

        content_type = r.headers.get("content-type", "")
        if "application/json" in content_type:
            data = r.json()
            raw: bytes
            if data.get("encoding") == "base64":
                raw = base64.b64decode(data["content"])
            else:
                raw = data["content"].encode("utf-8")
            return raw.decode("utf-8") if format == "text" else bytearray(raw)
        else:
            # FileResponse — server streamed the file body directly
            return r.text if format == "text" else bytearray(r.content)

    async def exists(self, path: str) -> bool:
        """Check if file exists."""
        try:
            ret = await self.async_sandbox.commands.run(
                f"[ -e '{path}' ] && echo True || echo False"
            )
            return ret.stdout.strip() == "True"
        except Exception as e:
            logger.warning(f"Failed to check file exists: {e}")
            return False

    async def remove(self, path: str) -> None:
        """Remove a file or directory."""
        try:
            await self.async_sandbox.commands.run(f"rm -rf '{path}'")
        except Exception as e:
            logger.warning(f"Failed to remove file: {e}")

    async def list(self, path: str) -> list[str]:
        """List directory contents."""
        try:
            ret = await self.async_sandbox.commands.run(f"ls '{path}'")
            return ret.stdout.split("\n")
        except Exception as e:
            logger.warning(f"Failed to list directory: {e}")
            return []

    async def make_dir(self, path: str) -> None:
        """Create a directory."""
        try:
            await self.async_sandbox.commands.run(f"mkdir -p {path}")
        except Exception as e:
            logger.warning(f"Failed to create directory: {e}")

    async def rename(self, old_path: str, new_path: str) -> None:
        """Rename a file or directory."""
        try:
            await self.async_sandbox.commands.run(f"mv {old_path} {new_path}")
        except Exception as e:
            logger.warning(f"Failed to rename file: {e}")
