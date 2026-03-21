import pytest
import asyncio
import os
import sys
import json
from mcp.server.fastmcp import FastMCP

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.db.init_manager import init_db
from src.db.connection import get_db_connection
from src.db.user import get_user, create_user, verify_password
from src.utils.notification_helper import send_system_notification
from src.db.custom_tool import create_tool, delete_tool
from src.db.custom_tool_param import add_tool_param
from src.dynamic_loader import register_dynamic_tools

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    """테스트 전 DB 초기화"""
    init_db()

# ---------------------------------------------------------------------------
# (1) DB 연결 체크 (DB Connection Check)
# ---------------------------------------------------------------------------
def test_db_connection():
    conn = get_db_connection()
    assert conn is not None
    # 간단한 쿼리 실행 확인
    res = conn.execute("SELECT 1").fetchone()
    assert res[0] == 1
    conn.close()

# ---------------------------------------------------------------------------
# (2) 유저 로그인 체크 (User Login logic Check)
# ---------------------------------------------------------------------------
def test_user_login_integration():
    test_uid = "ci_test_user_login"
    test_pw = "ci_test_password_!@#"
    
    # [1] 테스트 유저 생성
    try:
        create_user({
            "user_id": test_uid,
            "password": test_pw,
            "user_nm": "CI Integration Admin",
            "user_email": "ci_admin@example.com",
            "role": "ROLE_ADMIN"
        })
    except ValueError:
        pass # 이미 존재할 경우 무시

    try:
        # [2] 유저 조회 확인
        user = get_user(test_uid)
        assert user is not None
        assert user['user_id'] == test_uid
        
        # [3] 비밀번호 검증 확인
        # DB에서 가져온 해시값과 비교
        is_valid = verify_password(test_pw, user['password'])
        assert is_valid is True
        
        # 잘못된 비밀번호 검증
        is_invalid = verify_password("wrong_password", user['password'])
        assert is_invalid is False

    finally:
        # [4] 정리를 위한 유저 삭제 (DB를 깨끗하게 유지)
        conn = get_db_connection()
        conn.execute("DELETE FROM h_user WHERE user_id = ?", (test_uid,))
        conn.commit()
        conn.close()

# ---------------------------------------------------------------------------
# (3) 텔레그램 알림 기록 체크 (Telegram Notification Logging Check)
# ---------------------------------------------------------------------------
def test_notification_logging():
    # 실제 텔레그램 전송은 실패하더라도 DB에 알림 이력은 생성되어야 함
    # (send_system_notification 내부에서 DB Insert를 수행함)
    notify_id = send_system_notification(
        receive_user_uid=1, # 관리자 UID
        title="[CI Test] Notification Check",
        message="CI Integration 테스트 중 발생한 알림 로그입니다."
    )
    
    assert notify_id is not None
    assert notify_id > 0
    
    # DB에서 실제 생성 확인
    conn = get_db_connection()
    log = conn.execute("SELECT * FROM h_notification WHERE id = ?", (notify_id,)).fetchone()
    assert log is not None
    assert log['title'] == "[CI Test] Notification Check"
    conn.close()

# ---------------------------------------------------------------------------
# (4) 동적 Tool 등록 및 복합 연산 테스트 (Dynamic Tool & Complex Logic Check)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_dynamic_tool_complex_calc():
    # 복합 연산 도구 시연: (a + b) - c
    tool_name = "ci_complex_calc"
    
    # [1] PYTHON 타입의 동적 도구 생성
    # definition은 execute_python_tool에서 eval() 되므로 Python 표현식 사용
    tool_id = create_tool(
        name=tool_name,
        tool_type="PYTHON",
        definition="(a + b) - c",
        description_agent="Performs complex calculation: (a + b) - c",
        created_by="jenkins_ci"
    )
    add_tool_param(tool_id, "a", "NUMBER", "Y", "First number")
    add_tool_param(tool_id, "b", "NUMBER", "Y", "Second number")
    add_tool_param(tool_id, "c", "NUMBER", "Y", "Third number to subtract")

    try:
        # [2] MCP 서버에 동적 도구 등록
        mcp = FastMCP("ci-test-mcp")
        register_dynamic_tools(mcp)
        
        # [3] 등록 여부 확인
        tools = await mcp.list_tools()
        tool_names = [t.name for t in tools]
        assert tool_name in tool_names
        
        # [4] 실제 실행 테스트 (Logic: (10 + 20) - 5 = 25)
        # FastMCP.call_tool() 또는 직접 executor 호출 가능
        # 여기서는 비즈니스 로직 연동 확인을 위해 execute_python_tool 직접 호출 검증
        from src.tool_executor import execute_python_tool
        result = await execute_python_tool("(a + b) - c", {"a": 10, "b": 20, "c": 5})
        assert str(result) == "25"

    finally:
        # [5] 리소스 정리 (DB 원상복구)
        delete_tool(tool_id)
