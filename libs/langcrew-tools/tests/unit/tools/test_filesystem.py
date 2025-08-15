import pytest

from langcrew_tools.filesystem import WriteFileTool


@pytest.mark.asyncio
async def test_write_file() -> None:
    tool = WriteFileTool()
    ret = await tool._arun(
        path="/workspace/test_markdown.md",
        content="# this is a markdown title",
    )
    assert "message" in ret.keys() and "Successfully" in ret["message"]
