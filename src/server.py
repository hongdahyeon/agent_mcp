from mcp.server.fastmcp import FastMCP
import os
import sys

# 프로젝트 루트를 sys.path에 추가하여 어디서든 'src' 모듈을 찾을 수 있게 합니다.
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)
if current_dir not in sys.path:
    sys.path.append(current_dir)
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
        '인사' 혹은 '안녕'이라는 키워드로 사용하더라도 호출됩니다.
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

    target_user = db.get_user(user_id)
    if not target_user:
        return f"User not found with ID: {user_id}"
    
    # dict 변환 및 password 제거
    user_dict = dict(target_user)
    if 'password' in user_dict:
        del user_dict['password']
        
    import json
    return json.dumps(user_dict, default=str, ensure_ascii=False)


@mcp.tool()
@audit_log
def get_current_time() -> str:
    """
    현재 시스템의 날짜와 시간을 조회합니다. 
    예약 이메일 설정 시 현재 시간을 기준으로 계산하기 위해 사용합니다.
    """
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@mcp.tool()
@audit_log
def send_email(recipient: str, content: str, subject: str = "", scheduled_at: str = "") -> str:
    """
    사용자에게 이메일을 즉시 발송하거나 특정 시간에 예약 발송합니다.
    - 즉시 발송: scheduled_at을 비워두세요.
    - 예약 발송: scheduled_at에 'YYYY-MM-DD HH:mm' 형식의 시간을 입력하세요.
    AI 에이전트 전용 도구입니다.
    """
    # 모듈 임포트
    try:
        from src.utils.mailer import EmailSender
        from src.scheduler import add_scheduled_job
    except ImportError:
        from utils.mailer import EmailSender
        from scheduler import add_scheduled_job

    final_subject = subject if subject else "AI Assistant Message"
    
    # 예약 시간 형식 보정 (YYYY-MM-DD HH:mm -> YYYY-MM-DD HH:mm:00)
    formatted_scheduled_dt = None
    if scheduled_at and len(scheduled_at.strip()) > 0:
        if len(scheduled_at) == 16: # YYYY-MM-DD HH:mm
            formatted_scheduled_dt = f"{scheduled_at}:00"
        else:
            formatted_scheduled_dt = scheduled_at
            
    is_scheduled = bool(formatted_scheduled_dt)
    
    try:
        # user_uid=None (AI 발신)
        log_id = db.log_email(
            user_uid=None,
            recipient=recipient,
            subject=final_subject,
            content=content,
            is_scheduled=is_scheduled,
            scheduled_dt=formatted_scheduled_dt
        )
        
        if not is_scheduled:
            sender = EmailSender()
            success, error_msg = sender.send_immediate(recipient, final_subject, content)
            new_status = 'SENT' if success else 'FAILED'
            db.update_email_status(log_id, new_status, error_msg)
            
            if success:
                return f"이메일 즉시 발송 완료 (Log ID: {log_id})"
            else:
                return f"이메일 발송 실패: {error_msg} (Log ID: {log_id})"
        else:
            try:
                add_scheduled_job(log_id, formatted_scheduled_dt)
                return f"이메일 발송 예약 완료 (Log ID: {log_id}, 시간: {formatted_scheduled_dt})"
            except Exception as e_sched:
                return f"이메일 예약 기록 완료했으나 스케줄러 등록 실패: {str(e_sched)} (Log ID: {log_id})"
    except Exception as e:
        return f"이메일 처리 중 오류 발생: {str(e)}"




@mcp.tool()
@audit_log
async def get_tool_analysis(tool_id: str) -> str:
    """
    입력된 OpenAPI 도구(tool_id)에 대한 상세 정보를 분석하고, 샘플 호출을 통해 응답 규격을 확인합니다.
    AI 에이전트가 도구 사용 방법을 이해하고 직접 테스트 결과(파라미터, 응답 예시)를 받아보기 위해 사용합니다.
    (1) 도구 상세 정보 및 파라미터 규격 조회
    (2) 실제 API 샘플 호출 수행 (인증 포함)
    (3) 결과 분석 및 응답 규격 정리
    (*) 자세한 내용은 docs/open_api.md 참고
    """
    try:
        from src.utils.openapi_analyzer import analyze_openapi_tool
    except ImportError:
        from utils.openapi_analyzer import analyze_openapi_tool
    
    import json
    result = await analyze_openapi_tool(tool_id)
    return json.dumps(result, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    # Initialize and run the server
    # Initialize DB before running server
    init_db()
    # Dynamic Tool Loading
    register_dynamic_tools(mcp)
    mcp.run()
