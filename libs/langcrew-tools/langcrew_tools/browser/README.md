# Browser Tools for LangCrew

## Description

The `browser` module in LangCrew provides browser automation tools for AI agents to interact with web applications. These tools enable agents to navigate websites, perform actions, and extract information through automated browser control with streaming capabilities and human intervention support.

The browser tools include enhanced functionality with patches for improved reliability and streaming event handling for real-time interaction feedback.

## Installation

1. Install the `langcrew-tools` package:

```shell
pip install langcrew-tools
```

2. Install additional dependencies for browser automation:

```shell
pip install browser-use
```

3. The browser tools are part of the internal module and are automatically available when using LangCrew.

## Usage

```python
from langcrew_tools.internal.browser import BrowserStreamingTool, BrowserUseInput

# Initialize the browser tool
browser_tool = BrowserStreamingTool()

# Navigate to a website and perform actions
result = await browser_tool.arun(
    url="https://example.com",
    task="Navigate to the login page and enter credentials"
)
```

## Supported Browser Tools

### BrowserStreamingTool

The `BrowserStreamingTool` provides comprehensive browser automation capabilities with streaming event support and enhanced error handling.

**Features:**
- Automated browser navigation and interaction
- Streaming event handling for real-time feedback
- Human intervention support for complex scenarios
- Enhanced error handling and recovery
- Support for various web applications and sites
- Configurable automation parameters
- Event-driven interaction model

**Usage Example:**
```python
from langcrew_tools.internal.browser import BrowserStreamingTool, BrowserUseInput

tool = BrowserStreamingTool()

# Basic navigation and interaction
result = await tool.arun(
    url="https://example.com",
    task="Click on the login button and fill in the username field"
)
```

### Browser Use Patches

The module includes patches for the browser-use library to enhance functionality:

**Features:**
- Human intervention action support
- Enhanced error handling
- Improved reliability
- Better integration with LangCrew workflows

**Usage:**
```python
from langcrew_tools.internal.browser import apply_browser_use_patches, HumanInterventionAction

# Apply patches automatically (done in __init__.py)
# apply_browser_use_patches()

# Handle human intervention events
def handle_intervention(action: HumanInterventionAction):
    print(f"Human intervention required: {action}")
```

## Browser Events

The browser tools support various event types for monitoring and control:

### BrowserStepEvent
Events that occur during browser automation steps:
- Navigation events
- Click events
- Form input events
- Page load events
- Error events

### BrowserCompletionEvent
Events that signal completion of browser tasks:
- Task success
- Task failure
- Human intervention required
- Timeout events

## Integration with LangCrew Agents

These tools are designed to be used within LangCrew agent workflows:

```python
from langcrew import Agent
from langcrew.project import agent
from langcrew_tools.internal.browser import BrowserStreamingTool

@agent
def web_automation_agent(self) -> Agent:
    return Agent(
        config=self.agents_config["web_automation_agent"],
        allow_delegation=False,
        tools=[BrowserStreamingTool()]
    )
```

## Browser Automation Workflow

The browser tools support a complete automation workflow:

1. **Initialization** - Set up browser session and configuration
2. **Navigation** - Navigate to target URLs
3. **Interaction** - Perform clicks, form inputs, and other actions
4. **Monitoring** - Track events and progress through streaming
5. **Intervention** - Handle human intervention when needed
6. **Completion** - Finalize tasks and clean up resources

## Human Intervention Support

The browser tools include sophisticated human intervention capabilities:

- **Automatic Detection** - Identify when human input is needed
- **Event Streaming** - Real-time notification of intervention requirements
- **Action Handling** - Process human responses and continue automation
- **Error Recovery** - Handle unexpected situations gracefully

## Error Handling

The tools include comprehensive error handling:
- Network connectivity issues
- Page load failures
- Element not found errors
- Timeout handling
- Browser crash recovery
- Human intervention coordination

## Performance Considerations

- **Streaming Events** - Real-time feedback for better user experience
- **Resource Management** - Efficient browser session handling
- **Timeout Configuration** - Configurable timeouts for different scenarios
- **Memory Management** - Proper cleanup of browser resources

## Security Features

- **Sandboxed Execution** - Browser automation in controlled environments
- **Input Validation** - Validation of URLs and user inputs
- **Error Isolation** - Prevention of system-level issues
- **Session Management** - Secure handling of browser sessions

## License

This module is part of the LangCrew project and is released under the MIT License. 