"""启动 sandbox 内长寿命 Web 服务（前后端预览）的工具。

与 RunCommandTool 的区别：RunCommandTool 用于一次性命令（构建、安装依赖等），
进程与请求/会话绑定且共用宿主网络；StartWebServiceTool 则把一个 HTTP 服务以
**service** 角色长期运行在独立 network namespace 中，并返回可点击的预览子域名。

网络隔离模型（service）：
  - 默认可经 NAT 出公网（调用 LLM API 等），但访问不到宿主 loopback 与内网。
  - 外部只能通过 sandbox-api 反向代理（预览子域名）访问，应用落在根路径 `/`。
  - 仅支持 HTTP/SSE，不支持 WebSocket；因此前端必须用 **production 构建产物** 起服务
    （如先 `vite build` 再 `vite preview --host 0.0.0.0`、或 `next build && next start`），
    不要使用带 HMR 的 dev server。
  - 服务需监听 `0.0.0.0`（而非仅 127.0.0.1），便于代理连通。
"""

import asyncio
import logging
from typing import Any

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..utils.sandbox import SandboxMixin

logger = logging.getLogger(__name__)

SERVICE_STATUS_WORKING = "working"
SERVICE_READINESS_PASSED = "passed"
SERVICE_POLL_INTERVAL_SECONDS = 0.5
SERVICE_STARTUP_TIMEOUT_SECONDS = 120.0


class StartWebServiceInput(BaseToolInput):
    """Input for StartWebServiceTool."""

    service_name: str = Field(
        default="web",
        description=(
            "Unique service name within the sandbox (letters/digits/-/_), e.g. 'web' or 'api'. "
            "Defaults to 'web' for the primary frontend so it gets the root preview subdomain."
        ),
    )
    command: str = Field(
        ...,
        description=(
            "Command that prepares and starts the server. MUST serve a production build, bind to 0.0.0.0, "
            "and listen on the port injected via the $PORT environment variable. "
            "Include install/build steps in this command when needed, and use exec for the final server process. "
            "e.g. 'npm ci && npm run build && exec npx vite preview --host 0.0.0.0 --port $PORT' or "
            "'exec python -m uvicorn app:app --host 0.0.0.0 --port $PORT'. Do NOT use a dev/HMR server, "
            "and do NOT hardcode a static port."
        ),
    )


class GetWebServiceLogsInput(BaseToolInput):
    """Input for GetWebServiceLogsTool."""

    service_name: str = Field(
        default="web",
        description="Service name within the sandbox, e.g. 'web' or 'api'.",
    )
    tail: str = Field(
        default="200",
        description="Number of log lines to return, or 'all' for the complete log.",
    )


def _format_logs(logs: list[str]) -> list[str]:
    if logs:
        return logs
    return ["(No logs captured)"]


def _troubleshooting_checklist() -> list[str]:
    return [
        "",
        "Troubleshooting Checklist for Agent Self-Correction:",
        "1. Dynamic Port Binding: Did your server bind to the dynamic port injected via the `PORT` environment variable?",
        "   - Correct: Use `process.env.PORT` in Node.js or `os.environ.get('PORT')` in Python.",
        "   - Example (FastAPI): `uvicorn main:app --host 0.0.0.0 --port $PORT`",
        "2. Host Bind Address: Did your server bind to `0.0.0.0` (all interfaces)?",
        "   - Do NOT bind to `127.0.0.1` or `localhost`, otherwise the sandbox proxy cannot connect to it.",
        "3. Missing Dependencies / Commands: Did your `command` install/build everything needed before starting?",
        "   - Include required setup in the same command (e.g. `npm ci && npm run build && exec ...`, `pip install -r requirements.txt && exec ...`).",
        "4. Production Build Requirements: Production runtime does not support WebSocket/HMR.",
        "   - Do NOT use dev servers (like `vite` or `next dev`). Instead, build and serve in one command: e.g. `npm run build && exec npx vite preview --host 0.0.0.0 --port $PORT`.",
        "5. Crashes & Syntax Errors: Look at the stack trace in the logs above. Fix the files or paths in the workspace and retry.",
    ]


class StartWebServiceTool(BaseTool, SandboxMixin):
    """启动 sandbox 内用于开发验证的长寿命 Web 服务。"""

    name: str = "start_web_service"
    args_schema: type[BaseModel] = StartWebServiceInput
    description: str = (
        "Start a long-running development web service (frontend or backend) inside the sandbox. "
        "This tool starts the service for development verification but does not publish a "
        "user-facing URL. After development is complete, ask the user to confirm deployment, "
        "then use `service_deploy` to publish it. The service runs in an isolated network "
        "namespace and supports HTTP/SSE but not WebSocket. Serve a PRODUCTION build bound to "
        "0.0.0.0 (not a dev/HMR server) and listen on the port injected via $PORT."
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def _arun(
        self,
        command: str,
        service_name: str = "web",
        **kwargs,
    ) -> str:
        async_sandbox: Any | None = None
        try:
            async_sandbox = await self.get_sandbox()
            info: dict[str, Any] = await async_sandbox.services.start(
                service_name=service_name,
                command=command,
            )
            loop = asyncio.get_running_loop()
            startup_deadline = loop.time() + SERVICE_STARTUP_TIMEOUT_SECONDS
            while (
                info.get("status") == SERVICE_STATUS_WORKING
                and info.get("details", {}).get("service_readiness")
                != SERVICE_READINESS_PASSED
            ):
                if loop.time() >= startup_deadline:
                    logs = await self._get_logs(async_sandbox, service_name, info)
                    lines = [
                        f"Error: Service '{service_name}' timed out waiting for readiness.",
                        "Please carefully review the logs below to diagnose and fix the issue.",
                        "",
                        "--- Startup/Setup Logs ---",
                    ]
                    lines.extend(_format_logs(logs))
                    lines.append("--------------------------")
                    lines.extend(_troubleshooting_checklist())
                    return "\n".join(lines)
                await asyncio.sleep(SERVICE_POLL_INTERVAL_SECONDS)
                info = await async_sandbox.services.get(service_name)

            status = info.get("status")
            service_readiness = info.get("details", {}).get("service_readiness")

            if service_readiness != SERVICE_READINESS_PASSED:
                logs = await self._get_logs(async_sandbox, service_name, info)
                lines = [
                    f"Error: Service '{service_name}' failed to start (status={status}).",
                    "Please carefully review the logs below to diagnose and fix the issue.",
                    "",
                    "--- Startup/Setup Logs ---",
                ]
                lines.extend(_format_logs(logs))
                lines.extend([
                    "--------------------------",
                ])
                lines.extend(_troubleshooting_checklist())
                return "\n".join(lines)

            lines = [
                (
                    f"Service '{service_name}' started "
                    f"(service_readiness={service_readiness})."
                ),
                (
                    "This development service is ready. After the user confirms deployment, "
                    "use `service_deploy` to publish it."
                ),
            ]
            return "\n".join(lines)
        except Exception as e:  # noqa: BLE001
            logger.exception(f"Error starting web service: {service_name}")
            lines = [
                f"Failed to start web service '{service_name}': {e}",
                "",
                "--- Recent Service Logs ---",
            ]
            if async_sandbox is None:
                lines.append(
                    "(Sandbox was not available, so service logs could not be read)"
                )
            else:
                try:
                    lines.extend(
                        _format_logs(await async_sandbox.services.logs(service_name))
                    )
                except Exception as log_error:  # noqa: BLE001
                    lines.append(f"(Unable to read service logs: {log_error})")
            lines.extend(["---------------------------"])
            lines.extend(_troubleshooting_checklist())
            return "\n".join(lines)

    @staticmethod
    async def _get_logs(
        async_sandbox: Any, service_name: str, info: dict[str, Any]
    ) -> list[str]:
        try:
            return await async_sandbox.services.logs(service_name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to fetch service logs for %s: %s", service_name, exc)
            return info.get("logs", [])

    def _run(
        self,
        **kwargs,
    ) -> str:
        raise NotImplementedError("start_web_service only supports async execution.")


class GetWebServiceLogsTool(BaseTool, SandboxMixin):
    """读取 sandbox 内长寿命 Web 服务的日志。"""

    name: str = "get_web_service_logs"
    args_schema: type[BaseModel] = GetWebServiceLogsInput
    description: str = (
        "Read stdout/stderr logs for a long-running web service inside the sandbox. "
        "Use this after startup, preview, or health-check failures to diagnose and fix "
        "the service before retrying."
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def _arun(
        self,
        service_name: str = "web",
        tail: str = "200",
        **kwargs,
    ) -> str:
        try:
            async_sandbox = await self.get_sandbox()
            logs = await async_sandbox.services.logs(service_name, tail=tail)
            lines = [
                f"Logs for service '{service_name}' (tail={tail}):",
                "--- Service Logs ---",
            ]
            lines.extend(_format_logs(logs))
            lines.append("--------------------")
            return "\n".join(lines)
        except Exception as e:  # noqa: BLE001
            logger.exception("Error reading web service logs: %s", service_name)
            return f"Failed to read logs for web service '{service_name}': {e}"

    def _run(
        self,
        **kwargs,
    ) -> str:
        raise NotImplementedError("get_web_service_logs only supports async execution.")
