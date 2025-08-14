"""
Unit tests for PgVectorSearchTool.

Tests the configuration functionality and behavior of the PgVector knowledge search tool.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from langcrew_tools.knowledge import KnowledgeSearchInput, PgVectorSearchTool
from langcrew_tools.utils.siliconflow import SiliconFlowClient
from langcrew_tools.utils.vector import EmbeddingResult, VectorConfig


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
    @patch("langcrew.knowledge.langchain_tools.vector_available", False)
    async def test_arun_when_vector_not_available(self):
        """Test handling when vector functionality is not available."""
        tool = PgVectorSearchTool()

        result = await tool._arun("test query", ["kb1"], 5)
        assert "Vector functionality not available" in result
        assert "missing dependencies" in result

    @pytest.mark.asyncio
    @patch("langcrew.knowledge.langchain_tools.create_vector_manager")
    async def test_arun_when_vector_manager_creation_fails(self, mock_create):
        """Test handling when vector manager creation fails."""
        mock_create.return_value = None
        tool = PgVectorSearchTool()

        result = await tool._arun("test query", ["kb1"], 5)
        assert "Failed to create vector manager" in result

    @pytest.mark.asyncio
    @patch("langcrew.knowledge.langchain_tools.create_vector_manager")
    async def test_arun_successful_search(self, mock_create):
        """Test successful search operation."""
        # Mock vector manager
        mock_manager = AsyncMock()
        mock_results = [
            EmbeddingResult(
                id="1",
                text="First result content",
                score=0.95,
                metadata={"source": "doc1"},
                knowledge_id="kb1",
                file_md5="abc123",
            ),
            EmbeddingResult(
                id="2",
                text="Second result content",
                score=0.87,
                metadata={"source": "doc2"},
                knowledge_id="kb1",
                file_md5="def456",
            ),
        ]
        mock_manager.search_knowledge_bases_with_rerank.return_value = mock_results
        mock_create.return_value = mock_manager

        tool = PgVectorSearchTool()
        result = await tool._arun("test query", ["kb1"], 5)

        # Verify vector manager was created
        mock_create.assert_called_once_with(config=None, siliconflow_client=None)

        # Verify search was called with correct parameters
        mock_manager.search_knowledge_bases_with_rerank.assert_called_once_with(
            query="test query", knowledge_ids=["kb1"], top_k=5, rerank_multiplier=2
        )

        # Verify results are formatted correctly
        assert "First result content" in result
        assert "Second result content" in result

    @pytest.mark.asyncio
    @patch("langcrew.knowledge.langchain_tools.create_vector_manager")
    async def test_arun_with_custom_config_injection(self, mock_create):
        """Test that custom config is properly passed to vector manager."""
        # Setup custom config
        config = VectorConfig(
            database_url="postgresql://custom:custom@customhost/customdb",
            index_name="custom_index",
        )
        client = MagicMock(spec=SiliconFlowClient)

        # Mock vector manager
        mock_manager = AsyncMock()
        mock_manager.search_knowledge_bases_with_rerank.return_value = []
        mock_create.return_value = mock_manager

        # Create tool with custom config
        tool = PgVectorSearchTool(vector_config=config, siliconflow_client=client)

        await tool._arun("test query", ["kb1"], 10)

        # Verify custom config was passed to create_vector_manager
        mock_create.assert_called_once_with(config=config, siliconflow_client=client)

    @pytest.mark.asyncio
    @patch("langcrew.knowledge.langchain_tools.create_vector_manager")
    async def test_arun_no_results_found(self, mock_create):
        """Test handling when no results are found."""
        mock_manager = AsyncMock()
        mock_manager.search_knowledge_bases_with_rerank.return_value = []
        mock_create.return_value = mock_manager

        tool = PgVectorSearchTool()
        result = await tool._arun("test query", ["kb1"], 5)

        assert result == "No relevant documents found"

    @pytest.mark.asyncio
    @patch("langcrew.knowledge.langchain_tools.create_vector_manager")
    async def test_arun_exception_handling(self, mock_create):
        """Test exception handling during search."""
        mock_manager = AsyncMock()
        mock_manager.search_knowledge_bases_with_rerank.side_effect = Exception(
            "Database connection error"
        )
        mock_create.return_value = mock_manager

        tool = PgVectorSearchTool()
        result = await tool._arun("test query", ["kb1"], 5)

        assert "Search failed" in result
        assert "Database connection error" in result

    @pytest.mark.asyncio
    @patch("langcrew.knowledge.langchain_tools.create_vector_manager")
    async def test_arun_with_multiple_knowledge_bases(self, mock_create):
        """Test search across multiple knowledge bases."""
        mock_manager = AsyncMock()
        mock_results = [
            EmbeddingResult(
                id="1",
                text="Result from KB1",
                score=0.9,
                metadata={},
                knowledge_id="kb1",
                file_md5="abc",
            ),
            EmbeddingResult(
                id="2",
                text="Result from KB2",
                score=0.85,
                metadata={},
                knowledge_id="kb2",
                file_md5="def",
            ),
        ]
        mock_manager.search_knowledge_bases_with_rerank.return_value = mock_results
        mock_create.return_value = mock_manager

        tool = PgVectorSearchTool()
        result = await tool._arun("test query", ["kb1", "kb2", "kb3"], 10)

        # Verify multiple knowledge bases were passed
        mock_manager.search_knowledge_bases_with_rerank.assert_called_once_with(
            query="test query",
            knowledge_ids=["kb1", "kb2", "kb3"],
            top_k=10,
            rerank_multiplier=2,
        )

        assert "Result from KB1" in result
        assert "Result from KB2" in result


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
