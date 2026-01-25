from mcp.server.fastmcp import FastMCP
try:
    from src import db_manager
except ImportError:
    import db_manager

# Initialize FastMCP server
mcp = FastMCP("agent-mcp-server")

@mcp.tool()
def add(a: int, b: int) -> int:
    """
        2개의 숫자를 더합니다.
        '더하기'라는 키워드로 사용하더라도 호출됩니다.
    """
    return a + b

@mcp.tool()
def subtract(a: int, b: int) -> int:
    """
        2개의 숫자를 뺍니다.
        '빼기'라는 키워드로 사용하더라도 호출됩니다.
    """
    return a - b

@mcp.tool()
def hellouser(a: str) -> str:
    """
        사용자 이름을 입력받아 인사말을 반환합니다.
        '인사'라는 키워드로 사용하더라도 호출됩니다.
    """
    return f"Hello {a}"

@mcp.tool()
def get_user_info(user_id: str) -> str:
    """
        사용자 ID를 입력받아 사용자 정보를 반환합니다.
        '사용자 정보'라는 키워드로 사용하더라도 호출됩니다.
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
