# Web Fetch Tool for LangCrew

## Description

The `WebFetchTool` is a powerful web scraping and content extraction tool designed for LangCrew agents. It provides intelligent web content retrieval with automatic fallback mechanisms, security protection, and content conversion to readable Markdown format.

### Key Features

- **Dual-layer Fetching**: Uses httpx for fast requests with Playwright fallback for JavaScript-heavy sites
- **Smart Retry Logic**: Automatically determines when to fall back to browser-based rendering
- **Security Protection**: Built-in SSRF (Server-Side Request Forgery) protection
- **Content Extraction**: Converts HTML to clean Markdown using trafilatura
- **Async-only Design**: Optimized for high-performance async operations
- **Error Handling**: Intelligent error formatting with LLM-friendly messages

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. Install required dependencies (automatically included with langcrew-tools):

```shell
pip install httpx playwright playwright-stealth trafilatura markdownify
```

3. Install Playwright browsers:

```shell
playwright install
```

## Basic Usage

```python
import asyncio
from langcrew_tools.fetch.langchain_tools import WebFetchTool

async def fetch_example():
    # Initialize the web fetch tool
    fetch_tool = WebFetchTool()

    # Fetch content from a URL
    result = await fetch_tool.arun(url="https://example.com")
    print(result)

# Run the async function
asyncio.run(fetch_example())
```

## Advanced Usage

```python
from langcrew_tools.fetch.langchain_tools import WebFetchTool

# Custom configuration
fetch_tool = WebFetchTool(
    timeout=120,  # Request timeout in seconds
    max_chars=100000,  # Maximum characters to extract
    headers={
        "User-Agent": "My Custom Bot 1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
)

# Use with LangChain agents
async def agent_usage():
    result = await fetch_tool.arun(
        url="https://en.wikipedia.org/wiki/Artificial_intelligence"
    )
    return result
```

## Configuration Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `timeout` | 60 | Request timeout in seconds |
| `max_chars` | 50000 | Maximum characters to extract from webpage |
| `headers` | Realistic browser headers | Custom HTTP headers for requests |

## Security Features

The WebFetchTool includes comprehensive security protections:

- **SSRF Protection**: Blocks requests to private IP ranges (192.168.x.x, 10.x.x.x, etc.)
- **Protocol Filtering**: Only allows HTTP and HTTPS protocols
- **Domain Blacklisting**: Blocks access to localhost and internal domains
- **Content Validation**: Validates extracted content for quality and relevance

## Error Handling

The tool provides intelligent error handling with fallback mechanisms:

```python
try:
    result = await fetch_tool.arun(url="https://example.com")
except Exception as e:
    # The tool handles most errors internally and returns informative messages
    print(f"Error occurred: {e}")
```

### Common Error Messages

- **Access Denied**: Website blocks automated access
- **Page Not Found**: URL returns 404 status
- **Content Too Short**: May need JavaScript rendering
- **Network Issues**: Connection or timeout problems

## Integration with LangCrew Agents

```python
from langcrew import Agent
from langcrew_tools.fetch.langchain_tools import WebFetchTool

# Initialize the tool
web_fetch = WebFetchTool()

# Define an agent that uses the web fetch tool
@agent
def web_researcher(self) -> Agent:
    return Agent(
        config=self.agents_config["web_researcher"],
        allow_delegation=False,
        tools=[web_fetch],
        system_prompt="Use the web fetch tool to research current information from websites."
    )
```

## How It Works

1. **URL Validation**: Validates and sanitizes URLs for security
2. **Fast Fetch**: Attempts to fetch content using httpx
3. **Content Extraction**: Uses trafilatura to extract clean HTML content
4. **Markdown Conversion**: Converts HTML to readable Markdown format
5. **Quality Check**: Validates content length and quality
6. **Browser Fallback**: Falls back to Playwright if needed for JavaScript sites
7. **Error Handling**: Provides clear, LLM-friendly error messages

## Examples

### Fetching a Simple Website
```python
result = await fetch_tool.arun(url="https://httpbin.org/html")
```

### Handling JavaScript-Heavy Sites
The tool automatically falls back to Playwright for sites requiring JavaScript:
```python
result = await fetch_tool.arun(url="https://www.fandom.com/explore")
```

## Dependencies

- **httpx**: Fast async HTTP client
- **playwright**: Browser automation for JavaScript sites
- **playwright-stealth**: Anti-detection for web scraping
- **trafilatura**: Advanced content extraction
- **markdownify**: HTML to Markdown conversion
- **ipaddress**: IP address validation for security

## License

This module is part of the LangCrew project and is released under the MIT License.