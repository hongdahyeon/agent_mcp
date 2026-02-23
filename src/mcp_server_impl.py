from mcp.server import Server
from mcp.types import Tool, TextContent
import logging
import json
try:
    from src.db import (
        get_active_tools, get_tool_params, get_user, log_tool_usage,
        get_user_daily_usage, get_user_limit, get_all_access_tokens as get_all_user_tokens,
        log_email, update_email_status
    )
    from src.tool_executor import execute_sql_tool, execute_python_tool
    from src.utils.context import get_current_user
    from src.utils.mailer import EmailSender
    from src.scheduler import add_scheduled_job
except ImportError:
    from db import (
        get_active_tools, get_tool_params, get_user, log_tool_usage,
        get_user_daily_usage, get_user_limit, get_all_access_tokens as get_all_user_tokens,
        log_email, update_email_status
    )
    from tool_executor import execute_sql_tool, execute_python_tool
    from utils.context import get_current_user
    from utils.mailer import EmailSender
    from scheduler import add_scheduled_job

"""
    MCP 서버 인스턴스 및 Tool 정의
"""

logger = logging.getLogger(__name__)

mcp = Server("agent-mcp-sse")

# Tool 목록 조회
@mcp.list_tools()
async def list_tools():
    # 1. 정적 도구 목록 정의
    static_tools = [
        Tool(
            name="add",
            description="Add two numbers",
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"}
                },
                "required": ["a", "b"]
            }
        ),
        Tool(
            name="subtract",
            description="Subtract two numbers",
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"}
                },
                "required": ["a", "b"]
            }
        ),
        Tool(
            name="hellouser",
            description="""
                사용자 이름을 입력받아 인사말을 반환합니다. 
                '인사' 또는 '안녕'이라는 키워드로 사용하더라도 이 도구를 통해 응답을 생성해야 합니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "인사할 사용자의 이름"}
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="get_user_info",
            description="""
                DB에서 특정 사용자의 상세 정보를 조회합니다. (비밀번호 제외)
                '사용자 정보', '유저 정보' 조회 요청 시 이 도구를 사용합니다.
                파라미터로 조회할 사용자의 정확한 ID(user_id)가 필요합니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "조회할 사용자의 ID (예: 'admin', 'user')"}
                },
                "required": ["user_id"]
            }
        ),
        Tool(
            name="get_current_time",
            description="현재 시스템의 날짜와 시간을 조회합니다. 예약 이메일 설정 시 현재 시간을 기준으로 계산하기 위해 사용합니다.",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="send_email",
            description="""
                사용자에게 이메일을 즉시 발송하거나 특정 시간에 예약 발송합니다.
                '오늘 오후 2시'처럼 예약할 경우, 먼저 get_current_time을 호출하여 현재 시간을 확인한 뒤 'YYYY-MM-DD HH:mm' 형식으로 입력해야 합니다.
                AI 에이전트 이름으로 발송됩니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "recipient": {"type": "string", "description": "수신자 이메일 주소 (필수)"},
                    "subject": {"type": "string", "description": "이메일 제목 (선택, 미입력 시 'AI Assistant Message')"},
                    "content": {"type": "string", "description": "이메일 본문 내용 (필수)"},
                    "scheduled_at": {"type": "string", "description": "예약 발송 시간 (선택, YYYY-MM-DD HH:mm 형식)"}
                },
                "required": ["recipient", "content"]
            }
        ),
        # get_user_tokens removed
    ]
    
    for t in static_tools:
        t.description = t.description.strip()

    # 2. 동적 도구 목록 로드 (DB)
    dynamic_tools = []
    try:
        active_tools = get_active_tools()
        for tool_data in active_tools:
            tool_id = tool_data['id']
            tool_name = tool_data['name']
            desc_agent = tool_data['description_agent'] or ""
            
            params = get_tool_params(tool_id)
            properties = {}
            required = []
            
            for p in params:
                p_name = p['param_name']
                p_type_str = p['param_type'].upper()
                is_required = (p['is_required'] == 'Y')
                json_type = "string"
                if p_type_str == 'NUMBER':
                    json_type = "number"
                elif p_type_str == 'BOOLEAN':
                    json_type = "boolean"
                
                properties[p_name] = {
                    "type": json_type,
                    "description": p['description'] or ""
                }
                if is_required:
                    required.append(p_name)
            
            dynamic_tools.append(
                Tool(
                    name=tool_name,
                    description=f"[Dynamic] {desc_agent}",
                    inputSchema={
                        "type": "object",
                        "properties": properties,
                        "required": required
                    }
                )
            )
    except Exception as e:
        logger.error(f"Failed to load dynamic tools: {e}")
        pass

    return static_tools + dynamic_tools

# Tool 실행
@mcp.call_tool()
async def call_tool(name: str, arguments: dict):
    log_msg = f"Tool execution requested: {name} with args {arguments}"
    logger.info(log_msg)
    print(f"[DEBUG] {log_msg}")
    
    # [1] Context에서 사용자 정보 가져오기
    current_user = get_current_user()
    print(f"current_user:: {current_user}")
    
    user_uid = None
    token_id = None
    
    if current_user:
        user_uid = current_user.get('uid')
        token_id = current_user.get('_token_id')
        logger.info(f"Tool executed by authenticated user/token: {current_user['user_id']} ({current_user['role']})")
    else:
        logger.warning("Tool execution blocked: Unauthenticated")
        return [TextContent(type="text", text="Error: Authentication required to execute tools. Please refresh token.")]
        
    # [2] 사용량 제한 체크
    # user_uid가 있는 경우에만 기존 사용자 제한 체크 수행
    if user_uid:
        daily_usage = get_user_daily_usage(user_uid)
        daily_limit = get_user_limit(user_uid, current_user.get('role', 'ROLE_USER'))
        
        if daily_limit != -1 and daily_usage >= daily_limit:
            logger.warning(f"Tool execution blocked: Daily limit exceeded ({user_uid}, Usage: {daily_usage}/{daily_limit})")
            return [TextContent(type="text", text=f"Error: Daily usage limit exceeded ({daily_usage}/{daily_limit}). Please contact admin.")]

    # [3] 도구 실행 준비
    tool_args = arguments.copy()
    if "_user_uid" in tool_args:
            del tool_args["_user_uid"]

    # [4] 도구 실행
    try:
        result_val = ""
        is_success = False

        if "get_user_info" in name:
            if not current_user or current_user.get('role') != 'ROLE_ADMIN':
                result_val = "WARN: Admin privileges required for this tool"
            else:
                target_id = tool_args.get("user_id")
                if not target_id:
                    result_val = "Missing user_id parameter"
                else:
                    target_user = get_user(target_id)
                    if not target_user:
                        result_val = f"User not found with ID: {target_id}"
                    else:
                        user_dict = dict(target_user)
                        if 'password' in user_dict: del user_dict['password']
                        result_val = json.dumps(user_dict, default=str, ensure_ascii=False)
                        is_success = True
            
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=is_success, result=result_val)
            return [TextContent(type="text", text=result_val)]

        if name == "get_current_time":
            from datetime import datetime
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            result_val = f"현재 서버 시간: {now_str}"
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=True, result=result_val)
            return [TextContent(type="text", text=result_val)]

        if name == "send_email":
            recipient = tool_args.get("recipient")
            subject = tool_args.get("subject") or "AI Assistant Message"
            content = tool_args.get("content")
            scheduled_at = tool_args.get("scheduled_at") # YYYY-MM-DD HH:mm
            
            # 예약 시간 형식 보정 (YYYY-MM-DD HH:mm -> YYYY-MM-DD HH:mm:00)
            formatted_scheduled_dt = None
            if scheduled_at:
                if len(scheduled_at) == 16: # YYYY-MM-DD HH:mm
                    formatted_scheduled_dt = f"{scheduled_at}:00"
                else:
                    formatted_scheduled_dt = scheduled_at
            
            is_scheduled = bool(formatted_scheduled_dt)
            
            try:
                # user_uid=None 전달 (AI 발신임을 표시)
                log_id = log_email(
                    user_uid=None,
                    recipient=recipient,
                    subject=subject,
                    content=content,
                    is_scheduled=is_scheduled,
                    scheduled_dt=formatted_scheduled_dt
                )
                
                if not is_scheduled:
                    # 즉시 발송 처리
                    sender = EmailSender()
                    success, error_msg = sender.send_immediate(recipient, subject, content)
                    new_status = 'SENT' if success else 'FAILED'
                    update_email_status(log_id, new_status, error_msg)
                    
                    if success:
                        result_val = f"이메일 즉시 발송 완료 (Log ID: {log_id})"
                        is_success = True
                    else:
                        result_val = f"이메일 발송 실패: {error_msg} (Log ID: {log_id})"
                        is_success = False
                else:
                    # 스케줄러 등록
                    try:
                        add_scheduled_job(log_id, formatted_scheduled_dt)
                        result_val = f"이메일 발송 예약 완료 (Log ID: {log_id}, 시간: {formatted_scheduled_dt})"
                        is_success = True
                    except Exception as e_sched:
                        result_val = f"이메일 예약 기록 완료했으나 스케줄러 등록 실패: {str(e_sched)} (Log ID: {log_id})"
                        is_success = True
            except Exception as e:
                result_val = f"이메일 처리 중 오류 발생: {str(e)}"
                is_success = False
            
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=is_success, result=result_val)
            return [TextContent(type="text", text=result_val)]

        # Custom logic for get_user_tokens (if needed, but it was removed from tool list) or other admin tools can go here

        if name == "add":
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a + b)
            if user_uid or token_id: log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=True, result=result_val)
            return [TextContent(type="text", text=result_val)]
            
        elif name == "subtract":
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a - b)
            if user_uid or token_id: log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=True, result=result_val)
            return [TextContent(type="text", text=result_val)]
            
        elif name == "hellouser":
            user_name = tool_args.get("name", "User")
            result_val = f"Hello {user_name}"
            if user_uid or token_id: log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=True, result=result_val)
            return [TextContent(type="text", text=result_val)]

        # Dynamic Tools
        try:
            active_tools = get_active_tools()
            target_tool = next((t for t in active_tools if t['name'] == name), None)
            
            if target_tool:
                tool_type = target_tool['tool_type']
                definition = target_tool['definition']
                
                if tool_type == 'SQL':
                    result_raw = await execute_sql_tool(definition, tool_args)
                    result_val = str(result_raw)
                elif tool_type == 'PYTHON':
                    result_raw = await execute_python_tool(definition, tool_args)
                    result_val = str(result_raw)
                else:
                    return [TextContent(type="text", text=f"Error: Unknown tool type '{tool_type}'")]
                
                is_success = True
                if result_val.startswith("Error"):
                    is_success = False
                
                if user_uid or token_id:
                    log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=is_success, result=result_val)
                return [TextContent(type="text", text=result_val)]
        except Exception as e:
            logger.error(f"Dynamic tool execution error: {e}")
            
        return [TextContent(type="text", text=f"DEBUG FAIL: Unknown tool '{name}'")]
    
    except Exception as e:
        error_msg = f"Tool execution failed: {name} - {str(e)}"
        logger.error(error_msg)
        if user_uid or token_id:
            try:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=False, result=str(e))
            except: pass
        return [TextContent(type="text", text=f"Error: {str(e)}")]
