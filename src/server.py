from mcp.server.fastmcp import FastMCP
try:
    from src import db_manager
except ImportError:
    import db_manager

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

@mcp.tool()
def hellouser(a: str) -> str:
    """Hello user"""
    return f"Hello {a}"

@mcp.tool()
def get_user_info(user_id: str) -> str:
    """
    Get user details by user_id from the database.
    Useful when you need to find user information like name, role, last login time, etc.
    """
    user = db_manager.get_user(user_id)
    if not user:
        return f"User not found with ID: {user_id}"
    
    # dict 변환 및 password 제거
    user_dict = dict(user)
    if 'password' in user_dict:
        del user_dict['password']
        
    return str(user_dict)


if __name__ == "__main__":
    # Initialize and run the server
    mcp.run()
