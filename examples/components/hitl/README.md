# HITL (Human-in-the-Loop) Complete Workflow Examples

This directory contains a complete, self-contained demonstration of LangCrew's HITL tool approval system with real interrupt and resume workflows.

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

# Test different approval modes
config = HITLConfig(approval_tool_mode='specified', approval_tools=['file_write'])
print(f'Config test: {config.should_approve_tool(\"file_write\")}')
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
- Shows basic HITL configuration patterns
- Demonstrates different approval modes
- No LLM calls required

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

### 1. Configuration Flexibility
```python
# Example: File operations require approval, searches are automatic
hitl_config = HITLConfig(
    approval_tool_mode="specified",
    approval_tools=["file_write", "send_email"],
    excluded_tools=["user_input", "web_search", "calculator"]
)
```

### 2. Automatic Interrupt/Resume
- **Real Interrupts**: Actual `interrupt()` calls when approval needed
- **Simulated Approval**: 2-second delay simulating user decision
- **Automatic Resume**: Same crew/config continues from interruption
- **State Preservation**: InMemorySaver maintains full context

### 3. Production-Ready Patterns
```python
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

## 🎯 Next Steps

1. **Run the demonstration**: See complete interrupt/resume cycles
2. **Study the code**: Understand HITL integration patterns
3. **Adapt for your use case**: Modify approval rules and tools
4. **Implement approval UI**: Replace simulation with real interface
5. **Deploy with monitoring**: Add production-ready infrastructure

The self-contained demonstration provides everything needed to understand, test, and implement HITL tool approval in LangCrew workflows.
