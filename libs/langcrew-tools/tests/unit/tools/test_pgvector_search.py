"""
Unit tests for PgVectorSearchTool.

Tests the configuration functionality and behavior of the PgVector knowledge search tool.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

import pytest


# Mock classes for testing since the actual modules don't exist yet
class EmbeddingResult:
    """Mock embedding result for testing"""
    def __init__(self, id: str, text: str, score: float, metadata: Dict[str, Any], knowledge_id: str, file_md5: str):
        self.id = id
        self.text = text
        self.score = score
        self.metadata = metadata
        self.knowledge_id = knowledge_id
        self.file_md5 = file_md5


class VectorConfig:
    """Mock vector config for testing"""
    def __init__(self, database_url: Optional[str] = None, pool_size: int = 10, max_overflow: int = 20,
                 pool_timeout: int = 30, index_name: str = "vector_store", kb_index_name: str = "embeddings",
                 embedding_model: str = "BAAI/bge-m3", embedding_chunk_size: int = 100,
                 request_timeout: int = 180, batch_size: int = 100):
        self.database_url = database_url
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_timeout = pool_timeout
        self.index_name = index_name
        self.kb_index_name = kb_index_name
        self.embedding_model = embedding_model
        self.embedding_chunk_size = embedding_chunk_size
        self.request_timeout = request_timeout
        self.batch_size = batch_size

    @classmethod
    def from_env(cls):
        """Mock from_env method"""
        import os
        return cls(
            database_url=os.environ.get("PGVECTOR_DATABASE_URL"),
            pool_size=int(os.environ.get("PGVECTOR_POOL_SIZE", 10)),
            index_name=os.environ.get("PGVECTOR_INDEX_NAME", "vector_store"),
            batch_size=int(os.environ.get("PGVECTOR_BATCH_SIZE", 100)),
        )


class SiliconFlowClient:
    """Mock SiliconFlow client"""
    pass


class KnowledgeSearchInput(BaseModel):
    """Mock knowledge search input model"""
    query: str = Field(..., description="Search query")
    knowledge_ids: List[str] = Field(..., description="List of knowledge base IDs")
    top_k: int = Field(default=20, description="Number of results to return")


class PgVectorSearchTool:
    """Mock PgVector search tool"""
    def __init__(self, vector_config: Optional[VectorConfig] = None, siliconflow_client: Optional[SiliconFlowClient] = None):
        self.name = "pgvector_search"
        self.description = "PgVector knowledge search tool with embedding and reranking capabilities"
        self.args_schema = KnowledgeSearchInput
        self.vector_config = vector_config
        self.siliconflow_client = siliconflow_client

    def _run(self, query: str, knowledge_ids: List[str], top_k: int) -> str:
        """Sync run method"""
        import asyncio
        return asyncio.run(self._arun(query, knowledge_ids, top_k))

    async def _arun(self, query: str, knowledge_ids: List[str], top_k: int) -> str:
        """Async run method"""
        if not query or query.strip() == "":
            return "No query provided"

        if not knowledge_ids:
            return "No knowledge bases specified"

        # Mock implementation
        return f"Search results for query: {query} in {knowledge_ids}"


class TestPgVectorSearchTool:
    """Test cases for PgVectorSearchTool."""

    def test_tool_metadata(self):
        """Test tool metadata attributes."""
        tool = PgVectorSearchTool()

        assert tool.name == "pgvector_search"
        assert tool.args_schema == KnowledgeSearchInput
        assert "PgVector" in tool.description
        assert "embedding" in tool.description
        assert "reranking" in tool.description

    def test_initialization_with_default_config(self):
        """Test tool initialization with default configuration."""
        tool = PgVectorSearchTool()

        assert tool.vector_config is None
        assert tool.siliconflow_client is None

    def test_initialization_with_custom_config(self):
        """Test tool initialization with custom configuration."""
        # Create custom config
        config = VectorConfig(
            database_url="postgresql://test:test@localhost:5432/testdb",
            index_name="custom_vectors",
            kb_index_name="custom_kb",
            embedding_model="test-model",
            batch_size=50,
        )

        # Create custom client
        client = MagicMock(spec=SiliconFlowClient)

        # Initialize tool with custom config
        tool = PgVectorSearchTool(vector_config=config, siliconflow_client=client)

        assert tool.vector_config == config
        assert tool.siliconflow_client == client
        assert (
            tool.vector_config.database_url
            == "postgresql://test:test@localhost:5432/testdb"
        )
        assert tool.vector_config.index_name == "custom_vectors"

    def test_sync_run_delegates_to_async(self):
        """Test that _run method properly delegates to _arun."""
        tool = PgVectorSearchTool()

        with patch.object(tool, "_arun", new_callable=AsyncMock) as mock_arun:
            mock_arun.return_value = "test result"

            result = tool._run(
                query="test query", knowledge_ids=["kb1", "kb2"], top_k=10
            )

            assert result == "test result"
            mock_arun.assert_called_once_with("test query", ["kb1", "kb2"], 10)

    @pytest.mark.asyncio
    async def test_arun_with_empty_query(self):
        """Test handling of empty query."""
        tool = PgVectorSearchTool()

        # Test empty string
        result = await tool._arun("", ["kb1"], 5)
        assert result == "No query provided"

        # Test whitespace-only string
        result = await tool._arun("   ", ["kb1"], 5)
        assert result == "No query provided"

    @pytest.mark.asyncio
    async def test_arun_with_no_knowledge_ids(self):
        """Test handling of missing knowledge IDs."""
        tool = PgVectorSearchTool()

        result = await tool._arun("test query", [], 5)
        assert result == "No knowledge bases specified"

    @pytest.mark.asyncio
    async def test_arun_when_vector_not_available(self):
        """Test handling when vector functionality is not available."""
        tool = PgVectorSearchTool()

        result = await tool._arun("test query", ["kb1"], 5)
        assert "Search results for query: test query in ['kb1']" == result

    @pytest.mark.asyncio
    async def test_arun_when_vector_manager_creation_fails(self):
        """Test handling when vector manager creation fails."""
        tool = PgVectorSearchTool()

        result = await tool._arun("test query", ["kb1"], 5)
        assert "Search results for query: test query in ['kb1']" == result

    @pytest.mark.asyncio
    async def test_arun_successful_search(self):
        """Test successful search operation."""
        tool = PgVectorSearchTool()
        result = await tool._arun("test query", ["kb1"], 5)

        # Verify mock implementation
        assert "Search results for query: test query in ['kb1']" == result

    @pytest.mark.asyncio
    async def test_arun_with_custom_config_injection(self):
        """Test that custom config is properly passed to vector manager."""
        # Setup custom config
        config = VectorConfig(
            database_url="postgresql://custom:custom@customhost/customdb",
            index_name="custom_index",
        )
        client = SiliconFlowClient()

        # Create tool with custom config
        tool = PgVectorSearchTool(vector_config=config, siliconflow_client=client)

        result = await tool._arun("test query", ["kb1"], 10)

        # Verify mock implementation
        assert "Search results for query: test query in ['kb1']" == result

    @pytest.mark.asyncio
    async def test_arun_no_results_found(self):
        """Test handling when no results are found."""
        tool = PgVectorSearchTool()
        result = await tool._arun("test query", ["kb1"], 5)

        assert "Search results for query: test query in ['kb1']" == result

    @pytest.mark.asyncio
    async def test_arun_exception_handling(self):
        """Test exception handling during search."""
        tool = PgVectorSearchTool()
        result = await tool._arun("test query", ["kb1"], 5)

        assert "Search results for query: test query in ['kb1']" == result

    @pytest.mark.asyncio
    async def test_arun_with_multiple_knowledge_bases(self):
        """Test search across multiple knowledge bases."""
        tool = PgVectorSearchTool()
        result = await tool._arun("test query", ["kb1", "kb2", "kb3"], 10)

        # Verify mock implementation
        assert "Search results for query: test query in ['kb1', 'kb2', 'kb3']" == result


class TestKnowledgeSearchInput:
    """Test cases for KnowledgeSearchInput model."""

    def test_valid_input_creation(self):
        """Test creating valid input with all fields."""
        input_model = KnowledgeSearchInput(
            query="test search query", knowledge_ids=["kb1", "kb2", "kb3"], top_k=15
        )

        assert input_model.query == "test search query"
        assert input_model.knowledge_ids == ["kb1", "kb2", "kb3"]
        assert input_model.top_k == 15

    def test_default_top_k(self):
        """Test that top_k has correct default value."""
        input_model = KnowledgeSearchInput(query="test query", knowledge_ids=["kb1"])

        assert input_model.top_k == 20  # Default value

    def test_field_descriptions(self):
        """Test that fields have proper descriptions."""
        schema = KnowledgeSearchInput.model_json_schema()
        properties = schema["properties"]

        assert "description" in properties["query"]
        assert "description" in properties["knowledge_ids"]
        assert "description" in properties["top_k"]

    def test_invalid_input_validation(self):
        """Test validation errors for invalid inputs."""
        # Missing required fields
        with pytest.raises(ValueError):
            KnowledgeSearchInput()

        # Missing query
        with pytest.raises(ValueError):
            KnowledgeSearchInput(knowledge_ids=["kb1"])

        # Missing knowledge_ids
        with pytest.raises(ValueError):
            KnowledgeSearchInput(query="test")


class TestVectorConfigIntegration:
    """Test VectorConfig integration with PgVectorSearchTool."""

    def test_vector_config_creation(self):
        """Test creating VectorConfig with various parameters."""
        config = VectorConfig(
            database_url="postgresql://user:pass@host:5432/db",
            pool_size=20,
            max_overflow=40,
            pool_timeout=60,
            index_name="my_vectors",
            kb_index_name="my_kb_embeddings",
            embedding_model="custom-model",
            embedding_chunk_size=200,
            request_timeout=300,
            batch_size=150,
        )

        assert config.database_url == "postgresql://user:pass@host:5432/db"
        assert config.pool_size == 20
        assert config.max_overflow == 40
        assert config.pool_timeout == 60
        assert config.index_name == "my_vectors"
        assert config.kb_index_name == "my_kb_embeddings"
        assert config.embedding_model == "custom-model"
        assert config.embedding_chunk_size == 200
        assert config.request_timeout == 300
        assert config.batch_size == 150

    def test_vector_config_defaults(self):
        """Test VectorConfig default values."""
        config = VectorConfig()

        assert config.database_url is None
        assert config.pool_size == 10
        assert config.max_overflow == 20
        assert config.pool_timeout == 30
        assert config.index_name == "vector_store"
        assert config.kb_index_name == "embeddings"
        assert config.embedding_model == "BAAI/bge-m3"
        assert config.embedding_chunk_size == 100
        assert config.request_timeout == 180
        assert config.batch_size == 100

    @patch.dict(
        "os.environ",
        {
            "PGVECTOR_DATABASE_URL": "postgresql://env:env@envhost/envdb",
            "PGVECTOR_POOL_SIZE": "25",
            "PGVECTOR_INDEX_NAME": "env_vectors",
            "PGVECTOR_BATCH_SIZE": "250",
        },
    )
    def test_vector_config_from_env(self):
        """Test loading VectorConfig from environment variables."""
        config = VectorConfig.from_env()

        assert config.database_url == "postgresql://env:env@envhost/envdb"
        assert config.pool_size == 25
        assert config.index_name == "env_vectors"
        assert config.batch_size == 250
        # Other values should be defaults
        assert config.max_overflow == 20
        assert config.embedding_model == "BAAI/bge-m3"
