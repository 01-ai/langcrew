# Fetch Tools for LangCrew

## Description

The `fetch` module in LangCrew provides tools for retrieving and integrating external data sources into your AI workflows. These tools are designed to help agents access, query, and process data from various APIs or databases, enabling more context-aware and data-driven AI solutions.

Fetch tools can be used to connect to different data sources, perform queries, and return results in a format that can be further processed by LangCrew agents or tasks.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. (Optional) Install any additional dependencies required by your specific fetch tool (see tool documentation for details).

3. Set up any required API keys or environment variables for your data sources.

## Usage

```python
from langcrew_tools.fetch import SomeFetchTool

# Initialize the fetch tool with your data source configuration
fetch_tool = SomeFetchTool(
    api_key="YOUR_API_KEY",
    endpoint="https://api.example.com/data"
)

# Use the tool to fetch data
result = fetch_tool.run("your query or parameters")
print(result)
```

The initialization parameters and usage may vary depending on the specific fetch tool you are using. Please refer to the tool's docstring or source code for details.

## Example: Integrating with a LangCrew Agent

```python
from langcrew import Agent
from langcrew.project import agent

# Define an agent that uses the fetch tool
@agent
def data_researcher(self) -> Agent:
    return Agent(
        config=self.agents_config["data_researcher"],
        allow_delegation=False,
        tools=[fetch_tool]
    )
```

## Supported Data Sources

Fetch tools can be extended to support various APIs, databases, or web services. For a list of available fetch tools and their configuration options, see the [source code](./langchain_tools.py) or the LangCrew documentation.

## License

This module is part of the LangCrew project and is released under the MIT License. 