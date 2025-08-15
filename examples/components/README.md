# LangCrew Components Examples

This directory contains usage examples for various LangCrew components and modules. Each subdirectory focuses on a specific component, demonstrating best practices and common usage patterns.

## Directory Structure

### Core Components

- **[`hitl/`](./hitl/)** - Human-in-the-Loop (HITL) examples
  - Static interrupt configuration
  - Dynamic user interaction tools
  - Integration patterns

- **[`memory/`](./memory/)** - Memory system examples
  - Short-term, long-term, and entity memory
  - Different storage providers
  - Memory configuration patterns

- **[`mcp/`](./mcp/)** - Model Context Protocol (MCP) examples
  - MCP server integration
  - Tool discovery and usage
  - Security configurations

- **[`tools/`](./tools/)** - Tool system examples
  - Built-in tools usage
  - Custom tool development
  - Tool composition patterns

- **[`executors/`](./executors/)** - Executor examples
  - ReAct executor patterns
  - Plan-and-Execute workflows
  - Custom executor development

## Getting Started

Each component directory contains:
- **Basic examples** - Simple usage patterns for beginners
- **Advanced examples** - Complex integration scenarios
- **Best practices** - Recommended patterns and configurations
- **README.md** - Component-specific documentation

## Running Examples

Navigate to any component directory and run the examples:

```bash
# Example: Running HITL examples
cd examples/components/hitl
python hitl_example.py
```

## Example Categories

### By Complexity Level
- **Beginner** - Basic component usage
- **Intermediate** - Component integration
- **Advanced** - Custom implementations and complex workflows

### By Use Case
- **Configuration** - How to configure each component
- **Integration** - How components work together
- **Customization** - Extending and customizing components

## Contributing Examples

When adding new examples:

1. **Choose the right directory** - Place examples in the appropriate component folder
2. **Follow naming conventions** - Use descriptive, consistent file names
3. **Include documentation** - Add docstrings and comments
4. **Test your examples** - Ensure all examples run successfully
5. **Update READMEs** - Keep component documentation current

## Component Dependencies

Some examples may require additional dependencies. Check each component's README for specific requirements.

## Support

For questions about specific components or examples:
- Check the component's README file
- Review the main LangCrew documentation
- Look at related examples in other components 