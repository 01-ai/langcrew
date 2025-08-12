"""
PGVector Manager Module

Unified pgvector management for document storage and retrieval with embedding generation.
Combines storage and search functionality in a single, simplified interface.
"""

import json
import logging
import time
from datetime import datetime
from typing import Any

from langchain_core.documents import Document
from sqlalchemy import text as sql_text

from ..siliconflow import SiliconFlowClient
from .config import EmbeddingResult, VectorConfig, VectorFileMeta
from .exceptions import VectorError

logger = logging.getLogger(__name__)


class VectorManager:
    """Unified PGVector manager for document storage and retrieval.

    This class provides a complete interface for pgvector operations including:
    - Document embedding generation and storage
    - Vector similarity search and retrieval
    - Database management (insert, update, delete)

    Features:
    - Automatic embedding generation using SiliconFlow
    - Batch processing for efficient storage
    - Flexible search with multiple filter options
    - Async operations for better performance
    """

    def __init__(
        self,
        config: VectorConfig | None = None,
        siliconflow_client: SiliconFlowClient | None = None,
    ):
        """Initialize VectorManager.

        Args:
            config: VectorConfig configuration object
            siliconflow_client: SiliconFlow client for embedding generation
        """

        self.config = config or VectorConfig()
        self.siliconflow_client = siliconflow_client or SiliconFlowClient()
        self.session_factory = self.config.create_session_factory()

        # Validate configuration
        self.config.validate()

        logger.info(f"VectorManager initialized with index: {self.config.index_name}")

    # ===============================
    # Document Storage Operations
    # ===============================

    async def store_documents(
        self,
        file_md5: str,
        documents: list[Document],
        replace_existing: bool = True,
    ) -> dict[str, Any]:
        """Store parsed documents in pgvector with automatic embedding generation.

        Args:
            file_md5: MD5 hash of the file
            documents: List of parsed document chunks
            replace_existing: Whether to replace existing vectors (default: True)

        Returns:
            Dictionary with operation status and statistics
        """
        if not documents:
            logger.warning(f"No documents to store for file_md5: {file_md5}")
            return {
                "success": False,
                "error": "No documents provided",
                "chunks_stored": 0,
                "file_md5": file_md5,
            }

        start_time = time.time()
        logger.info(
            f"[store_documents] Starting vector storage for file_md5:{file_md5}, chunks:{len(documents)}"
        )

        try:
            # Create file metadata
            file_meta = VectorFileMeta(file_md5=file_md5)

            # Clean existing vectors if requested
            if replace_existing:
                await self._delete_existing_vectors(file_md5)

            # Process documents in chunks
            chunk_size = self.config.embedding_chunk_size
            texts = [d.page_content for d in documents]
            metadatas = [d.metadata for d in documents]

            # Add text to metadata for storage
            for metadata, text in zip(metadatas, texts):
                metadata["text"] = text

            total_stored = 0

            # Process in embedding chunks
            for i in range(0, len(texts), chunk_size):
                chunk_texts = texts[i : i + chunk_size]
                chunk_metadatas = metadatas[i : i + chunk_size]

                # Generate embeddings
                embeddings = await self._generate_embeddings(chunk_texts, file_md5)

                # Store in database
                stored_count = await self._store_chunks_to_db(
                    file_meta=file_meta,
                    embeddings=embeddings,
                    metadatas=chunk_metadatas,
                )
                total_stored += stored_count

            cost_time = time.time() - start_time
            logger.info(
                f"[store_documents] completed, file_md5:{file_md5} chunks_stored:{total_stored} cost:{cost_time:.2f}s"
            )

            return {
                "success": True,
                "chunks_stored": total_stored,
                "file_md5": file_md5,
                "cost_seconds": cost_time,
                "index_name": self.config.index_name,
            }

        except Exception as e:
            logger.error(
                f"[store_documents] failed for file_md5:{file_md5}, error: {e}"
            )
            return {
                "success": False,
                "error": str(e),
                "chunks_stored": 0,
                "file_md5": file_md5,
            }

    async def delete_documents(self, file_md5: str) -> bool:
        """Delete all vectors for a specific file.

        Args:
            file_md5: MD5 hash of the file to delete

        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            await self._delete_existing_vectors(file_md5)
            return True
        except Exception as e:
            logger.error(f"Failed to delete documents for {file_md5}: {e}")
            return False

    # ===============================
    # Search and Retrieval Operations
    # ===============================

    async def search_by_query(
        self,
        query: str,
        knowledge_ids: list[str] | None = None,
        file_md5s: list[str] | None = None,
        top_k: int = 10,
    ) -> list[EmbeddingResult]:
        """Search documents using natural language query.

        Args:
            query: Natural language search query
            knowledge_ids: Optional list of knowledge base IDs to filter by
            file_md5s: Optional list of file MD5s to filter by
            top_k: Number of top results to return

        Returns:
            List of search results sorted by similarity
        """
        if not query or not query.strip():
            logger.warning("Empty query provided")
            return []

        # Generate query embedding
        try:
            query_embedding = await self.siliconflow_client.embed_query(
                text=query, model="BAAI/bge-m3"
            )
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            raise VectorError(f"Query embedding generation failed: {e}")

        return await self.search_by_embedding(
            query_embedding=query_embedding,
            knowledge_ids=knowledge_ids,
            file_md5s=file_md5s,
            top_k=top_k,
        )

    async def search_by_embedding(
        self,
        query_embedding: list[float],
        knowledge_ids: list[str] | None = None,
        file_md5s: list[str] | None = None,
        top_k: int = 10,
    ) -> list[EmbeddingResult]:
        """Search vectors by embedding similarity.

        Args:
            query_embedding: Query embedding vector
            knowledge_ids: Optional list of knowledge base IDs to filter by
            file_md5s: Optional list of file MD5s to filter by
            top_k: Number of top results to return

        Returns:
            List[EmbeddingResult]: Search results sorted by similarity
        """
        if not query_embedding:
            logger.warning("No query embedding provided, returning empty list")
            return []

        logger.debug(f"Searching vectors with top_k={top_k}")

        if knowledge_ids:
            return await self.query_embedding_by_embedding_with_knowledge_ids(
                knowledge_ids=knowledge_ids,
                query_embedding=query_embedding,
                top_k=top_k,
            )

        try:
            async with self.session_factory() as session:
                # Build dynamic WHERE clause based on filters
                where_conditions = []
                params = {
                    "query_embedding": json.dumps(query_embedding),
                    "top_k": top_k,
                }

                if file_md5s:
                    where_conditions.append("md5 = ANY(:file_md5s)")
                    params["file_md5s"] = file_md5s

                where_clause = ""
                if where_conditions:
                    where_clause = "WHERE " + " AND ".join(where_conditions)

                # Build query - handle both knowledge_id and md5 columns
                query_sql = f"""
                    SELECT 
                        id, 
                        metadata->>'text' as text,
                        metadata,
                        '' as knowledge_id,
                        md5 as file_md5,
                        embedding <=> :query_embedding as similarity
                    FROM {self.config.index_name}
                    {where_clause}
                    ORDER BY embedding <=> :query_embedding
                    LIMIT :top_k
                """

                query = sql_text(query_sql)
                result = await session.execute(query, params)
                embeddings = result.fetchall()

                logger.info(f"Found {len(embeddings)} embedding results")

                return [
                    EmbeddingResult(
                        id=str(embedding.id),
                        text=embedding.text or "",
                        score=float(embedding.similarity),
                        metadata=embedding.metadata,
                        knowledge_id=embedding.knowledge_id or None,
                        file_md5=embedding.file_md5 or None,
                    )
                    for embedding in embeddings
                ]

        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise VectorError(f"Vector search failed: {e}")

    async def query_embedding_by_embedding_with_knowledge_ids(
        self,
        knowledge_ids: list[str],
        query_embedding: list[float],
        top_k: int,
    ) -> list[EmbeddingResult]:
        logger.debug(f"Searching vectors with top_k={top_k}")
        try:
            async with self.session_factory() as session:
                params = {
                    "query_embedding": json.dumps(query_embedding),
                    "knowledge_ids": knowledge_ids,
                    "top_k": top_k,
                }
                query = sql_text("""
                    SELECT id, doc_chunk, meta_data, knowledge_id, embedding <=> :query_embedding as similarity
                    FROM embeddings
                    WHERE knowledge_id = ANY(:knowledge_ids)
                    ORDER BY embedding <=> :query_embedding
                    LIMIT :top_k""")
                result = await session.execute(query, params)
                embeddings = result.fetchall()

                logger.info(f"Found {len(embeddings)} embedding results")

                return [
                    EmbeddingResult(
                        id=str(embedding[0]),
                        text=embedding[1] or "",
                        score=float(embedding[4]),
                        metadata=embedding[2],
                        knowledge_id=embedding[3] or None,
                        file_md5=json.loads(embedding[2]).get("md5", None),
                    )
                    for embedding in embeddings
                ]

        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise VectorError(f"Vector search failed: {e}")

    async def search_in_file(
        self,
        query_embedding: list[float],
        file_md5: str,
        top_k: int = 10,
    ) -> list[EmbeddingResult]:
        """Search vectors within a specific file by MD5.

        Args:
            query_embedding: Query embedding vector
            file_md5: File MD5 hash to search within
            top_k: Number of top results to return

        Returns:
            List[EmbeddingResult]: Search results from the specified file
        """
        return await self.search_by_embedding(
            query_embedding=query_embedding, file_md5s=[file_md5], top_k=top_k
        )

    async def search_in_knowledge_bases(
        self,
        query_embedding: list[float],
        knowledge_ids: list[str],
        top_k: int = 10,
    ) -> list[EmbeddingResult]:
        """Search vectors within specific knowledge bases.

        Args:
            query_embedding: Query embedding vector
            knowledge_ids: List of knowledge base IDs to search within
            top_k: Number of top results to return

        Returns:
            List[EmbeddingResult]: Search results from specified knowledge bases
        """
        return await self.search_by_embedding(
            query_embedding=query_embedding, knowledge_ids=knowledge_ids, top_k=top_k
        )

    async def search_knowledge_bases_with_rerank(
        self,
        query: str,
        knowledge_ids: list[str],
        top_k: int = 10,
        rerank_multiplier: int = 2,
    ) -> list[EmbeddingResult]:
        """Search knowledge bases with automatic embedding generation and reranking.

        This is a complete search pipeline that:
        1. Generates query embedding
        2. Searches vector database (fetches more results for reranking)
        3. Applies reranking to improve relevance
        4. Returns top_k most relevant results

        Args:
            query: Natural language search query
            knowledge_ids: List of knowledge base IDs to search within
            top_k: Number of final results to return
            rerank_multiplier: Factor to multiply top_k for initial search (default: 2)

        Returns:
            List[EmbeddingResult]: Reranked search results
        """
        if not query or not query.strip():
            logger.warning("Empty query provided")
            return []

        if not knowledge_ids:
            logger.warning("No knowledge IDs provided")
            return []

        # Step 1: Generate query embedding
        try:
            query_embedding = await self.siliconflow_client.embed_query(
                text=query, model="BAAI/bge-m3"
            )
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            raise VectorError(f"Query embedding generation failed: {e}")

        # Step 2: Search vector database (fetch more results for reranking)
        search_top_k = top_k * rerank_multiplier
        logger.debug(f"Searching database with top_k={search_top_k}")

        rag_results = await self.search_by_embedding(
            query_embedding=query_embedding,
            knowledge_ids=knowledge_ids,
            top_k=search_top_k,
        )

        if not rag_results:
            logger.info("No results found in vector search")
            return []

        # Step 3: Apply reranking if we have multiple results
        if len(rag_results) <= 1:
            logger.debug("Single result, skipping reranking")
            return rag_results[:top_k]

        try:
            # Convert results to documents for reranking
            documents = [result.text for result in rag_results]

            rerank_result = await self.siliconflow_client.rerank_documents(
                query=query,
                documents=documents,
                top_n=min(top_k, len(documents)),
            )

            if not rerank_result or "results" not in rerank_result:
                logger.warning("Reranking failed, returning original results")
                return rag_results[:top_k]

            # Step 4: Reorder results based on reranking scores
            reranked_results = []
            rerank_indices = []

            for rerank_item in rerank_result["results"]:
                index = rerank_item.get("index", -1)
                if 0 <= index < len(rag_results):
                    original_result = rag_results[index]
                    # Update score with rerank score
                    reranked_result = EmbeddingResult(
                        id=original_result.id,
                        text=original_result.text,
                        score=rerank_item.get("relevance_score", original_result.score),
                        metadata=original_result.metadata,
                        knowledge_id=original_result.knowledge_id,
                        file_md5=original_result.file_md5,
                    )
                    reranked_results.append(reranked_result)
                    rerank_indices.append(index)

            logger.info(
                f"Reranked {len(reranked_results)} results from {len(rag_results)} initial results"
            )
            return reranked_results

        except Exception as e:
            logger.warning(f"Reranking failed: {e}, returning original results")
            return rag_results[:top_k]

    # ===============================
    # Private Helper Methods
    # ===============================

    async def _generate_embeddings(
        self, chunk_texts: list[str], file_md5: str
    ) -> list[list[float]]:
        """Generate embeddings for text chunks using SiliconFlow client."""
        logger.info(
            f"[_generate_embeddings] start, file_md5:{file_md5}, chunks:{len(chunk_texts)}"
        )
        start_time = time.perf_counter()

        try:
            embeddings = await self.siliconflow_client.embed_documents(
                file_md5=file_md5, chunk_texts=chunk_texts, model="BAAI/bge-m3"
            )

            if not embeddings:
                raise VectorError(f"Empty embeddings for {file_md5}")

            logger.info(
                f"[_generate_embeddings] completed, file_md5:{file_md5}, embeddings:{len(embeddings)}"
            )
            return embeddings

        except Exception as e:
            logger.error(f"[_generate_embeddings] error for {file_md5}: {e}")
            raise VectorError(f"Embedding generation failed: {e}")
        finally:
            cost = (time.perf_counter() - start_time) * 1000
            logger.info(f"[_generate_embeddings] cost: {cost:.2f}ms")

    async def _delete_existing_vectors(self, file_md5: str) -> None:
        """Delete existing vectors for the given file MD5."""
        try:
            async with self.session_factory() as session:
                await session.execute(
                    sql_text(f"DELETE FROM {self.config.index_name} WHERE md5 = :md5"),
                    {"md5": file_md5},
                )
                await session.commit()
                logger.info(
                    f"[_delete_existing_vectors] deleted vectors for md5:{file_md5}"
                )
        except Exception as e:
            logger.error(
                f"[_delete_existing_vectors] failed for md5:{file_md5}, error: {e}"
            )
            raise VectorError(f"Failed to delete existing vectors: {e}")

    async def _store_chunks_to_db(
        self,
        file_meta: VectorFileMeta,
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> int:
        """Store embedding chunks to PostgreSQL database.

        Returns:
            Number of successfully stored chunks
        """
        try:
            async with self.session_factory() as session:
                # Prepare batch insert data
                vector_data_list = [
                    {
                        "md5": file_meta.file_md5,
                        "embedding": json.dumps(embedding),
                        "metadata": json.dumps(metadata),
                        "created_at": datetime.now(),
                    }
                    for embedding, metadata in zip(embeddings, metadatas)
                ]

                # Batch insert with configured batch size
                stored_count = 0
                for j in range(0, len(vector_data_list), self.config.batch_size):
                    batch = vector_data_list[j : j + self.config.batch_size]

                    # Execute batch insert
                    await session.execute(
                        sql_text(f"""
                        INSERT INTO {self.config.index_name}
                        (md5, embedding, metadata, created_at)
                        VALUES (:md5, :embedding, :metadata, :created_at)
                        """),
                        batch,
                    )
                    await session.commit()
                    stored_count += len(batch)

                logger.info(
                    f"[_store_chunks_to_db] stored {stored_count} chunks for md5:{file_meta.file_md5}"
                )
                return stored_count

        except Exception as e:
            logger.error(
                f"[_store_chunks_to_db] failed for md5:{file_meta.file_md5}, error: {e}"
            )
            raise VectorError(f"Database storage failed: {e}")


async def create_vector_manager(
    config: VectorConfig | None = None,
    siliconflow_client: SiliconFlowClient | None = None,
) -> VectorManager | None:
    """Factory function to create VectorManager.

    Args:
        config: VectorConfig configuration object
        siliconflow_client: SiliconFlow client for embedding generation

    Returns:
        VectorManager instance or None if dependencies unavailable
    """
    try:
        return VectorManager(config=config, siliconflow_client=siliconflow_client)
    except Exception as e:
        logger.error(f"Failed to create vector manager: {e}")
        return None
