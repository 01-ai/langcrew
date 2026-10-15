# HITL Tools for LangCrew

Human-in-the-Loop tools that enable AI agents to request user input when needed. Based on LangGraph's native interrupt pattern.

## Installation

```bash
pip install langcrew-tools
```

## Quick Start

```python
from langcrew_tools.hitl import UserInputTool
from langcrew import Agent

# Use in an agent
agent = Agent(
    role="Assistant",
    goal="Help users interactively",
    tools=[UserInputTool()]
)

# Or use directly
tool = UserInputTool()
response = await tool.ainvoke({
    "question": "Do you want to proceed?",
    "options": ["Yes", "No"]
})
```

## Tools

### UserInputTool

Request simple user input with optional predefined choices.

**Usage:**

```python
from langcrew_tools.hitl import UserInputTool

tool = UserInputTool()

# With options
response = await tool.ainvoke({
    "question": "Choose an approach:",
    "options": ["A", "B", "C"]
})

# Free text
response = await tool.ainvoke({
    "question": "Please provide details:"
})
```

**Limits:**
- Max 4 options
- Each option max 10 chars (or 5 Chinese chars)

### DynamicFormUserInputTool

Collect structured data with JSON Schema-based dynamic forms.

**Usage:**

```python
from langcrew_tools.hitl import DynamicFormUserInputTool, FormSchema, FormFieldSchema

tool = DynamicFormUserInputTool()

# Define form schema
form = FormSchema(
    properties={
        "name": FormFieldSchema(
            type="string",
            title="Name",
            required=True,
            minLength=2
        ),
        "email": FormFieldSchema(
            type="string",
            title="Email",
            format="email"
        ),
        "phone": FormFieldSchema(
            type="string",
            title="Phone",
            format="phone",
            pattern="^1[3-9]\\d{9}$"
        )
    },
    required=["name"],
    title="User Info"
)

# Request input
response = await tool.ainvoke({
    "question": "Please fill in your information",
    "form_schema": form
})
```

**Supported Field Types:**
- `string`, `number`, `boolean`, `array`, `object`, `multiselect`

**Built-in Formats:**
- `email`, `url`, `date`, `date-time`, `phone`, `color`, `time`

**Validation:**
- `minLength`/`maxLength` - String length
- `minimum`/`maximum` - Number range
- `pattern` - Regex validation
- `enum` - Predefined options
- `type: "multiselect"` + `enum` - Multiple selection (use `minSelections`/`maxSelections` to limit count)

## Notes

- Tools use LangGraph's native interrupt mechanism
- Works seamlessly with LangCrew agents
- No special configuration required
