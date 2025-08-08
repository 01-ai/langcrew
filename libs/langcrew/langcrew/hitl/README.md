# LangCrew HITL (Human-in-the-Loop) System

A concise HITL implementation based on LangGraph native capabilities, focusing on core functionality and avoiding over-engineering.

## Design Philosophy

1. **Separation of Concerns**: HITLConfig focuses on static interrupt configuration, tools focus on dynamic interaction
2. **User Choice**: Users can flexibly choose the HITL features they need, no forced binding
3. **Clear Concepts**: Tools go in tool lists, configurations go in configurations
4. **Conflict-Free Design**: High Level automatically converts to Low Level, can coexist harmoniously
5. **Based on Official Patterns**: Completely follows LangGraph official HITL best practices

## Core Components

### HITLConfig - Static Interrupt Configuration

Focuses on static interrupt configuration for tool approval:

```python
from langcrew.hitl import HITLConfig

# Most common: specify tools that need approval
config = HITLConfig(approval_tools=["web_search", "file_write"])

# Custom configuration
config = HITLConfig(approval_tools=["database_write", "system_command"])

# Explicit enable/disable
config = HITLConfig(enabled=True)   # Enabled by default
config = HITLConfig(enabled=False)  # Explicitly disabled
```

### UserInputTool - Dynamic User Interaction

Independent tool that lets LLM actively decide when user input is needed:

```python
from langcrew.tools.hitl import UserInputTool

# User explicitly adds to tool list
agent = Agent(
    tools=[WebSearchTool(), UserInputTool()],
    # ... other configuration
)

# LLM can actively call
# user_input("What's your preferred approach?", ["Option A", "Option B"])
```

## Usage Patterns

### 1. Zero Configuration - Just user_input

```python
from langcrew import Agent
from langcrew.tools.hitl import UserInputTool

agent = Agent(
    role="Assistant",
    tools=[UserInputTool()],  # Only add user_input tool
    # hitl not configured - no tool approval needed
)
```

### 2. Most Common - Tool approval + user_input

```python
from langcrew.hitl import HITLConfig
from langcrew.tools.hitl import UserInputTool

agent = Agent(
    role="Administrator", 
    tools=[WebSearchTool(), UserInputTool()],           # User chooses tools
    hitl=HITLConfig(approval_tools=["web_search"])      # Tool approval
)
```

### 3. Crew-level Configuration

```python
# Individual agents configure their own tools
researcher = Agent(tools=[UserInputTool()])  # hitl not configured
writer = Agent(tools=[])                     # hitl not configured

# Crew-level unified approval policy
crew = Crew(
    agents=[researcher, writer],
    hitl=HITLConfig(approval_tools=["web_search", "file_write"])
)
```

### 4. Advanced - High Level + Low Level Coexistence

```python
agent = Agent(
    tools=[UserInputTool()],
    hitl=HITLConfig(approval_tools=["api_call"]),        # High Level
    # interrupt_before=["custom_node"]                   # Low Level (would be merged)
)
```

## Configuration Conversion

HITLConfig automatically converts to LangGraph native configuration:

```python
# High Level
HITLConfig(approval_tools=["web_search"])

# Automatically converts to Low Level
# interrupt_before=["tools"]  # LangGraph native configuration
```

## Key Advantages

1. **Simplicity**: Users only configure what they need
2. **Flexibility**: Independent tools can be freely combined
3. **No Conflicts**: High Level and Low Level configurations merge harmoniously
4. **Performance**: Static interrupts are more efficient than tool-based solutions
5. **Standards Compliance**: Completely based on LangGraph official patterns

## Migration Guide

### From Old HITLBaseTool Approach

```python
# Old approach (tool-based)
tools = [UserInputTool(), RequestApprovalTool()]
agent = Agent(tools=tools)

# New approach (configuration-based)
agent = Agent(
    tools=[UserInputTool()],                           # User explicitly adds
    hitl=HITLConfig(approval_tools=["risky_tool"])     # Tool approval via configuration
)
```

### From Manual LangGraph Configuration

```python
# Pure Low Level (still supported)
agent = Agent(interrupt_before=["tools"])

# High Level wrapper (recommended)
agent = Agent(hitl=HITLConfig(approval_tools=["tool_name"]))
```

## Best Practices

1. **Use static interrupts for tool approval** - better performance
2. **Use UserInputTool for LLM-initiated user input** - more flexible
3. **Configure at Crew level for unified policies** - easier management
4. **Combine High Level and Low Level when needed** - maximum flexibility
5. **Only add tools you actually need** - keep it simple 