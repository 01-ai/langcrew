# calculator_stdio.py
from fastmcp import FastMCP

# Create MCP server instance
mcp = FastMCP("Calculator")


@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers together"""
    return a + b


@mcp.tool()
def subtract(a: int, b: int) -> int:
    """Subtract the second number from the first number"""
    return a - b


@mcp.tool()
def multiply(a: int, b: int) -> int:
    """Multiply two numbers together"""
    return a * b


@mcp.tool()
def divide(a: float, b: float) -> float:
    """Divide the first number by the second number"""
    if b == 0:
        raise ValueError("Division by zero is not allowed")
    return a / b


if __name__ == "__main__":
    # Start server using stdio transport
    mcp.run(transport="stdio")
