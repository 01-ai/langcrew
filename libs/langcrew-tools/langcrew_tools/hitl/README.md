# HITL Tools for LangCrew

## Description

The `hitl` (Human-in-the-Loop) module in LangCrew provides tools for integrating human interaction into AI workflows. These tools enable AI agents to actively request user input when clarification, additional information, or confirmation is needed, creating more interactive and collaborative AI solutions.

HITL tools are designed to be independent and reusable, allowing you to flexibly choose when and how to incorporate human oversight into your AI workflows without depending on specific configuration requirements.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. (Optional) Install any additional dependencies required by your specific HITL tool (see tool documentation for details).

3. Set up any required environment variables or configuration for your HITL workflow.

## Usage

```python
from langcrew_tools.hitl import UserInputTool

# Initialize the HITL tool
user_input_tool = UserInputTool()

# Use the tool to request user input
result = await user_input_tool.arun(
    question="Do you want to proceed with this action?",
    options=["Yes", "No"]
)
print(result)
```

The initialization parameters and usage may vary depending on the specific HITL tool you are using. Please refer to the tool's docstring or source code for details.

## Example: Integrating with a LangCrew Agent

```python
from langcrew import Agent
from langcrew.project import agent
from langcrew_tools.hitl import UserInputTool

# Define an agent that uses the HITL tool
@agent
def interactive_assistant(self) -> Agent:
    return Agent(
        config=self.agents_config["interactive_assistant"],
        allow_delegation=False,
        tools=[UserInputTool()]
    )
```

## Supported HITL Tools

### UserInputTool

The `UserInputTool` is based on the LangGraph official pattern and allows LLMs to actively decide when user input is needed. This is the standard pattern recommended by LangGraph for human-in-the-loop workflows.

**Features:**
- Asynchronous and synchronous operation support
- Optional predefined options (up to 4 options, each max 10 characters or 5 Chinese characters)
- LangGraph native interrupt functionality
- Custom event dispatching for frontend integration
- Independent of HITLConfig for flexible usage

**Usage Example:**
```python
from langcrew_tools.hitl import UserInputTool

tool = UserInputTool()

# Request user input with options
response = await tool.arun(
    question="Which approach would you prefer?",
    options=["Approach A", "Approach B", "Approach C"]
)

# Request user input without options
response = await tool.arun(
    question="Please provide additional details about your requirements."
)
```

## Integration with LangGraph

HITL tools are designed to work seamlessly with LangGraph workflows, using the native interrupt mechanism for human interaction. The tools follow LangGraph's recommended patterns for human-in-the-loop functionality.

## License

This module is part of the LangCrew project and is released under the MIT License. 