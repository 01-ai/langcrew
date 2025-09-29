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

### DynamicFormUserInputTool

The `DynamicFormUserInputTool` provides enhanced user input capabilities with JSON Schema support for creating dynamic forms. This tool is ideal for collecting structured data from users.

**Features:**

- JSON Schema-based dynamic form generation
- Support for various field types: string, number, boolean, array, object
- Built-in format validation: email, url, date, date-time, phone
- Custom pattern validation with regular expressions
- Phone number field support with default and custom validation
- Asynchronous and synchronous operation support
- LangGraph native interrupt functionality

**Field Types and Formats:**

- `string`: Text input with optional length constraints
- `number`: Numeric input with min/max value constraints
- `boolean`: Switch/toggle input
- `array`: Multi-value input (comma-separated)
- `object`: JSON object input
- `format`: Special formatting (email, url, date, date-time, phone)
- `pattern`: Custom regular expression validation

**Phone Number Support:**
The tool supports phone number fields with the following features:

- `format: "phone"`: Renders as a tel input field
- `pattern`: Optional custom regex for validation
- Default validation: Chinese mobile number pattern (`^1[3-9]\d{9}$`)
- Custom patterns: International numbers, specific formats, etc.

**Usage Example:**

```python
from langcrew_tools.hitl import DynamicFormUserInputTool, FormSchema, FormFieldSchema

tool = DynamicFormUserInputTool()

# Create a form schema with phone number field
form_schema = FormSchema(
    properties={
        "name": FormFieldSchema(
            type="string",
            title="Name",
            description="Please enter your name",
            required=True,
            minLength=2
        ),
        "phone": FormFieldSchema(
            type="string",
            title="Phone Number",
            description="Please enter your phone number",
            required=True,
            format="phone",
            pattern="^1[3-9]\\d{9}$",  # Custom regex
            minLength=11,
            maxLength=11
        ),
        "email": FormFieldSchema(
            type="string",
            title="Email",
            description="Please enter your email address",
            required=False,
            format="email"
        )
    },
    required=["name", "phone"],
    title="User Information",
    description="Please fill in your basic information"
)

# Request user input with dynamic form
response = await tool.arun(
    question="Please fill in your information",
    form_schema=form_schema
)
```

**Phone Number Examples:**

```python
# Basic phone number (uses default Chinese mobile pattern)
phone_field = FormFieldSchema(
    type="string",
    title="Phone Number",
    format="phone",
    required=True
)

# Custom phone pattern (international format)
international_phone = FormFieldSchema(
    type="string",
    title="International Phone Number",
    format="phone",
    pattern="^\\+[1-9]\\d{1,14}$",
    minLength=8,
    maxLength=16
)

# Specific country pattern
us_phone = FormFieldSchema(
    type="string",
    title="US Phone Number",
    format="phone",
    pattern="^\\(\\d{3}\\)\\s\\d{3}-\\d{4}$",
    minLength=14,
    maxLength=14
)
```

## Integration with LangGraph

HITL tools are designed to work seamlessly with LangGraph workflows, using the native interrupt mechanism for human interaction. The tools follow LangGraph's recommended patterns for human-in-the-loop functionality.

## License

This module is part of the LangCrew project and is released under the MIT License.
