# LangCrew

> **High-level multi-agent framework built on LangGraph - combines CrewAI's simplicity with enterprise-grade capabilities**

LangCrew bridges the gap between LangGraph's flexibility and CrewAI's simplicity, offering pre-built agent orchestration, memory management, and production-ready features that eliminate the complexity of multi-agent development.

## Quick Start

Install LangCrew:

```bash
pip install langcrew
```

Create your first multi-agent workflow:

```python
import os
# Note: You'll need to install: pip install langchain-openai
from langchain_openai import ChatOpenAI
from langcrew import Agent, Task, Crew

# Create agents
researcher = Agent(
    role="Research Analyst",
    goal="Find and analyze information about any topic",
    backstory="You excel at finding key information and insights",
    llm=ChatOpenAI(model="gpt-4.1", api_key=os.getenv("OPENAI_API_KEY"))
)

writer = Agent(
    role="Content Writer", 
    goal="Create engaging content based on research",
    backstory="You're skilled at turning complex information into clear, compelling content",
    llm=ChatOpenAI(model="gpt-4.1", api_key=os.getenv("OPENAI_API_KEY"))
)

# Define tasks
research_task = Task(
    description="Research the latest trends in {topic}",
    agent=researcher,
    expected_output="A comprehensive analysis of current trends"
)

write_task = Task(
    description="Write a blog post about the research findings",
    agent=writer,
    expected_output="A well-structured blog post"
)

# Create and run crew
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task]
)

result = crew.kickoff(inputs={"topic": "AI agents"})
print(result)
```

That's it! Your agents will collaborate to research and write about any topic you choose.

## Core Capabilities

### **Intelligent Orchestration** - [LangGraph-Powered Workflow Engine](../../docs/src/content/docs/concepts/crews.mdx)
State-driven agent coordination with optimized graph compilation, supporting sequential pipelines, conditional routing, and parallel execution patterns. Built-in context propagation ensures seamless information flow between agents.

### **Multi-Layer Memory Architecture** - [Persistent Knowledge Systems](../../docs/src/content/docs/concepts/crews.mdx#memory-systems)  
Hierarchical memory with short-term, long-term, and entity storage. Native PostgreSQL/Redis backends with vector similarity search. Thread-based conversation continuity and cross-session knowledge retention.

### **Human-in-the-Loop Workflows** - [Enterprise HITL Integration](../../docs/src/content/docs/concepts/crews.mdx#human-in-the-loop-hitl)
Configurable interruption points with approval mechanisms. Supports pre/post task interventions, critical decision checkpoints, and async human feedback loops. Full bilingual UI components for seamless interaction.

### **Real-time Event Streaming** - [Async Execution & Monitoring](../../docs/src/content/docs/concepts/crews.mdx#streaming-execution)
Token-level streaming with granular event dispatch. Monitor agent thoughts, tool calls, and intermediate results in real-time. Supports WebSocket/SSE for live UI updates with v2 event protocol.

### **Flexible Task Execution** - [Advanced Orchestration Patterns](../../docs/src/content/docs/concepts/tasks.mdx#advanced-features)
Dynamic task dependencies with context inheritance. Conditional execution based on outputs, retry mechanisms with exponential backoff, and parallel task processing with result aggregation.

## Documentation

### Core Concepts
- **[Agents](../../docs/src/content/docs/concepts/agents.mdx)**: Learn about intelligent agent creation and configuration
- **[Tasks](../../docs/src/content/docs/concepts/tasks.mdx)**: Understand task definition and orchestration
- **[Crews](../../docs/src/content/docs/concepts/crews.mdx)**: Master multi-agent coordination and workflows

## Related Projects

LangCrew builds on the shoulders of giants:
- **LangChain**: [github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain) - The foundation for LLM applications
- **LangGraph**: [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) - Our underlying orchestration engine
- **CrewAI**: [github.com/joaomdmoura/crewAI](https://github.com/joaomdmoura/crewAI) - Inspiration for our agent patterns

## Contributing

You are welcome to open issues or submit PRs to improve this app, however, please note that we may not review all suggestions.


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Next Steps

**Learn More**: [Complete Documentation](../../docs/) | [Examples](../../examples/) | [API Reference](../../docs/src/content/docs/api/)

**Ready-to-Use**: [Recruitment System](../../examples/recruitment/) | [Marketing Strategy](../../examples/marketing-strategy/) | [Travel Planning](../../examples/surprise-trip/)

**Get Help**: [GitHub Issues](https://github.com/01-ai/langcrew/issues) | [Discussions](https://github.com/01-ai/langcrew/discussions)
