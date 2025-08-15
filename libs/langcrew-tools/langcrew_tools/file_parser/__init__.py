"""
File Parser LangChain Tools

This package provides LangChain compatible tools for file parsing operations:
- DocumentParserTool: Main tool for parsing various file types using S3 file download
- Supports PDF (via Marker API with concurrent processing and MarkerPageSplitter) and other formats (via Unstructured API)
- Implements customized chunking strategies based on src/parser/ implementation

Features:
    - Concurrent PDF processing with page-based splitting
    - MarkerPageSplitter for PDF content with proper page delimiter recognition
    - TokenTextSplitter for final chunking with 4K token limit
    - Metadata preservation including page numbers and token counts
    - Robust error handling for partial processing failures

Usage:
    from tools.file_parser import DocumentParserTool

    tool = DocumentParserTool()
    result = await tool._arun(
        file_md5="abc123def456...",
        file_type="pdf"
    )

Environment Variables:
    MARKER_API_URL: Marker API endpoint for PDF parsing
    MARKER_API_TOKEN: Authentication token for Marker API
    UNSTRUCTURED_API_URL: Unstructured API endpoint for other file types
    UNSTRUCTURED_API_KEY: Authentication token for Unstructured API
    S3_ENDPOINT: S3 endpoint URL for file download
    S3_BUCKET: S3 bucket name for file storage
    S3_ACCESS_KEY: S3 access key
    S3_SECRET_KEY: S3 secret key
    S3_REGION: S3 region
"""

from .langchain_tools import ChunkRetrievalTool, DocumentParserTool

__all__ = [
    "DocumentParserTool",
    "ChunkRetrievalTool",
]
