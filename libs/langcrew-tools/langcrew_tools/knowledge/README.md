# Knowledge Tools for LangCrew

## Description

The `knowledge` module in LangCrew provides tools for knowledge base operations and semantic search using PgVector database backend. These tools enable AI agents to search through knowledge bases, retrieve relevant documents, and access structured information with automatic embedding generation and reranking capabilities.

The knowledge tools support unified search across multiple knowledge bases with advanced vector similarity search and intelligent result ranking.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. Install additional dependencies for knowledge base operations:

```shell
pip install pgvector psycopg2-binary
```

3. Set up required environment variables for database connection:

```shell
export VECTOR_DATABASE_URL="postgresql://user:pass@localhost/db"
export VECTOR_INDEX_NAME="knowledge_vectors"
```

## Usage

```python
from langcrew_tools.knowledge import PgVectorSearchTool

# Initialize the knowledge search tool
knowledge_tool = PgVectorSearchTool()

# Search knowledge bases
result = await knowledge_tool.arun(
    query="What are the best practices for machine learning?",
    knowledge_ids=["ml_guide", "best_practices"],
    top_k=5
)
print(result)
```

## Supported Knowledge Tools

### PgVectorSearchTool

The `PgVectorSearchTool` provides comprehensive knowledge base search capabilities using PgVector with automatic embedding and reranking.

**Features:**
- Semantic search across knowledge bases
- Automatic embedding generation
- Intelligent result reranking
- Multi-knowledge base search
- Configurable result limits
- Markdown-formatted output
- Asynchronous operation support
- Error handling and logging

**Usage Example:**
```python
from langcrew_tools.knowledge import PgVectorSearchTool
from langcrew.utils.vector import VectorConfig

# Using default configuration
tool = PgVectorSearchTool()

# Search with default settings
result = await tool.arun(
    query="Python web development frameworks",
    knowledge_ids=["python_guide", "web_dev"],
    top_k=10
)

# Using custom configuration
config = VectorConfig(
    database_url="postgresql://user:pass@localhost/knowledge_db",
    index_name="custom_vectors"
)
custom_tool = PgVectorSearchTool(vector_config=config)

result = await custom_tool.arun(
    query="Data analysis techniques",
    knowledge_ids=["data_science", "analytics"],
    top_k=5
)
```

## Knowledge Base Management

### Knowledge Base Structure
- **Knowledge IDs** - Unique identifiers for different knowledge bases
- **Document Storage** - Vectorized document storage in PostgreSQL
- **Metadata Management** - Document metadata and indexing
- **Version Control** - Knowledge base versioning and updates

### Search Capabilities
- **Semantic Search** - Meaning-based search using embeddings
- **Multi-base Search** - Search across multiple knowledge bases
- **Reranking** - Intelligent result ranking and relevance scoring
- **Configurable Results** - Adjustable number of returned results

## Integration with LangCrew Agents

These tools are designed to be used within LangCrew agent workflows:

```python
from langcrew import Agent
from langcrew.project import agent
from langcrew_tools.knowledge import PgVectorSearchTool

@agent
def knowledge_assistant(self) -> Agent:
    return Agent(
        config=self.agents_config["knowledge_assistant"],
        allow_delegation=False,
        tools=[PgVectorSearchTool()]
    )
```

## Search Workflow

The knowledge tools support a complete search workflow:

1. **Query Processing** - Process and validate search queries
2. **Embedding Generation** - Generate vector embeddings for queries
3. **Vector Search** - Perform similarity search in vector database
4. **Reranking** - Apply intelligent reranking algorithms
5. **Result Formatting** - Format results for consumption
6. **Response Delivery** - Return formatted search results

## Configuration Options

### Vector Configuration
- **Database URL** - PostgreSQL connection string
- **Index Name** - Vector index name for storage
- **Embedding Model** - Model for generating embeddings
- **Search Parameters** - Similarity search configuration
- **Reranking Settings** - Result reranking configuration

### Search Parameters
- **Top K** - Number of results to return
- **Knowledge IDs** - Target knowledge bases for search
- **Query Processing** - Query preprocessing options
- **Result Formatting** - Output format configuration

## Error Handling

The tools include comprehensive error handling:
- Database connection failures
- Vector functionality availability checks
- Query validation and processing errors
- Embedding generation failures
- Search execution errors
- Result formatting issues

## Performance Optimization

- **Vector Indexing** - Optimized vector storage and retrieval
- **Caching** - Query and result caching for improved performance
- **Async Operations** - Non-blocking search operations
- **Connection Pooling** - Efficient database connection management
- **Batch Processing** - Batch search operations for multiple queries

## Security Features

- **Database Security** - Secure database connections and access
- **Query Validation** - Input validation and sanitization
- **Access Control** - Knowledge base access permissions
- **Data Privacy** - Secure handling of sensitive information
- **Audit Logging** - Search activity logging and monitoring

## Advanced Features

### Semantic Search
- **Embedding Models** - State-of-the-art embedding generation
- **Similarity Metrics** - Advanced similarity calculation methods
- **Context Awareness** - Context-aware search capabilities
- **Multi-modal Search** - Support for text and structured data

### Result Enhancement
- **Reranking Algorithms** - Intelligent result ranking
- **Relevance Scoring** - Advanced relevance calculation
- **Result Clustering** - Grouped and organized results
- **Context Preservation** - Maintain search context across queries

## Database Requirements

### PostgreSQL Setup
- **PgVector Extension** - Vector similarity search extension
- **Database Schema** - Optimized schema for knowledge storage
- **Index Configuration** - Vector index optimization
- **Connection Management** - Efficient connection handling

### Performance Tuning
- **Index Optimization** - Vector index performance tuning
- **Query Optimization** - Search query optimization
- **Resource Management** - Database resource allocation
- **Monitoring** - Performance monitoring and alerting

## License

This module is part of the LangCrew project and is released under the MIT License. 