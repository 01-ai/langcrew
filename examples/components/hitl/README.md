# HITL Examples

Quick demonstration of LangCrew's Human-in-the-Loop capabilities.

## Files

- `hitl_example.py` - Complete self-contained demonstration with real workflows
- `README.md` - This file

## Run the Demo

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your_api_key_here

# Run directly from the HITL example directory
cd examples/components/hitl
uv run hitl_example.py
```

## What You'll See

- ✅ **Tool Approval Workflows** - Before/after interrupts with parameter modification
- ✅ **Bilingual Interface** - Chinese/English keyword recognition  
- ✅ **Complete Interrupt/Resume Cycles** - Real workflow state management
- ✅ **Production Patterns** - Error handling and state persistence

## Prerequisites

- Python 3.8+
- OpenAI API key (for workflow demonstrations)
- LangCrew framework installed

The core HITL configuration examples run without API keys.

## Full Documentation

For complete HITL documentation, concepts, and implementation guides, see:

- **[HITL Concepts](/concepts/hitl)** - Understanding HITL architecture
- **[HITL Quick Start](/guides/hitl/getting-started)** - 5-minute tutorial
- **[Complete Configuration Guide](/guides/hitl/configuration)** - Detailed implementation
- **[Advanced Usage](/guides/hitl/advanced-usage)** - Complex scenarios and patterns
- **[Production Deployment](/guides/hitl/production)** - Scale for production
- **[LangCrew Documentation](../../../docs/)** - Full framework documentation
