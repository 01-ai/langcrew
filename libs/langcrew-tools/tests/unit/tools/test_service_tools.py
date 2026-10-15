import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langcrew_tools.commands.service_tools import (
    GetWebServiceLogsTool,
    StartWebServiceTool,
)
from langcrew_tools.utils.sandbox.bubblewrap_sandbox import AsyncSandbox


class FakeResponse:
    def __init__(self, status_code, data):
        self.status_code = status_code
        self._data = data
        self.text = str(data)

    def json(self):
        return self._data


def test_start_web_service_tool_description_sets_deployment_boundary():
    description = StartWebServiceTool().description

    assert "development" in description.lower()
    assert "service_deploy" in description
    assert "clickable preview URL" not in description


@pytest.mark.asyncio
async def test_sandbox_services_logs_calls_api():
    sandbox = AsyncSandbox(sandbox_id="sb-1")
    sandbox.client = MagicMock()
    sandbox.client.get = AsyncMock(
        return_value=FakeResponse(200, {"logs": ["line 1", "line 2"]})
    )

    logs = await sandbox.services.logs("web", tail=10)

    assert logs == ["line 1", "line 2"]
    sandbox.client.get.assert_awaited_once_with(
        "/v1/sandbox/services/sb-1/web/logs",
        params={"tail": "10"},
        timeout=30,
    )


@pytest.mark.asyncio
async def test_sandbox_services_get_calls_api():
    sandbox = AsyncSandbox(sandbox_id="sb-1")
    sandbox.client = MagicMock()
    sandbox.client.get = AsyncMock(
        return_value=FakeResponse(
            200,
            {
                "status": "ready",
                "preview_url": "https://preview.example",
                "details": {
                    "service_readiness": "passed",
                    "preview_reachability": "passed",
                },
            },
        )
    )

    info = await sandbox.services.get("web")

    assert info["status"] == "ready"
    sandbox.client.get.assert_awaited_once_with(
        "/v1/sandbox/services/sb-1/web",
        timeout=30,
    )


@pytest.mark.asyncio
async def test_sandbox_services_deploy_app_polls_until_ready():
    sandbox = AsyncSandbox(sandbox_id="sb-1")
    sandbox.client = MagicMock()
    sandbox.client.post = AsyncMock(
        return_value=FakeResponse(
            200,
            {
                "application_name": "web",
                "status": "working",
                "preview_url": None,
            },
        )
    )
    sandbox.client.get = AsyncMock(
        return_value=FakeResponse(
            200,
            {
                "application_name": "web",
                "status": "ready",
                "preview_url": "https://preview.example",
                "details": {
                    "service_readiness": "passed",
                    "preview_reachability": "passed",
                },
            },
        )
    )

    deploy_app = getattr(sandbox.services, "deploy_app", None)
    assert callable(deploy_app)
    with patch("asyncio.sleep", new=AsyncMock()):
        info = await deploy_app(
            application_name="web",
            frontend_service="web",
            backend_service="backend",
        )

    assert info["status"] == "ready"
    assert info["preview_url"] == "https://preview.example"
    sandbox.client.post.assert_awaited_once_with(
        "/v1/sandbox/apps/deploy",
        json={
            "sandbox_id": "sb-1",
            "application_name": "web",
            "frontend_service": "web",
            "backend_service": "backend",
        },
        timeout=120,
    )
    sandbox.client.get.assert_awaited_once_with(
        "/v1/sandbox/apps/sb-1/web",
        timeout=30,
    )


@pytest.mark.asyncio
async def test_sandbox_services_deploy_app_times_out_while_working():
    sandbox = AsyncSandbox(sandbox_id="sb-1")
    sandbox.client = MagicMock()
    working = {
        "application_name": "web",
        "status": "working",
        "preview_url": None,
        "details": {
            "service_readiness": "passed",
            "preview_reachability": "pending",
        },
    }
    sandbox.client.post = AsyncMock(return_value=FakeResponse(200, working))

    with (
        patch(
            "langcrew_tools.utils.sandbox.bubblewrap_sandbox."
            "APPLICATION_DEPLOY_TIMEOUT_SECONDS",
            0.01,
        ),
        patch(
            "langcrew_tools.utils.sandbox.bubblewrap_sandbox."
            "APPLICATION_POLL_INTERVAL_SECONDS",
            1,
        ),
        pytest.raises(Exception, match="timed out.*preview_reachability.*pending"),
    ):
        await sandbox.services.deploy_app(
            application_name="web",
            frontend_service="web",
            backend_service="backend",
        )

    sandbox.client.get.assert_not_called()


@pytest.mark.asyncio
async def test_sandbox_services_deploy_app_deadline_includes_initial_post():
    sandbox = AsyncSandbox(sandbox_id="sb-1")
    sandbox.client = MagicMock()

    async def slow_post(*args, **kwargs):
        await asyncio.sleep(0.05)
        return FakeResponse(
            200,
            {
                "application_name": "web",
                "status": "ready",
                "preview_url": "https://preview.example",
            },
        )

    sandbox.client.post = AsyncMock(side_effect=slow_post)

    with (
        patch(
            "langcrew_tools.utils.sandbox.bubblewrap_sandbox."
            "APPLICATION_DEPLOY_TIMEOUT_SECONDS",
            0.01,
        ),
        pytest.raises(Exception, match="timed out"),
    ):
        await asyncio.wait_for(
            sandbox.services.deploy_app(
                application_name="web",
                frontend_service="web",
                backend_service="backend",
            ),
            timeout=0.2,
        )


@pytest.mark.asyncio
async def test_start_web_service_tool_success_hides_internal_endpoints():
    tool = StartWebServiceTool()

    mock_sandbox = MagicMock()
    mock_info = {
        "status": "ready",
        "details": {
            "service_readiness": "passed",
            "preview_reachability": "passed",
        },
        "preview_url": "https://test-preview.domain",
        "proxy_url": "http://test-proxy.domain/proxy/",
        "internal_port": 12345,
    }
    mock_sandbox.services.start = AsyncMock(return_value=mock_info)
    mock_sandbox.services.logs = AsyncMock(return_value=[])

    with patch(
        "langcrew_tools.commands.service_tools.SandboxMixin.get_sandbox",
        return_value=mock_sandbox,
    ):
        output = await tool._arun(
            service_name="web",
            command="npm install && exec npm run start",
        )
        assert "Service 'web' started (service_readiness=passed)" in output
        assert "service_deploy" in output
        assert "https://test-preview.domain" not in output
        assert "http://test-proxy.domain/proxy/" not in output
        assert "12345" not in output
        assert "Preview URL" not in output
        assert "Debug proxy URL" not in output
        assert "Internal port" not in output
        mock_sandbox.services.start.assert_called_once_with(
            service_name="web",
            command="npm install && exec npm run start",
        )


@pytest.mark.asyncio
async def test_start_web_service_tool_polls_working_until_ready():
    tool = StartWebServiceTool()
    mock_sandbox = MagicMock()
    mock_sandbox.services.start = AsyncMock(
        return_value={
            "status": "working",
            "preview_url": None,
            "details": {
                "service_readiness": "pending",
                "preview_reachability": "pending",
            },
        }
    )
    mock_sandbox.services.get = AsyncMock(
        return_value={
            "status": "ready",
            "preview_url": "https://test-preview.domain",
            "proxy_url": "http://test-proxy.domain/proxy/",
            "internal_port": 12345,
            "details": {
                "service_readiness": "passed",
                "preview_reachability": "passed",
            },
        }
    )

    with (
        patch(
            "langcrew_tools.commands.service_tools.SandboxMixin.get_sandbox",
            return_value=mock_sandbox,
        ),
        patch(
            "langcrew_tools.commands.service_tools.SERVICE_POLL_INTERVAL_SECONDS",
            0,
            create=True,
        ),
    ):
        output = await tool._arun(
            service_name="web",
            command="npm install && exec npm run start",
        )

    assert "Service 'web' started (service_readiness=passed)" in output
    assert "service_deploy" in output
    assert "https://test-preview.domain" not in output
    assert "http://test-proxy.domain/proxy/" not in output
    assert "12345" not in output
    mock_sandbox.services.get.assert_awaited_once_with("web")


@pytest.mark.asyncio
async def test_start_web_service_tool_succeeds_when_only_service_readiness_passes():
    tool = StartWebServiceTool()
    mock_sandbox = MagicMock()
    mock_sandbox.services.start = AsyncMock(
        return_value={
            "status": "failed",
            "details": {
                "service_readiness": "passed",
                "preview_reachability": "failed",
            },
        }
    )
    mock_sandbox.services.logs = AsyncMock(return_value=["server is listening"])

    with patch(
        "langcrew_tools.commands.service_tools.SandboxMixin.get_sandbox",
        return_value=mock_sandbox,
    ):
        output = await tool._arun(
            service_name="backend",
            command="exec python -m uvicorn main:app --host 0.0.0.0 --port $PORT",
        )

    assert "Service 'backend' started" in output
    assert "service_readiness=passed" in output
    assert "failed to start" not in output
    mock_sandbox.services.logs.assert_not_awaited()


@pytest.mark.asyncio
async def test_start_web_service_tool_times_out_while_still_working():
    tool = StartWebServiceTool()
    working_info = {
        "status": "working",
        "details": {
            "service_readiness": "pending",
            "preview_reachability": "pending",
        },
    }
    mock_sandbox = MagicMock()
    mock_sandbox.services.start = AsyncMock(return_value=working_info)
    mock_sandbox.services.get = AsyncMock(return_value=working_info)
    mock_sandbox.services.logs = AsyncMock(return_value=["startup is still pending"])

    with (
        patch(
            "langcrew_tools.commands.service_tools.SandboxMixin.get_sandbox",
            return_value=mock_sandbox,
        ),
        patch(
            "langcrew_tools.commands.service_tools.SERVICE_STARTUP_TIMEOUT_SECONDS",
            0,
            create=True,
        ),
        patch(
            "langcrew_tools.commands.service_tools.asyncio.sleep",
            new=AsyncMock(
                side_effect=AssertionError("should not sleep after deadline")
            ),
        ),
    ):
        output = await tool._arun(
            service_name="web",
            command="exec python -m http.server $PORT",
        )

    assert "timed out waiting for readiness" in output
    assert "startup is still pending" in output


@pytest.mark.asyncio
async def test_start_web_service_tool_failure():
    tool = StartWebServiceTool()

    mock_sandbox = MagicMock()
    mock_info = {
        "status": "failed",
        "details": {
            "service_readiness": "failed",
            "preview_reachability": "pending",
        },
        "logs": [
            "npm ERR! code ELIFECYCLE",
            "npm ERR! next-app@0.1.0 build: `next build`",
            "npm ERR! Exit status 1",
        ],
    }
    mock_sandbox.services.start = AsyncMock(return_value=mock_info)
    mock_sandbox.services.logs = AsyncMock(
        return_value=[
            "real log line 1",
            "real log line 2",
        ]
    )

    with patch(
        "langcrew_tools.commands.service_tools.SandboxMixin.get_sandbox",
        return_value=mock_sandbox,
    ):
        output = await tool._arun(service_name="web", command="npm run start")
        assert "Error: Service 'web' failed to start (status=failed)" in output
        assert "real log line 1" in output
        assert "real log line 2" in output
        assert "Troubleshooting Checklist" in output
        assert "Dynamic Port Binding" in output
        assert "Host Bind Address" in output
        mock_sandbox.services.logs.assert_awaited_once_with("web")


@pytest.mark.asyncio
async def test_start_web_service_tool_failure_falls_back_to_response_logs():
    tool = StartWebServiceTool()

    mock_sandbox = MagicMock()
    mock_info = {
        "status": "failed",
        "details": {
            "service_readiness": "failed",
            "preview_reachability": "pending",
        },
        "logs": [
            "npm ERR! code ELIFECYCLE",
            "npm ERR! Exit status 1",
        ],
    }
    mock_sandbox.services.start = AsyncMock(return_value=mock_info)
    mock_sandbox.services.logs = AsyncMock(side_effect=Exception("logs unavailable"))

    with patch(
        "langcrew_tools.commands.service_tools.SandboxMixin.get_sandbox",
        return_value=mock_sandbox,
    ):
        output = await tool._arun(service_name="web", command="npm run start")
        assert "npm ERR! code ELIFECYCLE" in output
        assert "npm ERR! Exit status 1" in output


@pytest.mark.asyncio
async def test_get_web_service_logs_tool():
    tool = GetWebServiceLogsTool()

    mock_sandbox = MagicMock()
    mock_sandbox.services.logs = AsyncMock(return_value=["line 1", "line 2"])

    with patch(
        "langcrew_tools.commands.service_tools.SandboxMixin.get_sandbox",
        return_value=mock_sandbox,
    ):
        output = await tool._arun(service_name="api", tail="50")
        assert "Logs for service 'api' (tail=50)" in output
        assert "line 1" in output
        assert "line 2" in output
        mock_sandbox.services.logs.assert_awaited_once_with("api", tail="50")
