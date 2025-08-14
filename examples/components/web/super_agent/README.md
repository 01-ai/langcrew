# Super Agent - Browser Automation Crew

A powerful multi-agent system for web automation, research, and data analysis using LangCrew and browser automation tools.

## Features

- **Web Research Specialist**: Advanced web research with browser automation
- **Data Analysis Specialist**: Data processing and insight generation
- **Automation Specialist**: Complex web workflows and integration
- **Agent Handoff**: Seamless collaboration between specialized agents
- **Multiple Operation Modes**: Research, Automation, and Full Crew modes

## Setup

1. Install dependencies:
```bash
cd examples/super_agent
uv sync
```

2. Set up environment variables:
```bash
# Copy and configure your .env file
cp .env.example .env
# Add your API keys (OpenAI, etc.)
```

3. Run the application:
```bash
# Using uv
uv run super_agent

# Or using the script directly
python src/super_agent/main.py
```

## Usage Modes

### 1. Research Mode
Ideal for comprehensive web research and analysis:
- Multi-source information gathering
- Data verification and cross-referencing
- Structured research reports
- Source credibility analysis

### 2. Automation Mode
Perfect for complex web automation tasks:
- Multi-step workflow automation
- Form filling and data extraction
- Cross-platform integration
- Error handling and retry mechanisms

### 3. Full Crew Mode
Complete agent collaboration with handoff capabilities:
- Dynamic task distribution
- Inter-agent communication
- Comprehensive solution delivery
- Adaptive workflow management

## Agent Capabilities

### Web Researcher Agent
- Browser automation for web navigation
- Information extraction and gathering
- Multi-source research coordination
- Data verification processes

### Data Analyst Agent
- Research data analysis and processing
- Pattern recognition and trend analysis
- Comparative analysis across sources
- Insight generation and reporting

### Automation Specialist Agent
- Complex web automation workflows
- Multi-platform integration
- Advanced error handling
- Process optimization

## Browser Tool Features

The system uses `BrowserStreamingTool` which provides:
- Real-time browser automation
- Screenshot capture and analysis
- Interactive element detection
- Streaming execution feedback
- Multi-language support
- Sandbox environment integration

## Configuration

### Agent Configuration (`config/agents.yaml`)
- Role definitions and backstories
- LLM model specifications
- Tool assignments
- Handoff relationships

### Task Configuration (`config/tasks.yaml`)
- Task descriptions and objectives
- Expected output formats
- Performance criteria
- Integration requirements

## Examples

### Research Example
```bash
# Run research on AI trends
python main.py
# Select mode 1
# Enter topic: "artificial intelligence trends 2024"
```

### Automation Example
```bash
# Run web automation
python main.py
# Select mode 2
# Enter task: "automate product data collection from e-commerce sites"
```

### Full Crew Example
```bash
# Run complete workflow
python main.py
# Select mode 3 or press Enter
# Enter task: "competitor analysis for AI companies with automated data collection"
```

## Best Practices

1. **Clear Task Definition**: Provide specific, actionable task descriptions
2. **Source Verification**: Always verify information across multiple sources
3. **Error Handling**: Implement robust error handling for web interactions
4. **Rate Limiting**: Respect website terms of service and implement delays
5. **Data Quality**: Validate and clean extracted data before analysis

## Troubleshooting

### Common Issues

1. **Browser Session Errors**: Ensure proper browser initialization
2. **Rate Limiting**: Implement appropriate delays between requests
3. **Authentication**: Handle login requirements properly
4. **Network Issues**: Implement retry mechanisms for network failures

### Debugging

Enable verbose logging for detailed execution information:
```python
# Set verbose=True in crew configuration
crew = SuperAgentCrew().crew()
```

## Advanced Usage

### Custom Tool Integration
Add custom tools to agents:
```python
@agent
def custom_agent(self) -> Agent:
    return Agent(
        config=self.agents_config["custom_agent"],
        tools=[self.browser_tool, custom_tool],
        verbose=True,
    )
```

### Async Execution
Use async mode for concurrent operations:
```python
import asyncio
await run_async_crew()
```

## Dependencies

- `langcrew>=0.1.0`: Core agent framework
- `langcrew-tools>=0.1.0`: Browser automation tools
- `pydantic>=2.0.0`: Data validation
- `PyYAML>=6.0`: Configuration management
- `python-dotenv>=1.0.0`: Environment management

## License

This project is licensed under the same terms as the LangCrew framework.