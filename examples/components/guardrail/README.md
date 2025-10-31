# Guardrail Example

Minimal demonstration of LangCrew's input and output guardrails.

## Files

- `guardrail_example.py` - Simple guardrail demonstration
- `README.md` - This file

## Run the Demo

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your_api_key_here

# Run directly from the guardrail example directory
cd examples/components/guardrail
uv run guardrail_example.py
```

## What You'll See

- ✅ **Normal Task** - Agent successfully processes safe content about renewable energy
- ✅ **Sensitive Data Blocking** - Input guardrail prevents processing when "password:" or "secret:" is detected in the task description
- ✅ **Short Output Blocking** - Output guardrail blocks responses shorter than 3 characters

## Prerequisites

- Python 3.11+
- OpenAI API key
- LangCrew framework installed

## Core Concepts Demonstrated

- **Input Guard**: `check_no_sensitive_info` - Scans task descriptions for sensitive keywords ("password:", "secret:") and blocks execution
- **Output Guard**: `check_output_quality` - Validates that agent responses meet minimum length requirements (3+ characters)
- **Agent Guards**: Both input and output guardrails are applied to all tasks executed by the agent

## Full Documentation

For complete guardrail documentation, concepts, and implementation guides, see:

- **[LangCrew Documentation](../../../docs/)** - Full framework documentation