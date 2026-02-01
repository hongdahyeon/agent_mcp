from mcp.server.fastmcp import FastMCP
try:
    from src import db
except ImportError:
    import db
try:
    from src.db.init_manager import init_db
except ImportError:
    try:
        from db.init_manager import init_db
    except ImportError:
     from src.db.init_manager import init_db

try:
    from src.dynamic_loader import register_dynamic_tools
except ImportError:
    from dynamic_loader import register_dynamic_tools


# FastMCP server 초기화
mcp = FastMCP("agent-mcp-server")

import os
import functools
import traceback

# Audit Log Decorator Import
try:
    from src.utils.server_audit import audit_log
except ImportError:
    try:
        from utils.server_audit import audit_log
    except ImportError:
        # Fallback if import fails (should not happen in normal structure)
        def audit_log(func):
            return func

# 순서가 중요:: @mcp.tool()이 가장 바깥(위)에 있어야함
@mcp.tool()
@audit_log
def add(a: int, b: int) -> int:
    """
        2개의 숫자를 더합니다.
        '더하기'라는 키워드로 사용하더라도 호출됩니다.
    """
    return a + b

@mcp.tool()
@audit_log
def subtract(a: int, b: int) -> int:
    """
        2개의 숫자를 뺍니다.
        '빼기'라는 키워드로 사용하더라도 호출됩니다.
    """
    return a - b

@mcp.tool()
@audit_log
def hellouser(a: str) -> str:
    """
        사용자 이름을 입력받아 인사말을 반환합니다.
        '인사'라는 키워드로 사용하더라도 호출됩니다.
    """
    return f"Hello {a}"

@mcp.tool()
@audit_log
def get_user_info(user_id: str) -> str:
    """
        사용자 ID를 입력받아 사용자 정보를 반환합니다.
        '사용자 정보'라는 키워드로 사용하더라도 호출됩니다.
        인자로 'user' 값이 넘어와도, 해당 값을 사용자 ID로 인식하고 조회합니다.
    """
    # 권한 체크 (Admin Only) - Stdio에서는 토큰으로 유저 식별 후 체크
    token = os.environ.get('token')
    if not token:
        return "Error: Authentication token required"
        
    current_user = db.get_user_by_active_token(token)
    if not current_user or current_user.get('role') != 'ROLE_ADMIN':
        return "WARN: Admin privileges required for this tool"

    user = db.get_user(user_id)
    if not user:
        return f"User not found with ID: {user_id}"
    
    # dict 변환 및 password 제거
    user_dict = dict(user)
    if 'password' in user_dict:
        del user_dict['password']
        
    return str(user_dict)




if __name__ == "__main__":
    # Initialize and run the server
    # Initialize DB before running server
    init_db()
    # Dynamic Tool Loading
    register_dynamic_tools(mcp)
    mcp.run()
