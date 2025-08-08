from langcrew_tools.file_parser import ChunkRetrievalTool, DocumentParserTool


async def test_file_parser_pdf() -> None:
    tool = DocumentParserTool()
    retrieval = ChunkRetrievalTool()
    await tool._arun(file_md5="89f324bca2fd82c4dbb12be863d04e83", file_type="pdf")
    ret = await retrieval._arun("美团专项治理", ["89f324bca2fd82c4dbb12be863d04e83"], 5)
    assert "集中处置 600 余家商户" in ret, f"retrieval content:\n {ret}"


async def test_file_parser_html() -> None:
    tool = DocumentParserTool()
    retrieval = ChunkRetrievalTool()
    await tool._arun(file_md5="09a1ddb624b45d0ae5ce3bba26deef3b", file_type="html")
    ret = await retrieval._arun(
        "总结零一万物介绍文档的内容",
        ["09a1ddb624b45d0ae5ce3bba26deef3b"],
        5,
    )
    assert "零一万物已经发布了Yi系列模型" in ret, f"retrieval content:\n {ret}"


async def test_file_parser_docx() -> None:
    tool = DocumentParserTool()
    retrieval = ChunkRetrievalTool()
    await tool._arun(file_md5="1d817f2da5b4f16165dac009f69195e0", file_type="docx")
    ret = await retrieval._arun(
        "总结零一万物介绍文档的内容", ["1d817f2da5b4f16165dac009f69195e0"], 5
    )
    assert "零一万物于2023年3月在北京注册成立" in ret, f"retrieval content:\n {ret}"


async def test_file_parser_txt() -> None:
    tool = DocumentParserTool()
    retrieval = ChunkRetrievalTool()
    await tool._arun(file_md5="c963afbb32eca22a3d208b2d9bc7c853", file_type="txt")
    ret = await retrieval._arun(
        "总结零一万物介绍文档的内容", ["c963afbb32eca22a3d208b2d9bc7c853"], 5
    )
    assert "零一万物于2023年3月在北京注册成立" in ret, f"retrieval content:\n {ret}"


async def test_file_parser_md() -> None:
    tool = DocumentParserTool()
    retrieval = ChunkRetrievalTool()
    await tool._arun(file_md5="836593ec6113da36a4f5d391dedd2a23", file_type="md")
    ret = await retrieval._arun("PDF Creation", ["836593ec6113da36a4f5d391dedd2a23"], 5)
    assert "Phase 3: PDF Creation" in ret, f"retrieval content:\n {ret}"
