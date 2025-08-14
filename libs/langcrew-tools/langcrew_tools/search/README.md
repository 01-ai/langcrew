# Search Tools for LangCrew

## Description

The `search` module in LangCrew provides tools for performing web searches to obtain the latest information from the internet. These tools enable AI agents to access current information, research topics, and gather real-time data through external search services.

The search tools support multiple languages, configurable result limits, and integration with external retriever services for comprehensive web search capabilities.

## Installation

1. Install the `langcrew-tools` package:

    ```shell
    pip install langcrew-tools
    ```

2. Install additional dependencies for web search:

    ```shell
    pip install requests
    ```

3. Set up required API credentials and environment variables:

```shell
export LANGCREW_WEB_SEARCH_ENDPOINT="https://your-search-service.com/api"
export LANGCREW_WEB_SEARCH_API_KEY="your_api_key_here"
export LANGCREW_WEB_SEARCH_LANGUAGE="en"
```

## Usage

```python
from langcrew_tools.search import WebSearchTool

# Initialize the web search tool
search_tool = WebSearchTool()

# Perform a web search
results = await search_tool.arun(
    query="latest developments in artificial intelligence",
    query_num=10
)
print(results)
```

## Supported Search Tools

### WebSearchTool

The `WebSearchTool` provides comprehensive web search capabilities with support for multiple languages and configurable search parameters.

**Features:**

- Real-time web search functionality
- Multi-language support (English and Chinese)
- Configurable result limits
- External retriever service integration
- Authentication and API key management
- Request timeout handling
- Error handling and logging
- Asynchronous and synchronous operation

**Usage Example:**

```python
from langcrew_tools.search import WebSearchTool

# Using default configuration
tool = WebSearchTool()

# Basic web search
results = await tool.arun(
    query="Python programming best practices",
    query_num=15
)

# Chinese language search
chinese_tool = WebSearchTool(language="zh")
results = await chinese_tool.arun(
    query="机器学习最新发展",
    query_num=10
)

# Custom configuration
custom_tool = WebSearchTool(
    endpoint="https://custom-search-service.com/api",
    api_key="your_custom_api_key",
    timeout=60,
    language="en"
)

results = await custom_tool.arun(
    query="blockchain technology trends",
    query_num=20
)
```

## Search Configuration

### Environment Variables

- `LANGCREW_WEB_SEARCH_ENDPOINT` - Web search service endpoint URL
- `LANGCREW_WEB_SEARCH_API_KEY` - API key for authentication
- `LANGCREW_WEB_SEARCH_TIMEOUT` - Request timeout in seconds
- `LANGCREW_WEB_SEARCH_LANGUAGE` - Default search language

### Configuration Priority

1. Constructor parameters (highest priority)
2. Environment variables
3. Field default values (lowest priority)

## Search Parameters

### Query Configuration

- **Query Text** - Search keywords and phrases
- **Result Count** - Number of search results to return
- **Language** - Search language preference
- **Timeout** - Request timeout settings

### Search Sources

- **search_one_v3** - Primary search connector
- **Online Crawler** - Real-time web crawling
- **Database** - Stored search results
- **Reranker** - Result ranking and relevance

## Integration with LangCrew Agents

These tools are designed to be used within LangCrew agent workflows:

```python
from langcrew import Agent
from langcrew.project import agent
from langcrew_tools.search import WebSearchTool

@agent
def research_agent(self) -> Agent:
    return Agent(
        config=self.agents_config["research_agent"],
        allow_delegation=False,
        tools=[WebSearchTool()]
    )
```

## Search Workflow

The search tools support a complete search workflow:

1. **Query Processing** - Validate and process search queries
2. **Authentication** - Authenticate with search service
3. **Search Execution** - Perform web search with configured parameters
4. **Result Processing** - Process and format search results
5. **Response Delivery** - Return formatted search results

## Search Results Format

The search tool returns results in a structured format:

```python
[
    {
        "title": "Search result title",
        "url": "https://example.com/article",
        "snippet": "Brief description of the search result",
        "source": "Source information",
        "timestamp": "Result timestamp"
    },
    # ... more results
]
```

## Error Handling

The tools include comprehensive error handling:

- Authentication failures (401/403 errors)
- Network connectivity issues
- Request timeout handling
- Invalid endpoint configuration
- API key validation errors
- Service unavailability

## Performance Optimization

- **Request Timeout** - Configurable timeout settings
- **Result Limiting** - Adjustable result count for performance
- **Caching** - Result caching for repeated queries
- **Async Operations** - Non-blocking search operations
- **Connection Management** - Efficient HTTP connection handling

## Security Features

- **API Key Management** - Secure API key handling
- **Request Validation** - Input validation and sanitization
- **HTTPS Support** - Secure communication with search services
- **Error Logging** - Secure error logging without sensitive data exposure

## Language Support

### English Search

- Default language configuration
- English-specific search optimization
- International result sources

### Chinese Search

- Chinese language support with "zh" configuration
- Chinese-specific search sources (bocha)
- Localized result ranking

## Advanced Features

### Search Customization

- **Custom Queries** - Advanced query formatting
- **Source Selection** - Configurable search sources
- **Result Filtering** - Post-search result filtering
- **Relevance Ranking** - Intelligent result ranking

### Service Integration

- **External Services** - Integration with various search services
- **API Compatibility** - Standard API interface
- **Service Discovery** - Automatic service detection
- **Fallback Handling** - Service failure recovery

## Configuration Examples

### Basic Configuration

```python
# Using environment variables
tool = WebSearchTool()
```

### Custom Configuration

```python
# Using constructor parameters
tool = WebSearchTool(
    endpoint="https://api.searchservice.com/v1/search",
    api_key="your_api_key",
    timeout=45,
    language="en"
)
```

### Language-Specific Configuration

```python
# English search
en_tool = WebSearchTool(language="en")

# Chinese search
zh_tool = WebSearchTool(language="zh")
```

## License

This module is part of the LangCrew project and is released under the MIT License.
