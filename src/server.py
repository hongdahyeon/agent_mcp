from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("agent-mcp-server")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool()
def subtract(a: int, b: int) -> int:
    """Subtract two numbers"""
    return a - b

if __name__ == "__main__":
    # Initialize and run the server
    mcp.run()
