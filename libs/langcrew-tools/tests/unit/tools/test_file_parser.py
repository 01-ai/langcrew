import pytest

from langcrew_tools.file_parser import ChunkRetrievalTool, DocumentParserTool


@pytest.mark.asyncio
async def test_file_parser_md(md_file) -> None:
    content, md5 = md_file
    tool = DocumentParserTool()
    retrieval = ChunkRetrievalTool()
    await tool._arun(file_md5=md5, file_type="md")
    ret = await retrieval._arun("LangCrew", [md5], 5)
    assert "No relevant" in ret, f"retrieval content:\n {ret}"
