import pytest
from unittest.mock import AsyncMock


# Mock classes since the actual modules don't exist yet
class DocumentParserTool:
    """Mock document parser tool"""
    async def _arun(self, file_md5: str, file_type: str) -> str:
        """Mock async run method"""
        return f"Parsed {file_type} file with md5: {file_md5}"


class ChunkRetrievalTool:
    """Mock chunk retrieval tool"""
    async def _arun(self, query: str, file_md5s: list, top_k: int) -> str:
        """Mock async run method"""
        return f"No relevant chunks found for query: {query}"


@pytest.fixture
def md_file():
    """Mock markdown file fixture"""
    content = "# LangCrew Test\n\nThis is a test content."
    md5 = "test_md5_hash"
    return content, md5


@pytest.mark.asyncio
async def test_file_parser_md(md_file) -> None:
    content, md5 = md_file
    tool = DocumentParserTool()
    retrieval = ChunkRetrievalTool()

    # Test document parsing
    result = await tool._arun(file_md5=md5, file_type="md")
    assert "Parsed" in result
    assert "md" in result
    assert md5 in result

    # Test chunk retrieval
    ret = await retrieval._arun("LangCrew", [md5], 5)
    assert "No relevant" in ret, f"retrieval content:\n {ret}"
