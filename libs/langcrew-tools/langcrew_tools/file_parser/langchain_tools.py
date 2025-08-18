# File Parser LangChain Tools
# Provides file parsing functionality using Marker (PDF) and Unstructured (other formats)

import io
import logging
import re
import tempfile
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import ClassVar

import requests
from langchain_core.documents import Document
from langchain_core.tools import BaseTool
from langchain_text_splitters import TokenTextSplitter
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..utils.s3 import AsyncS3Client, ClientFactory
from .config import ParserConfig, default_config

logger = logging.getLogger(__name__)


class DocumentParserInput(BaseToolInput):
    """Input for DocumentParserTool."""

    file_md5: str = Field(
        ..., description="MD5 hash of the file to parse and download from S3"
    )
    file_type: str = Field(
        ..., description="File type/extension (e.g., 'pdf', 'docx', 'txt')"
    )


class ChunkRetrievalInput(BaseToolInput):
    """Input for chunk retrieval from vector database."""

    query: str = Field(
        ..., description="Search query text for retrieving relevant chunks"
    )
    file_md5s: list[str] = Field(
        ..., description="List of MD5 hashes of files to retrieve chunks from"
    )
    top_k: int = Field(
        default=20, description="Number of top relevant chunks to retrieve"
    )


class DocumentParserTool(BaseTool):
    """Tool for parsing documents using Marker (PDF) or Unstructured (other formats) APIs."""

    name: ClassVar[str] = "file_parser"
    args_schema: type[BaseModel] = DocumentParserInput
    description: ClassVar[str] = (
        "Parse documents using specialized APIs and store chunks in pgvector database. "
        "Files are downloaded from S3 using MD5 hash. "
        "PDFs are processed with Marker API for high-quality text extraction. "
        "Other formats (DOCX, PPTX, TXT, etc.) are processed with Unstructured API for versatile document parsing. "
        "Parsed chunks are automatically stored in pgvector database for efficient retrieval."
    )

    # Configuration
    config: ParserConfig = Field(default_factory=lambda: default_config)
    # S3 client - excluded from serialization
    s3_client: AsyncS3Client | None = Field(default=None, exclude=True)

    def __init__(
        self,
        config: ParserConfig | None = None,
        s3_config: dict | None = None,
        **kwargs,
    ) -> None:
        """Initialize DocumentParserTool with configuration.

        Note: The S3 client is not automatically closed after each operation.
        Call the close() method explicitly when done with the tool to release resources.
        """
        super().__init__(**kwargs)

        if config:
            self.config = config
        self.config.validate()

        # Initialize S3 client
        # Note: The client is reused across multiple operations and should be
        # closed manually by calling close() when the tool is no longer needed
        if s3_config:
            self.s3_client = AsyncS3Client(s3_config)
        else:
            # Default S3 configuration - should be provided via environment or config
            self.s3_client = ClientFactory.create_s3_client()

    def _run(self, file_md5: str, file_type: str, **kwargs) -> str:
        """Perform document parsing synchronously."""
        raise NotImplementedError("file_parser only supports async execution.")

    async def _arun(self, file_md5: str, file_type: str, **kwargs) -> str:
        """Perform document parsing asynchronously."""
        logger.info(
            f"Starting document parsing for file MD5: {file_md5}, type: {file_type}"
        )

        # Create temporary file for downloaded content
        temp_file_path = None
        try:
            # Download file from S3 using MD5 hash as object key
            # Note: Not using async with to avoid auto-closing the client
            # Check if file exists
            if not self.s3_client:
                logger.error("Document parsing failed caused by get s3_client failed")
                return "Document parsing failed caused by get s3_client failed"
            if not await self.s3_client.object_exists(file_md5):
                error_msg = f"File with MD5 {file_md5} not found in S3"
                logger.warning(error_msg)
                return f"Error: {error_msg}"

            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file_path = Path(temp_file.name)

            # Download file
            await self.s3_client.download_file(file_md5, temp_file_path)
            logger.info(f"Downloaded file {file_md5} to temporary location")

            # Validate and normalize file type
            normalized_file_type = file_type.lower().lstrip(".")
            logger.info(f"Using file type: {normalized_file_type}")

            # Route to appropriate parser with concurrent processing
            if normalized_file_type == "pdf":
                content = await self._parse_pdf_concurrent(temp_file_path, file_md5)
            else:
                content = await self._parse_with_unstructured(
                    temp_file_path, file_md5, normalized_file_type
                )

            # Apply chunking strategy from src/parser/
            if normalized_file_type == "pdf":
                chunks = await self._apply_marker_chunking_strategy(content, file_md5)
            else:
                chunks = await self._apply_unstructured_chunking_strategy(content)

            if chunks:
                # Store chunks in pgvector and return status
                vector_result = await self._store_chunks_in_vector_db(chunks, file_md5)
                return vector_result
            else:
                return (
                    f"Error: No chunks created for vector storage. File MD5: {file_md5}"
                )

        except Exception as e:
            logger.error(f"Document parsing failed for {file_md5}: {e}")
            return f"Parsing failed: {str(e)}"
        finally:
            # Clean up temporary file
            if temp_file_path and temp_file_path.exists():
                temp_file_path.unlink()

    async def _store_chunks_in_vector_db(
        self, chunks: list[Document], file_md5: str
    ) -> str:
        """Store parsed document chunks in pgvector database."""
        try:
            # Import vector manager from toolkit
            from ..utils.vector import create_vector_manager, vector_available

            # Check if vector functionality is available
            if not vector_available:
                error_msg = "Vector functionality not available - missing dependencies"
                logger.error(error_msg)
                return f"Error: {error_msg}"

            # Create vector manager instance
            vector_manager = await create_vector_manager()
            if not vector_manager:
                error_msg = (
                    "Failed to create vector manager: dependencies not available"
                )
                logger.error(error_msg)
                return f"Error: {error_msg}"

            # Store chunks in vector database
            result = await vector_manager.store_documents(
                file_md5=file_md5, documents=chunks
            )

            if result.get("success", False):
                chunks_stored = result.get("chunks_stored", 0)
                cost_seconds = result.get("cost_seconds", 0)
                index_name = result.get("index_name", "vector_store")

                success_msg = (
                    f"Successfully stored {chunks_stored} chunks in vector database '{index_name}'."
                    f"Processing time: {cost_seconds:.2f}s. File MD5: {file_md5}"
                )
                logger.info(success_msg)
                return success_msg
            else:
                error_msg = result.get("error", "Unknown error occurred")
                logger.error(f"Vector storage failed: {error_msg}")
                return f"Error: Vector storage failed - {error_msg}"

        except ImportError as e:
            error_msg = f"Vector storage dependencies not available: {e}"
            logger.error(error_msg)
            return f"Error: {error_msg}"
        except Exception as e:
            error_msg = f"Unexpected error during vector storage: {e}"
            logger.error(error_msg)
            return f"Error: {error_msg}"

    async def _apply_marker_chunking_strategy(
        self, content: str, file_md5: str
    ) -> list[Document]:
        """Apply MarkerPageSplitter chunking strategy for PDF content."""
        if not content or not content.strip():
            return []

        try:
            # Create a Document with the content and basic metadata
            doc = Document(
                page_content=content,
                metadata={
                    "file_md5": file_md5,
                    "parser": "marker",
                    "filetype": "application/pdf",
                },
            )

            # Apply MarkerPageSplitter logic
            split_docs = await self._marker_page_split([doc])

            if split_docs:
                # Apply token splitter for final chunking
                final_chunks = await self._split_with_token_splitter(split_docs)
                logger.info(
                    f"Applied Marker chunking strategy: {len(final_chunks)} chunks created"
                )
                return final_chunks
            else:
                logger.warning(
                    "Marker page splitting returned no results, returning original document"
                )
                return [doc]

        except Exception as e:
            logger.error(
                f"Marker chunking failed: {e}, returning original content as single document"
            )
            doc = Document(
                page_content=content,
                metadata={"file_md5": file_md5, "parser": "marker", "error": str(e)},
            )
            return [doc]

    async def _apply_unstructured_chunking_strategy(
        self, content: str
    ) -> list[Document]:
        """Apply standard chunking strategy for non-PDF content."""
        if not content or not content.strip():
            return []

        try:
            from langchain_text_splitters import RecursiveCharacterTextSplitter

            # Default chunk size similar to unstructured strategy
            chunk_size = 1024  # characters
            chunk_overlap = 100  # characters

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", " ", ""],
            )

            chunks = text_splitter.split_text(content)
            # Convert text chunks to Document objects
            doc_chunks = [
                Document(
                    page_content=chunk,
                    metadata={"chunk_index": i, "parser": "unstructured"},
                )
                for i, chunk in enumerate(chunks)
            ]

            logger.info(
                f"Applied unstructured chunking strategy: {len(doc_chunks)} chunks created"
            )
            return doc_chunks

        except ImportError:
            logger.warning(
                "RecursiveCharacterTextSplitter not available, returning original content"
            )
            doc = Document(page_content=content, metadata={"parser": "unstructured"})
            return [doc]
        except Exception as e:
            logger.error(
                f"Unstructured chunking failed: {e}, returning original content"
            )
            doc = Document(
                page_content=content,
                metadata={"parser": "unstructured", "error": str(e)},
            )
            return [doc]

    async def _marker_page_split(self, docs: list[Document]) -> list[Document]:
        """Split documents using Marker page splitting logic."""
        if not docs:
            logger.warning("The input 'docs' list is empty.")
            return []

        # Get the first document's page content
        first_doc = docs[0]
        page_content = first_doc.page_content

        # Split the page content based on the specified delimiter
        # This delimiter pattern is used by Marker API to separate pages
        delimiter = r"\{(\d+)\}------------------------------------------------\n\n"
        split_contents = re.split(delimiter, page_content)

        # The first element is usually empty
        if split_contents and split_contents[0] == "":
            split_contents = split_contents[1:]

        split_docs = []
        for i in range(0, len(split_contents), 2):
            # Extract page number and content pairs
            has_page_number = i < len(split_contents)
            has_content = i + 1 < len(split_contents)

            # Get page number from odd indices
            # Marker page numbers start from 0, so we add 1
            page_number = int(split_contents[i]) + 1 if has_page_number else None

            # Get content from even indices
            page_content_chunk = split_contents[i + 1] if has_content else ""

            # Create metadata for the new document
            doc_metadata = first_doc.metadata.copy()
            if page_number is not None:
                doc_metadata["page_number"] = page_number

            # Create new document with content and metadata
            new_doc = Document(page_content=page_content_chunk, metadata=doc_metadata)
            split_docs.append(new_doc)

        logger.info(f"Marker page split created {len(split_docs)} page documents")
        return split_docs

    async def _split_with_token_splitter(self, docs: list[Document]) -> list[Document]:
        """Split documents using TokenTextSplitter similar to PageSplitter implementation."""
        try:
            # Try to import tiktoken for token counting, fall back to character-based if not available
            try:
                import tiktoken

                # Add token count to metadata
                encoding = tiktoken.get_encoding("o200k_base")
                for doc in docs:
                    token_count = len(encoding.encode(doc.page_content))
                    doc.metadata["token_count"] = token_count

            except ImportError:
                logger.warning("tiktoken not available, skipping token count metadata")

            # Use TokenTextSplitter for final chunking
            text_splitter = TokenTextSplitter(
                model_name="gpt-4o",
                chunk_size=4 * 1024,  # 4K tokens
                chunk_overlap=0,
                disallowed_special=(),
            )

            arr_doc_chunk = text_splitter.split_documents(docs)

            if not arr_doc_chunk:
                logger.warning("No document chunks were created after token splitting")
                return docs

            if len(arr_doc_chunk) != len(docs):
                # Log information about chunks that were split further
                page_number_count = defaultdict(int)
                for doc in arr_doc_chunk:
                    page_number = doc.metadata.get("page_number", 1)
                    page_number_count[page_number] += 1

                duplicate_page_numbers = [
                    page for page, count in page_number_count.items() if count > 1
                ]
                if duplicate_page_numbers:
                    logger.info(
                        f"Pages that were split into multiple chunks: {duplicate_page_numbers}"
                    )

                logger.info(
                    f"Token splitter created {len(arr_doc_chunk)} chunks from {len(docs)} documents"
                )

            return arr_doc_chunk

        except Exception as e:
            logger.error(f"Token splitting failed: {e}, returning original documents")
            return docs

    def _get_page_count(self, file_path: Path) -> int:
        """Get the number of pages in a PDF file."""
        try:
            import pymupdf as fitz

            with fitz.open(file_path) as doc:
                return len(doc)
        except ImportError:
            logger.warning("pymupdf not available, assuming single page")
            return 1
        except Exception as e:
            logger.warning(f"Failed to get page count: {e}, assuming single page")
            return 1

    def _split_pdf_by_pages(
        self, file_path: Path, page_unit_size: int = 16
    ) -> list[tuple[io.BytesIO, int]]:
        """Split PDF into smaller chunks by pages, returns (BytesIO, page_offset) tuples."""
        try:
            import pymupdf as fitz

            split_pdfs = []
            offset = 0

            with fitz.open(file_path) as doc:
                total_pages = len(doc)
                while offset < total_pages:
                    pdf_buffer = io.BytesIO()
                    with fitz.open() as new_pdf:
                        end = min(offset + page_unit_size, total_pages)
                        for i in range(offset, end):
                            try:
                                new_pdf.insert_pdf(
                                    doc, from_page=i, to_page=i, links=False
                                )
                            except Exception as e:
                                logger.warning(f"Failed to add page {i}: {e}")

                        new_pdf.save(pdf_buffer)
                        pdf_buffer.seek(0)
                        split_pdfs.append((pdf_buffer, offset))
                        offset += page_unit_size

            logger.info(f"Split PDF into {len(split_pdfs)} chunks")
            return split_pdfs

        except ImportError:
            logger.warning("pymupdf not available, using whole file")
            # Return the whole file as single chunk
            with open(file_path, "rb") as f:
                content = f.read()
                buffer = io.BytesIO(content)
                return [(buffer, 0)]
        except Exception as e:
            logger.error(f"Failed to split PDF: {e}")
            return []

    async def _parse_pdf_concurrent(self, file_path: Path, file_md5: str) -> str:
        """Parse PDF files using Marker API with concurrent processing for large files."""
        logger.info(f"Starting PDF parsing with Marker API: {file_md5}")

        # Get page count and determine if splitting is needed
        page_count = self._get_page_count(file_path)
        page_unit_size = 16  # Pages per chunk

        if page_count > page_unit_size:
            logger.info(
                f"PDF has {page_count} pages, splitting into chunks of {page_unit_size} pages"
            )
            # Split into smaller chunks for concurrent processing
            pdf_chunks = self._split_pdf_by_pages(file_path, page_unit_size)
        else:
            logger.info(f"PDF has {page_count} pages, processing as single chunk")
            # Process as single chunk
            with open(file_path, "rb") as f:
                content = f.read()
                pdf_chunks = [(io.BytesIO(content), 0)]

        if not pdf_chunks:
            logger.error("Failed to create PDF chunks")
            return "Error: Failed to split PDF for processing"

        # Process chunks concurrently
        max_workers = min(len(pdf_chunks), 4)  # Limit concurrent requests
        logger.info(f"Processing {len(pdf_chunks)} chunks with {max_workers} workers")

        def parse_chunk(chunk_data: tuple[io.BytesIO, int]) -> tuple[str, int, bool]:
            """Parse a single PDF chunk, returns (content, page_offset, success)."""
            chunk_buffer, page_offset = chunk_data
            try:
                return self._parse_chunk_with_marker(
                    chunk_buffer, file_md5, page_offset
                )
            except Exception as e:
                logger.error(f"Failed to parse chunk at offset {page_offset}: {e}")
                return "", page_offset, False

        # Execute concurrent parsing
        results = []
        has_errors = False

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_offset = {
                executor.submit(parse_chunk, chunk): chunk[1] for chunk in pdf_chunks
            }

            for future in as_completed(future_to_offset):
                content, page_offset, success = future.result()
                if success and content.strip():
                    results.append((content, page_offset))
                else:
                    has_errors = True
                    logger.warning(f"Failed to parse chunk at offset {page_offset}")

        if not results:
            error_msg = "Failed to parse any PDF chunks"
            logger.error(error_msg)
            return f"Error: {error_msg}"

        # Sort results by page offset and combine with page delimiters for MarkerPageSplitter
        results.sort(key=lambda x: x[1])

        # Format content with page delimiters that MarkerPageSplitter expects
        formatted_chunks = []
        for content, page_offset in results:
            # Add page delimiter in the format that MarkerPageSplitter expects
            formatted_chunk = f"{{{page_offset}}}----------------------\n\n{content}"
            formatted_chunks.append(formatted_chunk)

        combined_content = "\n\n".join(formatted_chunks)

        success_rate = len(results) / len(pdf_chunks)
        logger.info(
            f"PDF parsing completed. Success rate: {success_rate:.2%}, total chunks: {len(pdf_chunks)}, successful: {len(results)}"
        )

        if has_errors:
            combined_content += f"\n\n[Warning: {len(pdf_chunks) - len(results)} chunks failed to parse]"

        return combined_content

    def _parse_chunk_with_marker(
        self, chunk_buffer: io.BytesIO, file_md5: str, page_offset: int
    ) -> tuple[str, int, bool]:
        """Parse a single PDF chunk using Marker API."""
        logger.debug(
            f"Parsing PDF chunk at offset {page_offset} with Marker API: {file_md5}"
        )

        try:
            chunk_buffer.seek(0)
            headers = {"Authorization": self.config.marker_token}
            files = {
                "file": chunk_buffer,
                "md5": (None, f"{file_md5}_offset_{page_offset}"),
            }

            start_time = time.time()
            response = requests.post(
                self.config.marker_url,
                headers=headers,
                files=files,
                timeout=self.config.marker_timeout,
            )
            response.raise_for_status()

            elapsed_time = time.time() - start_time
            logger.info(f"Marker API request completed in {elapsed_time:.2f}s")

            response_json = response.json()

            if response_json.get("code") != 200:
                logger.warning(f"Marker API returned error: {response_json}")
                return "", page_offset, False

            data = response_json.get("data", {})
            markdown_texts = data.get("markdown_text", [])

            if not markdown_texts or not isinstance(markdown_texts, list):
                logger.warning("No valid markdown_texts found in Marker response")
                return "", page_offset, False

            # Extract full text from first markdown entry
            if len(markdown_texts) > 0 and isinstance(markdown_texts[0], dict):
                full_text = markdown_texts[0].get("full_text", "")
                if full_text and full_text.strip():
                    logger.info(
                        f"Successfully parsed PDF chunk at offset {page_offset}, content length: {len(full_text)}"
                    )
                    return full_text, page_offset, True

            logger.warning(
                f"Empty or invalid content from Marker API for chunk at offset {page_offset}"
            )
            return "", page_offset, False

        except requests.RequestException as e:
            logger.error(
                f"Marker API request failed for chunk at offset {page_offset}: {e}"
            )
            return "", page_offset, False
        except Exception as e:
            logger.error(
                f"Unexpected error in Marker parsing for chunk at offset {page_offset}: {e}"
            )
            return "", page_offset, False

    async def _parse_with_unstructured(
        self, file_path: Path, file_md5: str, file_type: str
    ) -> str:
        """Parse non-PDF files using Unstructured API."""
        logger.info(f"Parsing {file_type} with Unstructured API: {file_md5}")

        try:
            # Map common file extensions to content types
            content_type_map = {
                "txt": "text/plain",
                "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "doc": "application/msword",
                "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "html": "text/html",
                "xml": "application/xml",
                "csv": "text/csv",
                "md": "text/markdown",
                "unknown": "application/octet-stream",
            }

            content_type = content_type_map.get(file_type, "application/octet-stream")

            with open(file_path, "rb") as file:
                headers = {
                    "ACCEPT": "application/json",
                    "UNSTRUCTURED-API-KEY": self.config.unstructured_key,
                }

                files = [("files", (file_md5, file, content_type))]
                data = {
                    "strategy": "fast",
                    "coordinates": "true",
                }

                start_time = time.time()
                response = requests.post(
                    self.config.unstructured_url,
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=self.config.unstructured_timeout,
                )
                response.raise_for_status()

                elapsed_time = time.time() - start_time
                logger.info(
                    f"Unstructured API request completed in {elapsed_time:.2f}s"
                )

                # Parse response elements
                elements_data = response.json()
                if not elements_data:
                    logger.warning("Empty response from Unstructured API")
                    return "No content extracted from file"

                # Extract text from elements
                extracted_texts = []
                for element in elements_data:
                    if isinstance(element, dict) and "text" in element:
                        text = element["text"].strip()
                        if text:
                            extracted_texts.append(text)

                if not extracted_texts:
                    logger.warning("No text content found in Unstructured response")
                    return "No text content extracted from file"

                # Combine all extracted text
                full_text = "\n\n".join(extracted_texts)
                logger.info(
                    f"Successfully parsed {file_type}, content length: {len(full_text)}"
                )
                return full_text

        except requests.RequestException as e:
            logger.error(f"Unstructured API request failed: {e}")
            return f"Unstructured API request failed: {str(e)}"
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            return f"File not found: {file_path}"
        except Exception as e:
            logger.error(f"Unexpected error in Unstructured parsing: {e}")
            return f"Unstructured parsing error: {str(e)}"

    def get_supported_file_types(self) -> list[str]:
        """Get list of supported file types."""
        return [
            "pdf",  # Marker API
            "txt",  # Unstructured API
            "docx",
            "doc",  # Microsoft Word
            "pptx",
            "ppt",  # Microsoft PowerPoint
            "xlsx",
            "xls",  # Microsoft Excel
            "html",
            "htm",  # HTML
            "xml",  # XML
            "csv",  # CSV
            "md",  # Markdown
        ]

    def __repr__(self) -> str:
        """String representation of the tool."""
        return f"DocumentParserTool(marker_url={self.config.marker_url}, unstructured_url={self.config.unstructured_url})"


class ChunkRetrievalTool(BaseTool):
    """Tool for retrieving relevant chunks from parsed documents stored in vector database."""

    name: ClassVar[str] = "chunk_retrieval"
    args_schema: type[BaseModel] = ChunkRetrievalInput
    description: ClassVar[str] = (
        "Retrieve relevant document chunks from vector database using semantic search. "
        "Finds the most relevant chunks from multiple files based on query similarity. "
        "Requires the files to be previously parsed and stored in vector database."
    )

    def __init__(self, **kwargs):
        """Initialize ChunkRetrievalTool."""
        super().__init__(**kwargs)

    def _run(self, query: str, file_md5s: list[str], top_k: int = 5, **kwargs) -> str:
        """Perform chunk retrieval synchronously."""
        raise NotImplementedError("chunk_retrieval only supports async execution.")

    async def _arun(
        self, query: str, file_md5s: list[str], top_k: int = 5, **kwargs
    ) -> str:
        """Perform chunk retrieval asynchronously."""
        logger.info(
            f"Starting chunk retrieval for files: {file_md5s}, query: {query[:50]}..."
        )

        if not query or not query.strip():
            logger.warning("Empty query provided")
            return "Error: No query provided"

        if not file_md5s:
            logger.warning("No file MD5s provided")
            return "Error: No file MD5s provided"

        try:
            # Import vector manager from toolkit
            from ..utils.vector import create_vector_manager, vector_available

            # Check if vector functionality is available
            if not vector_available:
                error_msg = "Vector functionality not available - missing dependencies"
                logger.error(error_msg)
                return f"Error: {error_msg}"

            # Create vector manager instance
            vector_manager = await create_vector_manager()
            if not vector_manager:
                error_msg = (
                    "Failed to create vector manager: dependencies not available"
                )
                logger.error(error_msg)
                return f"Error: {error_msg}"

            # Search for relevant chunks using natural language query
            logger.debug(f"Searching for relevant chunks with top_k={top_k}")
            results = await vector_manager.search_by_query(
                query=query,
                file_md5s=file_md5s,
                top_k=top_k,
            )

            if not results:
                return f"No relevant chunks found for query in files {file_md5s}"

            logger.info(f"Successfully retrieved {len(results)} chunks for query")

            return "\n".join([r.text.strip() for r in results])

        except ImportError as e:
            error_msg = f"Chunk retrieval dependencies not available: {e}"
            logger.error(error_msg)
            return f"Error: {error_msg}"
        except Exception as e:
            error_msg = f"Chunk retrieval failed: {e}"
            logger.error(error_msg)
            return f"Error: {error_msg}"

    def __repr__(self) -> str:
        """String representation of the tool."""
        return "ChunkRetrievalTool()"
