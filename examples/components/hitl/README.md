# HITL Examples

Quick demonstration of LangCrew's Human-in-the-Loop capabilities.

## Files

- `hitl_example.py` - Complete self-contained demonstration with real workflows
- `README.md` - This file

## Run the Demo

```bash
# Run directly from the HITL example directory
cd examples/components/hitl

# For configuration examples only (no API key needed)
uv run hitl_demo

# For full demonstrations including live workflows
export OPENAI_API_KEY=your_api_key_here
uv run hitl_demo
```

## What You'll See

- ✅ **Tool Approval Workflows** - Before/after interrupts with parameter modification
- ✅ **Bilingual Interface** - Chinese/English keyword recognition  
- ✅ **Complete Interrupt/Resume Cycles** - Real workflow state management
- ✅ **Production Patterns** - Error handling and state persistence

## Prerequisites

- Python 3.11+
- LangCrew framework installed
- OpenAI API key (optional - required only for live workflow demonstrations)

## Full Documentation

For complete HITL documentation, concepts, and implementation guides, see:

- **[HITL Concepts](/concepts/hitl)** - Understanding HITL architecture
- **[HITL Quick Start](/guides/hitl/getting-started)** - 5-minute tutorial
- **[Complete Configuration Guide](/guides/hitl/configuration)** - Detailed implementation
- **[LangCrew Documentation](../../../docs/)** - Full framework documentation
