# Guardrail Example

Minimal demonstration of LangCrew's input and output guardrails.

## Files

- `guardrail_example.py` - Simple guardrail demonstration (~100 lines)
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

- ✅ **Normal Task** - Agent successfully processes safe content
- ✅ **Sensitive Data Blocking** - Guardrail prevents processing of passwords/secrets

## Prerequisites

- Python 3.11+
- OpenAI API key
- LangCrew framework installed

## Core Concepts Demonstrated

- **Input Guard**: `check_no_sensitive_info` - Blocks sensitive data in input
- **Output Guard**: `check_output_quality` - Ensures output meets basic quality standards
- **Agent Guards**: Guardrails applied to all tasks executed by an agent

## Full Documentation

For complete guardrail documentation, concepts, and implementation guides, see:

- **[LangCrew Documentation](../../../docs/)** - Full framework documentation