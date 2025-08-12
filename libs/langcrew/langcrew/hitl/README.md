# LangCrew HITL (Human-in-the-Loop) System

A unified HITL implementation based on LangGraph native capabilities, providing comprehensive interrupt management for tools with intelligent user interaction support.

## Design Philosophy

1. **Unified Interrupt Management**: HITLConfig manages all tool-level interrupt configurations
2. **Before/After Support**: Support interrupts both before and after tool execution with parameter/result modification
3. **Clear Naming**: Consistent naming with LangGraph's `interrupt_before`/`interrupt_after` patterns
4. **Tool-Level Focus**: Static interrupt configuration for tools, while nodes use runtime configuration
5. **Based on Official Patterns**: Completely follows LangGraph official HITL best practices
6. **Smart User Interaction**: Bilingual support with intelligent keyword recognition and UI-friendly options

## Core Components

### HITLConfig - Unified Tool Interrupt Configuration

Manages static interrupt configuration for tools:

```python
from langcrew.hitl import HITLConfig

# Tool execution interrupts
config = HITLConfig(
    interrupt_before_tools=["web_search", "file_write"],  # Interrupt before execution
    interrupt_after_tools=["data_analysis"],              # Interrupt after execution
)

# Batch configuration modes
config = HITLConfig(
    interrupt_tool_mode="all",        # Interrupt all tools (except excluded)
    excluded_tools=["user_input"]     # Tools to exclude from interrupts
)

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

## Configuration Levels

### Tool-level Interrupts (LangCrew HITL)
Tool-level interrupts are handled by LangCrew's HITL system with approval logic:
- `interrupt_before_tools`: List of tools to interrupt before execution
- `interrupt_after_tools`: List of tools to interrupt after execution ⚠️ **Single session only**
- `interrupt_tool_mode`: Control mode ("all", "specified", "none")
- `excluded_tools`: Tools to exclude from interrupts

> **Important**: `interrupt_after_tools` only works within a single execution session. After a workflow restart from checkpointed state, tool results are already cached and won't trigger after-interrupts again. This prevents duplicate user interactions for the same tool execution.

### Node-level Interrupts (LangGraph Native)
Node-level interrupts use LangGraph's native interrupt mechanism:
- `interrupt_before_nodes`: List of nodes to interrupt before execution (LangGraph native)
- `interrupt_after_nodes`: List of nodes to interrupt after execution (LangGraph native)

These are passed directly to LangGraph's executor and follow LangGraph's standard interrupt behavior.

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

### 2. Most Common - Tool interrupts + user_input

```python
from langcrew.hitl import HITLConfig
from langcrew.tools.hitl import UserInputTool

agent = Agent(
    role="Administrator", 
    tools=[WebSearchTool(), UserInputTool()],                    # User chooses tools
    hitl=HITLConfig(interrupt_before_tools=["web_search"])       # Tool interrupt before execution
)
```

### 3. Crew-level Configuration

```python
# Individual agents configure their own tools
researcher = Agent(tools=[UserInputTool()])  # hitl not configured
writer = Agent(tools=[])                     # hitl not configured

# Crew-level unified interrupt policy for agents without their own config
crew = Crew(
    agents=[researcher, writer],
    hitl=HITLConfig(interrupt_before_tools=["web_search", "file_write"])
)
```

### 4. Advanced - Before and After Interrupts

```python
agent = Agent(
    tools=[DataAnalysisTool(), ReportGeneratorTool()],
    hitl=HITLConfig(
        interrupt_before_tools=["data_analysis"],    # Approve before execution
        interrupt_after_tools=["report_generator"],  # Review after execution
        interrupt_tool_mode="specified"
    )
)
```

### 5. Node-level Interrupts (LangGraph Native)

```python
# Node-level interrupts use LangGraph's native interrupt mechanism
agent = Agent(
    role="Decision Maker",
    tools=[WebSearchTool(), UserInputTool()],
    hitl=HITLConfig(
        interrupt_before_nodes=["decision_node"],     # LangGraph native interrupt
        interrupt_after_nodes=["validation_node"]     # LangGraph native interrupt
    )
)
```

### 6. Comprehensive Configuration

```python
# Combine tool-level and node-level interrupts
agent = Agent(
    role="Comprehensive Agent", 
    tools=[WebSearchTool(), FileWriteTool(), UserInputTool()],
    hitl=HITLConfig(
        # Tool-level interrupts (LangCrew HITL)
        interrupt_before_tools=["web_search"],
        interrupt_after_tools=["file_write"],
        interrupt_tool_mode="specified",
        excluded_tools=["user_input"],
        
        # Node-level interrupts (LangGraph native)  
        interrupt_before_nodes=["decision_node"],
        interrupt_after_nodes=["validation_node"]
    )
)
```

## Design Architecture

### Tool-Level vs Node-Level Interrupts

```python
# Tool-level interrupts - LangCrew HITL system with approval logic
agent = Agent(
    hitl=HITLConfig(
        interrupt_before_tools=["dangerous_tool"],  # LangCrew HITL approval
        interrupt_after_tools=["data_processor"]    # LangCrew HITL review
    )
)

# Node-level interrupts - LangGraph native interrupt mechanism
agent = Agent(
    hitl=HITLConfig(
        interrupt_before_nodes=["decision_node"],   # LangGraph native interrupt
        interrupt_after_nodes=["validation_node"]   # LangGraph native interrupt  
    )
)

# Runtime configuration via Crew (both tool and node level)
crew = Crew(agents=[agent])
result = crew.invoke(
    input=data,
    interrupt_before=["decision_node"],  # Runtime flow control
    interrupt_after=["validation_node"]  # Runtime flow control
)
```

## Key Advantages

1. **Unified Management**: Single configuration point for all tool-level interrupts
2. **Before/After Support**: Comprehensive interrupt coverage for tool execution lifecycle
3. **Consistent Naming**: Aligns with LangGraph's `interrupt_before`/`interrupt_after` patterns
4. **Clear Separation**: Tool-level static config vs node-level runtime config
5. **LangGraph Native**: Built on top of LangGraph's official interrupt mechanisms

## Best Practices

1. **Use tool-level interrupts for safety policies** - Static configuration for consistent behavior
2. **Use node-level interrupts for flow control** - Runtime configuration for dynamic needs
3. **Configure at Crew level for unified policies** - Apply to agents without their own config
4. **Use UserInputTool for LLM-initiated input** - Dynamic interaction when needed
5. **Exclude utility tools from interrupts** - Use `excluded_tools` for tools like `user_input`

## User Interaction Features

### Smart Response Recognition

The HITL system supports intelligent keyword recognition in both Chinese and English:

**Approval Keywords**:
- **Chinese**: 批准、同意、确认、通过、好的、可以、行、是的
- **English**: approve, approved, yes, ok, confirm, confirmed, accept, accepted, agree, agreed

**Denial Keywords**:
- **Chinese**: 拒绝、不同意、不通过、不可以、不行、取消、否、不要  
- **English**: deny, denied, no, reject, rejected, refuse, refused, cancel, cancelled, disagree, disagreed

### User Response Formats

**Simple Responses**:
```python
# Boolean responses
True   # Approve
False  # Deny

# String responses (natural language)
"批准"   # Approve (Chinese)
"拒绝"   # Deny (Chinese)  
"yes"   # Approve (English)
"no"    # Deny (English)
```

**Advanced Responses**:
```python
# Parameter modification (interrupt_before)
{
    "approved": True,
    "modified_args": {
        "query": "modified search term",
        "max_results": 10
    }
}

# Result modification (interrupt_after)
{
    "approved": True, 
    "modified_result": "User-modified result content"
}

# Denial with reason
{
    "approved": False,
    "reason": "Parameters are not suitable"
}
```

### Frontend Integration

The system provides bilingual UI options that work seamlessly with existing frontend components:

**Chinese Environment**:
- interrupt_before: `["批准", "拒绝"]`
- interrupt_after: `["确认", "拒绝"]`

**English Environment**:
- interrupt_before: `["Approve", "Deny"]`
- interrupt_after: `["Confirm", "Deny"]`

## Interrupt Types

### Before Interrupt
- **Purpose**: Approval, validation, parameter modification before tool execution
- **Use Cases**: Dangerous operations, external API calls, file modifications
- **Configuration**: `interrupt_before_tools=["tool_name"]`
- **User Actions**: Approve, deny, or modify parameters before execution

### After Interrupt  
- **Purpose**: Review, result modification, feedback after tool execution
- **Use Cases**: Data validation, result editing, quality checks
- **Configuration**: `interrupt_after_tools=["tool_name"]`
- **User Actions**: Confirm, deny, or modify results after execution
- **⚠️ Limitation**: Only works within single execution session (not across workflow restarts)

## Future Frontend Enhancements

The current implementation provides a solid foundation for rich frontend experiences:

### Phase 1: Basic UI Enhancement
- Dedicated tool approval components
- Parameter and result visualization
- Bilingual interface support

### Phase 2: Advanced Parameter Editing
- JSON schema-based parameter editors
- Intelligent parameter validation
- Modification templates and suggestions

### Phase 3: Rich User Experience
- Historical approval patterns
- Batch approval operations
- Conditional auto-approval rules
- Advanced result modification tools

The backend is already equipped to handle these advanced features through the flexible response format system. 