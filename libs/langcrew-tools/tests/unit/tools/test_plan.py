import asyncio
from unittest.mock import Mock

import pytest

from langcrew_tools.plan.langchain_tool import PlanItem, PlanTool


class TestPlanTool:
    """Concise PlanTool test cases"""

    @pytest.mark.asyncio
    async def test_plan_tool_async_execution(self):
        """Test async execution"""
        tool = PlanTool()
        plans = [
            PlanItem(id="1", content="Task 1", status="pending"),
            PlanItem(id="2", content="Task 2", status="pending"),
        ]

        result = await tool._arun(plans)

        assert "1. Task 1 [pending] (ID: 1)" in result

    @pytest.mark.asyncio
    async def test_plan_tool_with_async_callback(self):
        """Test async callback function"""
        async_callback = Mock()
        async_callback.return_value = asyncio.Future()
        async_callback.return_value.set_result(None)

        tool = PlanTool(callback=async_callback)
        plans = [PlanItem(id="1", content="Async callback test", status="running")]

        await tool._arun(plans)

        async_callback.assert_called_once_with(plans)
