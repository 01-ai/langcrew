# Code Interpreter Tool

A secure Python code execution tool for LangCrew that supports both Docker-based isolation and local restricted execution.

## Features

- **Dual Execution Backends**:
  - **Docker**: Fully isolated container execution (default when available)
  - **Python exec**: Restricted local execution with security constraints

- **Security Features**:
  - Network isolation in Docker mode
  - Resource limits (memory, CPU, execution time)
  - Restricted imports and builtins in local mode
  - Code validation before execution
  - Output truncation to prevent flooding

- **Advanced Capabilities**:
  - Package installation support (Docker mode only)
  - Custom module allowlisting
  - Configurable timeouts and resource limits
  - Async execution support

## Usage

### Basic Usage

```python
from langcrew.tools.code_interpreter import CodeInterpreterTool

# Create tool instance
tool = CodeInterpreterTool()

# Execute simple code
result = tool._run("print('Hello, World!')")
print(result)  # Output: Hello, World!

# Execute with timeout
result = tool._run("import time; time.sleep(5)", timeout=2)
print(result)  # Output: Code execution timed out after 2 seconds
```

### Using with External Packages (Docker only)

```python
# Install and use numpy
code = """
import numpy as np
arr = np.array([1, 2, 3, 4, 5])
print(f"Mean: {np.mean(arr)}")
"""
result = tool._run(code, packages=["numpy"])
```

### Configuration Options

```python
tool = CodeInterpreterTool(
    # Force specific backend
    use_docker=True,  # True/False/None (auto-detect)
    
    # Docker configuration
    docker_image="python:3.11-slim",
    docker_memory_limit="1g",
    docker_cpu_limit="2.0",
    
    # Output configuration
    max_output_length=20000,
    
    # Python exec configuration
    python_allowed_modules=["pandas", "scipy"]  # Additional allowed modules
)
```

## Security Model

### Docker Mode (Recommended)

- Complete process isolation
- No network access
- Read-only filesystem (except /tmp)
- Resource limits enforced by Docker
- Custom package installation in isolated environment

### Python Exec Mode (Fallback)

- Restricted imports (only safe standard library modules)
- Limited builtins (no file I/O, network, or system access)
- AST-based code validation
- Timeout enforcement
- Memory limits (Linux only)

### Allowed Modules in Python Mode

- Math and statistics: `math`, `statistics`, `decimal`, `fractions`
- Data structures: `collections`, `itertools`, `functools`
- Date/time: `datetime`, `calendar`
- Text processing: `string`, `re`, `json`, `csv`
- Utilities: `random`, `uuid`, `hashlib`, `base64`
- Type hints: `typing`, `dataclasses`, `abc`

### Forbidden Operations

- File system access (`open`, `os`, `pathlib`)
- Network operations (`socket`, `urllib`, `requests`)
- Process execution (`subprocess`, `os.system`)
- Code evaluation (`eval`, `exec`, `compile`)
- Module importing (`importlib`, `__import__`)
- System access (`sys`, `signal`, `atexit`)

## Error Handling

The tool handles various error conditions gracefully:

```python
# Syntax errors
result = tool._run("print('unclosed string")
# Output: SyntaxError: unterminated string literal

# Runtime errors
result = tool._run("1 / 0")
# Output: ZeroDivisionError: division by zero

# Security violations
result = tool._run("import os")
# Output: Security violations found: Import of module 'os' is not allowed

# Timeouts
result = tool._run("while True: pass", timeout=1)
# Output: Code execution timed out after 1 seconds
```

## Integration with LangChain

The tool follows LangChain's BaseTool interface:

```python
from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI

llm = OpenAI()
tools = [CodeInterpreterTool()]

agent = initialize_agent(
    tools,
    llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

result = agent.run("Calculate the factorial of 10")
```

## Testing

Run the test suite:

```bash
# Run all tests
python test_code_interpreter.py

# Run with pytest
pytest test_code_interpreter.py -v
```

## Examples

See `example.py` for comprehensive usage examples including:

- Basic calculations
- Data processing with statistics
- Date/time operations
- String manipulation
- Error handling
- Package usage (Docker mode)

## Requirements

- Python 3.8+
- Docker (optional, for isolated execution)
- langchain-core
- pydantic

## License

This tool is part of the LangCrew project and follows the same license terms.
