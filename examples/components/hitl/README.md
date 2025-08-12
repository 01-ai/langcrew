# HITL (Human-in-the-Loop) Advanced Integration Examples

This directory contains a comprehensive demonstration of LangCrew's advanced HITL system with intelligent user interaction, bilingual support, and parameter/result modification capabilities.

## 📁 Files

- **`hitl_example.py`**: Complete self-contained demonstration with real interrupt/resume workflows  
- **`README.md`**: This documentation

## 🚀 Quick Start

### 1. Basic Configuration Demo (No API Key Required)
```bash
# Test core HITL configuration functionality
python -c "
import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'src'))
from langcrew.hitl import HITLConfig

# Test different interrupt modes
config = HITLConfig(interrupt_tool_mode='specified', interrupt_before_tools=['file_write'])
print(f'Config test: {config.should_interrupt_before_tool(\"file_write\")}')
print('✅ Core HITL functionality working!')
"
```

### 2. Complete Interrupt + Resume Workflows (Requires OpenAI API)
```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your_api_key_here

# Run complete self-contained demonstration
python examples/components/hitl/hitl_example.py
```

**What happens:**
1. **Configuration examples** run first (no API key needed)
2. **Task+Agent+Crew workflow** starts, interrupts, automatically resumes
3. **Agent+Crew workflow** starts, interrupts, automatically resumes
4. **Complete cycles** demonstrate the full interrupt/resume process

## 🎯 Complete Self-Contained Demonstration

The `hitl_example.py` file contains everything in one execution:

### Configuration Phase
- Shows **9 comprehensive HITL configuration patterns**
- Demonstrates all interrupt modes and combinations
- Includes new node-level interrupts (LangGraph native)
- No LLM calls required

**Patterns covered:**
1. **Tool Before Interrupts**: Critical operations approval
2. **All Tools with Exceptions**: High-security environments  
3. **Interactive User Input**: Dynamic data collection
4. **Tool After Interrupts**: Content review and audit trails
5. **Before + After Interrupts**: Full oversight workflows
6. **Node-level Interrupts**: LangGraph native workflow control
7. **Comprehensive Configuration**: Combined tool and node interrupts
8. **Explicit No Interrupts**: HITLConfig(enabled=False)
9. **No Interrupts (Default)**: Development and testing mode

### Workflow Phase 1: Task+Agent+Crew
```
🚀 Complete Task+Agent+Crew Workflow: Interrupt + Resume Cycle
🔧 Setting up Task+Agent+Crew workflow...
📄 Target file: /tmp/hitl_demo_file.txt
🔒 HITL config: specified mode

▶️  STEP 1: Starting initial execution (will interrupt)...
⏸️  WORKFLOW INTERRUPTED for tool approval!

🔧 STEP 2: Simulating user approval...
✅ User approved the file_write operation

🔄 STEP 3: Resuming workflow execution...
✅ Workflow resumed and completed successfully!

🎉 COMPLETE INTERRUPT + RESUME CYCLE DEMONSTRATED!
```

### Workflow Phase 2: Agent+Crew  
```
🚀 Complete Agent+Crew Workflow: Interrupt + Resume Cycle
🔧 Setting up Agent+Crew workflow...
📄 Target file: /tmp/hitl_demo_file.txt

▶️  STEP 1: Starting initial Agent execution (will interrupt)...
⏸️  AGENT WORKFLOW INTERRUPTED for tool approval!

🔧 STEP 2: Simulating user approval...
✅ User approved the file_write operation

🔄 STEP 3: Resuming agent workflow execution...
✅ Agent workflow resumed and completed successfully!

🎉 COMPLETE AGENT INTERRUPT + RESUME CYCLE DEMONSTRATED!
```

## 📚 Workflows Demonstrated

### Task+Agent+Crew Pattern
- **Structure**: Traditional CrewAI workflow with explicit tasks
- **Execution**: `crew.kickoff()` with `thread_id`
- **Features**: Task-based workflow with HITL approval
- **Resume**: Automatic resume from interruption point

### Agent+Crew Pattern
- **Structure**: Direct agent execution with ReactExecutor
- **Execution**: `crew.invoke()` with `RunnableConfig`
- **Features**: React-style reasoning with HITL approval
- **Resume**: Automatic resume with preserved state

## 🎯 Key HITL Features Demonstrated

### 1. Advanced Configuration Flexibility
```python
# Example: Comprehensive HITL configuration with bilingual support
hitl_config = HITLConfig(
    interrupt_tool_mode="specified",
    interrupt_before_tools=["file_write", "send_email"],
    interrupt_after_tools=["data_analysis"],
    excluded_tools=["user_input", "web_search", "calculator"]
)
```

### 2. Smart User Interaction
- **Bilingual Support**: Chinese (批准/拒绝) ↔ English (Approve/Deny)
- **Keyword Recognition**: Natural language → structured responses
- **UI Integration**: Ready-made options for frontend components
- **Advanced Responses**: Parameter/result modification support

### 3. Intelligent Response Processing
```python
# Simple responses
"批准"  # → {"approved": True}
"拒绝"  # → {"approved": False}

# Advanced responses with modifications
{
    "approved": True,
    "modified_args": {"max_results": 10}  # Parameter modification
}

{
    "approved": True,
    "modified_result": "Enhanced result"  # Result modification
}
```

### 4. Complete Interrupt Coverage
- **Tool Before Interrupts**: `interrupt_before_tools` - Approval with parameter modification
- **Tool After Interrupts**: `interrupt_after_tools` - Review with result modification ⚠️ *Single session only*  
- **Node Interrupts**: `interrupt_before_nodes`/`interrupt_after_nodes` - LangGraph native
- **Combined Modes**: Mix tool and node interrupts for comprehensive control

### 5. Frontend-Ready Integration
- **Automatic Options**: System provides bilingual UI options
- **Event Handling**: Compatible with existing frontend event systems
- **Structured Data**: Rich detail objects for advanced UI components

### 6. Production-Ready Patterns
```python
# Complete HITL configuration
hitl_config = HITLConfig(
    # Tool-level interrupts (LangCrew HITL)
    interrupt_before_tools=["critical_operation"],
    interrupt_after_tools=["data_export"],
    interrupt_tool_mode="specified",
    excluded_tools=["calculator", "user_input"],
    
    # Node-level interrupts (LangGraph native)
    interrupt_before_nodes=["decision_node"],
    interrupt_after_nodes=["validation_node"]
)

try:
    result = crew.kickoff(inputs={}, thread_id=thread_id)
except InterruptException:
    # In production: show approval UI
    # In demo: simulate 2-second approval
    result = crew.kickoff(inputs={}, thread_id=thread_id)
```

## 📋 Prerequisites

### Required
- **Python 3.8+**
- **LangCrew framework** (installed in the project)
- **OpenAI API key** (for complete workflow demonstrations)

### Setup
```bash
# Set OpenAI API key
export OPENAI_API_KEY=your_api_key_here

# Project dependencies should already be installed
# Core HITL functionality works without additional setup
```

## 🏗️ Implementation Architecture

### Core Components
- **HITLConfig**: Static configuration for tool approval rules
- **HITLToolWrapper**: Dynamic tool wrapping for approval injection  
- **ApprovalWrappedTool**: Individual tool wrapper that calls `interrupt()`
- **InMemorySaver**: Checkpointer for state persistence across interrupts

### Workflow Lifecycle
1. **Setup**: Configure HITLConfig and create agents/crew
2. **Execution Start**: Begin workflow execution
3. **Tool Call**: Agent attempts to use a tool requiring approval
4. **Interrupt**: `interrupt()` pauses workflow and requests approval
5. **Approval**: User (or simulation) provides approval decision
6. **Resume**: Workflow continues from exact interruption point
7. **Completion**: Final result achieved with full state preservation

### State Management
- **Thread ID**: Unique identifier for resumable workflow sessions
- **Checkpointer**: InMemorySaver preserves state across interrupts
- **Configuration Consistency**: Same crew/agent config for resume

## 🚀 Production Deployment

### Best Practices
1. **Implement approval UI**: Replace simulation with real user interface
2. **Handle timeouts**: Set policies for approval request timeouts
3. **Add audit logging**: Track approval decisions for compliance
4. **Use database checkpointer**: Replace InMemorySaver for production
5. **Monitor performance**: Track workflow execution and approval rates

### Error Handling
```python
try:
    result = crew.kickoff(inputs={}, thread_id=thread_id)
    # Success path - workflow completed
except Exception as e:
    if "interrupt" in str(e).lower():
        # Handle approval request
        approval = show_approval_ui(e)
        if approval:
            # Resume with same configuration
            result = crew.kickoff(inputs={}, thread_id=thread_id)
    else:
        # Handle other errors
        log_error(e)
```

### Scaling Considerations
- **Approval queues**: Handle high-volume approval scenarios
- **Distributed checkpointing**: Use Redis or database for state storage
- **Timeout policies**: Automatic decisions for abandoned approvals
- **Audit trails**: Complete logging for regulatory compliance

## 💡 Self-Contained Benefits

### For Developers
- **Complete understanding**: See entire flow in one execution
- **No manual steps**: Everything automated for demonstration
- **Real workflow**: Actual interrupts and resumes, not simulations
- **Production patterns**: Real error handling and state management

### For Testing
- **Consistent results**: Same execution every time
- **Full coverage**: Both workflow patterns demonstrated
- **Easy debugging**: All code in one place
- **Quick iteration**: Single file to modify and test

## 🌟 New Advanced Features

### Bilingual User Interface
- **Automatic Language Detection**: System provides appropriate options based on display language
- **Smart Keyword Recognition**: Natural language processing for 20+ keywords per language
- **Cultural Adaptation**: Different terminology for different interaction contexts

### Parameter & Result Modification
- **Before Execution**: Users can modify tool parameters before execution
- **After Execution**: Users can edit or enhance tool results
- **Structured Feedback**: Support for complex modification requests
- **Error Handling**: Graceful handling of user feedback with reasons

### Frontend Integration Ready
- **Options API**: Automatic generation of UI-friendly options
- **Event Compatibility**: Works with existing frontend event systems
- **Rich Metadata**: Comprehensive detail objects for advanced UI components
- **Progressive Enhancement**: Simple buttons → advanced editors

## 🎯 Next Steps

1. **Run the demonstration**: Experience advanced bilingual HITL workflows
2. **Study the code**: Understand intelligent response processing patterns
3. **Experiment with responses**: Try different approval formats and modifications
4. **Adapt for your use case**: Configure approval rules and bilingual support
5. **Implement rich UI**: Build advanced approval interfaces with parameter editing
6. **Deploy internationally**: Leverage bilingual support for global deployment

The advanced demonstration showcases production-ready HITL with intelligent user interaction, ready for international deployment and rich frontend integration.

## ⚠️ Important Limitations

### interrupt_after_tools Session Limitation
The `interrupt_after_tools` feature only works within a single execution session:

- ✅ **Works**: During continuous workflow execution
- ❌ **Doesn't work**: After workflow restart from checkpointed state
- **Reason**: Tool results are cached to prevent duplicate user interactions
- **Workaround**: Use `interrupt_before_tools` for critical approvals that need to persist across restarts

### Example Scenarios

**✅ Single Session (Works)**:
```
1. Start workflow
2. Tool executes → triggers after-interrupt
3. User reviews result
4. Workflow continues
```

**❌ Restart Session (Doesn't Work)**:
```
1. Start workflow  
2. Tool executes → triggers after-interrupt
3. User reviews result
4. System crashes/restarts
5. Resume from checkpoint → after-interrupt skipped (result cached)
```

This design prevents users from being asked to review the same tool result multiple times across different sessions.
