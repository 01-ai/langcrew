# Utils Module

Core infrastructure and utility components for LangCrew Tools, providing foundational services for sandbox management, cloud integration, configuration management, and vector operations.

## Overview

The `utils` module serves as the foundation layer for all LangCrew tools, providing:

- **Sandbox Management**: E2B sandbox lifecycle and connection management
- **Cloud Storage**: S3-compatible storage operations with async support
- **Vector Operations**: Embedding and vector database integrations
- **AI Service Integration**: SiliconFlow API client for embedding and rerank
- **Configuration Management**: Environment variable handling with type conversion
- **Infrastructure Helpers**: Common utilities for tool development

## Module Structure

```
utils/
├── env_config.py           # Environment variable management
├── sandbox/                # E2B sandbox utilities
│   ├── base_sandbox.py     # SandboxMixin for tools
│   ├── s3_integration.py   # Sandbox-S3 integration
│   └── toolkit.py          # Sandbox lifecycle management
├── s3/                     # S3 storage utilities
│   ├── client.py           # Async S3 client
│   └── factory.py          # Client factory patterns
├── vector/                 # Vector database utilities
│   ├── manager.py          # Vector operations manager
│   ├── config.py           # Vector configurations
│   └── exceptions.py       # Vector-specific exceptions
└── siliconflow/           # SiliconFlow API integration
    ├── client.py           # SiliconFlow API client
    ├── config.py           # Service configuration
    └── exceptions.py       # Service exceptions
```

## Core Components

### 1. Configuration Management (`env_config.py`)

Robust environment variable handling with type conversion and validation.

#### Features

- ✅ Type-safe environment variable parsing
- ✅ Nested configuration from prefixed variables
- ✅ Parameter filtering for function compatibility
- ✅ Comprehensive error handling

#### Usage Example

```python
from langcrew_tools.utils.env_config import env_config

# Basic typed retrieval
api_key = env_config.get_str("API_KEY", required=True)
timeout = env_config.get_int("TIMEOUT", default=30)
debug_mode = env_config.get_bool("DEBUG", default=False)

# List from comma-separated values
allowed_hosts = env_config.get_list("ALLOWED_HOSTS", separator=",")

# Configuration dictionary from prefix
db_config = env_config.get_dict("DATABASE_")
# DATABASE_HOST=localhost -> {"host": "localhost"}
# DATABASE_PORT=5432 -> {"port": "5432"}

# Parameter filtering for functions
def create_client(host: str, port: int, ssl: bool = True):
    pass

params = {"host": "localhost", "port": "5432", "extra": "ignored"}
valid_params = env_config.filter_valid_parameters(create_client, params)
# Returns: {"host": "localhost", "port": 5432}
```

#### Advanced Features

```python
# Dataclass integration
@dataclass
class DatabaseConfig:
    host: str
    port: int
    ssl_enabled: bool = True

# Auto-convert environment variables to dataclass
db_config = env_config.get_dict("DB_", target_type=DatabaseConfig)
```

### 2. Sandbox Management (`sandbox/`)

Complete E2B sandbox lifecycle management with connection pooling and integration capabilities.

#### SandboxMixin

Base mixin for all tools that need sandbox access.

```python
from langcrew_tools.utils.sandbox import SandboxMixin
from langchain_core.tools import BaseTool

class MyTool(BaseTool, SandboxMixin):
    async def _arun(self, query: str) -> str:
        sandbox = await self.get_sandbox()
        result = await sandbox.files.read("/workspace/data.txt")
        return result
```

#### Sandbox Toolkit

Advanced sandbox management with connection pooling.

```python
from langcrew_tools.utils.sandbox import sandbox_toolkit

# Get or create sandbox
sandbox = await sandbox_toolkit.get_sandbox(
    template_id="python-3.11",
    keep_alive=True
)

# Sandbox with S3 integration
from langcrew_tools.utils.sandbox import sandbox_s3_toolkit

sandbox = await sandbox_s3_toolkit.get_sandbox_with_s3(
    template_id="python-3.11",
    s3_bucket="my-bucket",
    s3_prefix="data/"
)
```

### 3. S3 Storage Integration (`s3/`)

Production-ready S3-compatible storage client with advanced features.

#### AsyncS3Client

High-performance async S3 operations with automatic retry and error handling.

```python
from langcrew_tools.utils.s3 import AsyncS3Client, S3Config

# Create client
config = S3Config(
    endpoint_url="https://s3.amazonaws.com",
    access_key_id="your-key",
    secret_access_key="your-secret",
    region_name="us-east-1"
)

async with AsyncS3Client(config) as client:
    # Upload file
    await client.upload_file(
        local_path="/local/file.txt",
        bucket="my-bucket",
        key="remote/file.txt"
    )
    
    # Download file
    await client.download_file(
        bucket="my-bucket",
        key="remote/file.txt",
        local_path="/local/downloaded.txt"
    )
    
    # Stream operations
    async for chunk in client.download_stream("my-bucket", "large-file.zip"):
        process_chunk(chunk)
```

#### S3 Factory Pattern

Simplified client creation with environment-based configuration.

```python
from langcrew_tools.utils.s3 import create_s3_client

# Auto-configure from environment
# Reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc.
client = await create_s3_client()

# Custom configuration
client = await create_s3_client(
    endpoint_url="https://minio.company.com",
    access_key_id="admin",
    secret_access_key="password"
)
```

### 4. Vector Operations (`vector/`)

Unified vector database operations with embedding support.

#### VectorManager

Central manager for vector storage and similarity search.

```python
from langcrew_tools.utils.vector import create_vector_manager, VectorConfig

# Create vector manager
config = VectorConfig(
    provider="pgvector",  # or "chroma", "pinecone", etc.
    connection_string="postgresql://user:pass@localhost/vectordb",
    embedding_model="text-embedding-3-small"
)

vector_manager = await create_vector_manager(config)

# Store embeddings
documents = [
    {"text": "Document 1 content", "metadata": {"id": 1}},
    {"text": "Document 2 content", "metadata": {"id": 2}}
]

await vector_manager.add_documents(documents)

# Similarity search
results = await vector_manager.similarity_search(
    query="search query",
    k=5,
    score_threshold=0.7
)

for result in results:
    print(f"Score: {result.score}, Text: {result.text}")
```

#### Error Handling

```python
from langcrew_tools.utils.vector import VectorError

try:
    results = await vector_manager.similarity_search("query")
except VectorError as e:
    print(f"Vector operation failed: {e}")
```

### 5. SiliconFlow Integration (`siliconflow/`)

SiliconFlow AI service integration for embeddings and reranking.

#### SiliconFlowClient

Unified client for SiliconFlow AI services.

```python
from langcrew_tools.utils.siliconflow import SiliconFlowClient, SiliconFlowConfig

# Auto-configure from environment
# Reads SILICONFLOW_URL, SILICONFLOW_TOKEN
client = SiliconFlowClient()

# Embedding operations
embeddings = await client.embed_documents([
    "First document text",
    "Second document text"
])

# Single embedding
embedding = await client.embed_query("search query text")

# Reranking
reranked = await client.rerank(
    query="search query",
    documents=["doc1", "doc2", "doc3"],
    top_k=2
)
```

#### Custom Configuration

```python
config = SiliconFlowConfig(
    url="https://api.siliconflow.cn",
    token="your-api-token",
    embedding_model="custom-embedding-model",
    rerank_model="custom-rerank-model"
)

client = SiliconFlowClient(config=config)
```

## Environment Configuration

### Required Variables

#### E2B Sandbox

```bash
export E2B_API_KEY=your_e2b_api_key
export E2B_TEMPLATE=python-3.11  # Optional, default template
export E2B_DOMAIN=your_domain     # Optional
export E2B_TIMEOUT=300            # Optional, seconds
```

#### S3 Storage

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=https://s3.amazonaws.com  # Optional
```

#### SiliconFlow

```bash
export SILICONFLOW_URL=https://api.siliconflow.cn
export SILICONFLOW_TOKEN=your_api_token
```

#### Vector Database (PGVector example)

```bash
export VECTOR_CONNECTION_STRING=postgresql://user:pass@localhost/vectordb
export VECTOR_EMBEDDING_MODEL=text-embedding-3-small
```

### Configuration Validation

Use the configuration manager to validate your setup:

```python
from langcrew_tools.utils.env_config import env_config

# Validate required E2B configuration
try:
    e2b_key = env_config.get_str("E2B_API_KEY", required=True)
    e2b_template = env_config.get_str("E2B_TEMPLATE", default="python-3.11")
    print("E2B configuration valid")
except Exception as e:
    print(f"E2B configuration error: {e}")
```

## Integration Patterns

### 1. Tool Development Pattern

```python
from langchain_core.tools import BaseTool
from langcrew_tools.utils.sandbox import SandboxMixin
from langcrew_tools.utils.s3 import create_s3_client
from langcrew_tools.utils.env_config import env_config

class DataProcessingTool(BaseTool, SandboxMixin):
    name = "data_processor"
    description = "Process data files using sandbox and S3"
    
    async def _arun(self, file_key: str) -> str:
        # Get sandbox
        sandbox = await self.get_sandbox()
        
        # Get S3 client
        s3_client = await create_s3_client()
        
        # Download from S3 to sandbox
        await s3_client.download_file(
            bucket=env_config.get_str("DATA_BUCKET", required=True),
            key=file_key,
            local_path=f"/workspace/{file_key}"
        )
        
        # Process in sandbox
        result = await sandbox.commands.run(
            f"python process_data.py /workspace/{file_key}"
        )
        
        return result.stdout
```

### 2. Multi-Service Integration

```python
from langcrew_tools.utils.vector import create_vector_manager
from langcrew_tools.utils.siliconflow import SiliconFlowClient
from langcrew_tools.utils.s3 import create_s3_client

class DocumentSearchService:
    def __init__(self):
        self.vector_manager = None
        self.siliconflow = None
        self.s3_client = None
    
    async def initialize(self):
        self.vector_manager = await create_vector_manager()
        self.siliconflow = SiliconFlowClient()
        self.s3_client = await create_s3_client()
    
    async def process_document(self, s3_key: str):
        # Download document
        content = await self.s3_client.get_object("docs", s3_key)
        
        # Generate embeddings
        embedding = await self.siliconflow.embed_query(content)
        
        # Store in vector database
        await self.vector_manager.add_documents([{
            "text": content,
            "embedding": embedding,
            "metadata": {"s3_key": s3_key}
        }])
```

## Best Practices

### 1. Environment Configuration

```python
# Good: Use typed configuration with defaults
timeout = env_config.get_int("TIMEOUT", default=30)
debug = env_config.get_bool("DEBUG", default=False)

# Bad: Direct os.getenv without type conversion
# timeout = int(os.getenv("TIMEOUT", "30"))  # Can raise ValueError
```

### 2. Sandbox Resource Management

```python
# Good: Use context managers or proper cleanup
async def process_files():
    sandbox = await self.get_sandbox()
    try:
        # Process files
        pass
    finally:
        # Cleanup is handled by SandboxMixin
        pass

# Good: Reuse sandbox instances
class MultiStepTool(BaseTool, SandboxMixin):
    async def _arun(self):
        sandbox = await self.get_sandbox()  # Reused across calls
        # Multiple operations on same sandbox
```

### 3. Error Handling

```python
from langcrew_tools.utils.vector import VectorError
from langcrew_tools.utils.siliconflow import SiliconFlowError

try:
    embeddings = await client.embed_documents(texts)
except SiliconFlowError as e:
    logger.error(f"Embedding failed: {e}")
    # Handle gracefully
except VectorError as e:
    logger.error(f"Vector storage failed: {e}")
    # Handle gracefully
```

### 4. Async Resource Management

```python
# Good: Proper async context managers
async with AsyncS3Client(config) as client:
    await client.upload_file("local.txt", "bucket", "remote.txt")

# Good: Manual lifecycle management
client = AsyncS3Client(config)
try:
    await client.upload_file("local.txt", "bucket", "remote.txt")
finally:
    await client.close()
```

## Performance Considerations

### Connection Pooling

- Sandbox connections are pooled and reused
- S3 clients use connection pooling internally
- Vector managers maintain persistent connections

### Async Operations

- All operations are async-first for better concurrency
- Use `asyncio.gather()` for parallel operations
- Proper resource cleanup prevents memory leaks

### Caching

- Configuration values are cached after first load
- Vector embeddings can be cached at application level
- S3 operations support conditional requests

## Troubleshooting

### Common Issues

1. **E2B Connection Failed**

   ```
   Error: Failed to connect to E2B sandbox
   ```

   **Solution**: Check E2B_API_KEY and network connectivity

2. **S3 Authentication Failed**

   ```
   Error: Access Denied
   ```

   **Solution**: Verify AWS credentials and bucket permissions

3. **Vector Database Connection**

   ```
   Error: Connection to vector database failed
   ```

   **Solution**: Check connection string and database availability

4. **SiliconFlow API Error**

   ```
   Error: API authentication failed
   ```

   **Solution**: Verify SILICONFLOW_TOKEN and API endpoint

### Debug Mode

Enable detailed logging for all utils components:

```python
import logging

# Enable debug logging
logging.getLogger("langcrew_tools.utils").setLevel(logging.DEBUG)

# Or component-specific logging
logging.getLogger("langcrew_tools.utils.s3").setLevel(logging.DEBUG)
logging.getLogger("langcrew_tools.utils.vector").setLevel(logging.DEBUG)
```

## Contributing

When contributing to the utils module:

1. **Follow Patterns**: Use existing patterns for new integrations
2. **Environment Config**: Use `env_config` for all configuration
3. **Error Handling**: Define specific exception classes
4. **Async Support**: All operations should support async/await
5. **Type Hints**: Provide comprehensive type annotations
6. **Documentation**: Include usage examples and integration guides

## License

MIT License - see main project LICENSE file.
