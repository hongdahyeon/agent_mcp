"""
mcp_server_impl.py
==================

본 파일은 MCP(Model Context Protocol) 서버의 핵심 구현부
외부 AI 에이전트와 관리자 플랫폼(Admin Platform) 모두에서 접근 가능한 공통 인터페이스 역할을 수행.
정적(Static) 도구와 DB 기반 동적(Dynamic) 도구(Custom Tool, OpenAPI)를 통합 관리하고 실행.

# 주요 기능:
1. 도구 통합 관리: 정적 도구 목록과 DB(h_custom_tool) 로드 동적 도구를 에이전트에 통합 제공
2. 실행 제어 및 보안 (call_tool):
   - 인증 체크: 토큰 및 사용자 유효성 검증
   - 사용량 제한: 일일 사용량 체크 및 임계치 알림
   - 이력 기록: 실행 결과 및 성공 여부 DB 저장

# 도구 유형:
1. 정적(Static): 미리 정의된 파이썬 함수 직접 호출 (add, subtract 등)
    - 등록된 정적 도구 목록:
        (1) add: 두 숫자를 더합니다.
        (2) subtract: 두 숫자를 뺍니다.
        (3) hellouser: 사용자 이름을 입력받아 인사말을 반환합니다.
        (4) get_user_info: (Admin 전용) 사용자 ID로 상세 정보를 조회합니다.
        (5) get_current_time: 시스템의 현재 날짜와 시간을 조회합니다.
        (6) send_email: 이메일을 즉시 또는 예약 발송합니다.
(7) get_tool_analysis: OpenAPI 도구의 규격을 분석하고 샘플 호출 보고서를 생성합니다.
2. 동적(Dynamic): DB에 등록된 SQL/Python 코드 실행
3. OpenAPI: 외부 API 규격을 MCP로 래핑하여 실행
"""

from mcp.server import Server
from mcp.types import Tool, TextContent
import logging
import json
import httpx

# DB 및 유틸리티 모듈 유연한 임포트 처리
try:
    from src.db import (
        get_active_tools, get_tool_params, get_user, log_tool_usage,
        get_user_daily_usage, get_user_limit, get_all_access_tokens as get_all_user_tokens,
        log_email, update_email_status,
        get_openapi_list, get_openapi_by_tool_id, get_openapi_limit,
        get_user_openapi_daily_usage, log_openapi_usage,
        check_access_token_permission
    )
    from src.tool_executor import execute_sql_tool, execute_python_tool
    from src.utils.context import get_current_user
    from src.utils.mailer import EmailSender
    from src.scheduler import add_scheduled_job
    from src.utils.notification_helper import send_system_notification
    logger_prefix = "[SRC-IMPORT]"
except ImportError:
    from db import (
        get_active_tools, get_tool_params, get_user, log_tool_usage,
        get_user_daily_usage, get_user_limit, get_all_access_tokens as get_all_user_tokens,
        log_email, update_email_status,
        get_openapi_list, get_openapi_by_tool_id, get_openapi_limit,
        get_user_openapi_daily_usage, log_openapi_usage,
        check_access_token_permission
    )
    from tool_executor import execute_sql_tool, execute_python_tool
    from utils.context import get_current_user
    from utils.mailer import EmailSender
    from scheduler import add_scheduled_job
    from utils.notification_helper import send_system_notification
    logger_prefix = "[LOCAL-IMPORT]"

logger = logging.getLogger(__name__)
print(f"{logger_prefix} DB and utilities loaded successfully.")

# 전역 MCP 서버 인스턴스 초기화
mcp = Server("agent-mcp-sse")

# ==========================================
# 1. 도구 목록 조회 (list_tools)
# ==========================================
@mcp.list_tools()
async def list_tools():
    """정적/동적/OpenAPI 도구 전체 목록 구성 및 반환"""
    
    # [1] 정적 도구 목록 정의
    static_tools = [
        Tool(
            name="add",
            description="""
                [Server-side Math] 두 개의 숫자(number)를 입력받아 그 합을 정확히 반환합니다.
                서버 로직상의 연산이 필요할 때 반드시 사용합니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "number"},
                    "b": {"type": "number"}
                },
                "required": ["a", "b"]
            }
        ),
        Tool(
            name="subtract",
            description="""
                [Server-side Math] 두 개의 숫자(number)를 입력받아 차이를 반환합니다.
                정확한 산술 결과가 필요할 때 사용합니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "number"},
                    "b": {"type": "number"}
                },
                "required": ["a", "b"]
            }
        ),
        Tool(
            name="hellouser",
            description="""
                사용자 이름을 입력받아 인사말을 반환합니다.
                '인사' 또는 '안녕' 요청 시 응답 생성에 활용합니다.
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
                DB에서 특정 사용자의 상세 정보를 조회합니다. (보안상 비밀번호 제외)
                정확한 user_id 입력이 필요합니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "조회할 유저 ID"}
                },
                "required": ["user_id"]
            }
        ),
        Tool(
            name="get_current_time",
            description="시스템 서버의 현재 날짜와 시간을 조회합니다. 예약 기능의 기준 시간 확인용입니다.",
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
        Tool(
            name="get_tool_analysis",
            description="분석 대상 OpenAPI 도구(tool_id)의 명세와 샘플 호출 결과를 분석하여 보고서를 제공합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "tool_id": {"type": "string", "description": "분석할 OpenAPI 도구 ID (ex: 'get_info')"}
                },
                "required": ["tool_id"]
            }
        ),
    ]
    
    # 정적 도구 설명문 공백 제거
    for t in static_tools:
        t.description = t.description.strip()

    # [2] 동적 도구 로드 (h_custom_tool 테이블 기반)
    dynamic_tools = []
    try:
        active_tools = get_active_tools()
        for tool_data in active_tools:
            tool_id = tool_data['id']
            tool_name = tool_data['name']
            desc_agent = tool_data['description_agent'] or ""
            
            # 도구별 파라미터 정보 획득 및 JSON Schema 생성
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

    # [3] OpenAPI 도구 목록 로드 (h_openapi 테이블 기반)
    openapi_tools = []
    try:
        # 단일 페이지에 넉넉한 사이즈로 전체 조회
        openapi_res = get_openapi_list(page=1, size=1000)
        for api in openapi_res.get('items', []):
            tool_id = api['tool_id']
            name_ko = api['name_ko']
            desc_agent = api['description_agent'] or f"{name_ko} API 도구"
            
            # 파라미터 스키마 파싱 처리
            properties = {}
            required = []
            if api.get('params_schema'):
                try:
                    schema = json.loads(api['params_schema'])
                    # 단층형 Key-Value 구조인 경우 (에디터 입력 표준)
                    if isinstance(schema, dict):
                        for k, v in schema.items():
                            properties[k] = {
                                "type": "string",
                                "description": f"{k} 파라미터 (기본값/설명: {v})"
                            }
                except: pass
            
            openapi_tools.append(
                Tool(
                    name=tool_id,
                    description=f"[OpenAPI] {desc_agent}",
                    inputSchema={
                        "type": "object",
                        "properties": properties,
                        "required": required
                    }
                )
            )
    except Exception as e:
        logger.error(f"Failed to load OpenAPI tools: {e}")

    # 도구 리스트 취합 및 통계 로그 출력
    all_tools = static_tools + dynamic_tools + openapi_tools
    msg = f"Returning {len(all_tools)} tools (Static: {len(static_tools)}, Dynamic: {len(dynamic_tools)}, OpenAPI: {len(openapi_tools)})"
    logger.info(msg)
    print(f"[DEBUG] {msg}")
    return all_tools

# ==========================================
# 2. 도구 실행 처리 (call_tool)
# ==========================================
@mcp.call_tool()
async def call_tool(name: str, arguments: dict):
    """요청 및 인증 정보 확인 후 해당 도구 실행 및 결과 반환"""
    
    log_msg = f"Tool execution requested: {name} with args {arguments}"
    logger.info(log_msg)
    print(f"[DEBUG] {log_msg}")
    
    # [1-1] 사용자 인증 정보 획득 (Context 기반) 및 필요한 권한 함수 임포트
    current_user = get_current_user()
    
    # 도구 권한 검증 함수 동적 임포트 (NameError 방지)
    try:
        from src.db import check_access_token_permission
    except ImportError:
        from db import check_access_token_permission
    
    # [1-2] Stdio/Claude Desktop 환경 대응 (환경변수 'token' 기반 세션 복구 시도)
    if not current_user:
        import os
        from src.db.access_token import get_user_by_active_token
        token_env = os.environ.get('token')
        if token_env:
            try:
                user = get_user_by_active_token(token_env)
                if user:
                    current_user = dict(user)
                    logger.info(f"Authenticated via ENV token: {current_user['user_id']}")
            except Exception as e_auth:
                logger.error(f"Fallback auth error: {e_auth}")
    
    # [1-3] 인증 실패 시 차단
    if not current_user:
        logger.warning("Tool execution blocked: Unauthenticated")
        return [TextContent(type="text", text="Error: Authentication required (invalid or missing token).")]
        
    user_uid = current_user.get('uid')
    token_id = current_user.get('_token_id')
    user_id = current_user.get('user_id')
    role = current_user.get('role')

    # [2] 전체 일일 사용량 제한 확인 (User/Token 통합)
    daily_usage = get_user_daily_usage(user_uid=user_uid, token_id=token_id)
    daily_limit = get_user_limit(user_uid=user_uid, role=role, token_id=token_id)
    
    if daily_limit != -1 and daily_usage >= daily_limit:
        logger.warning(f"Limit exceeded: {daily_usage}/{daily_limit}")
        return [TextContent(type="text", text=f"Error: Daily usage limit exceeded ({daily_usage}/{daily_limit}).")]

    # 임계치(80%, 90%, 100%) 도달 시 시스템 알림 발송
    if daily_limit != -1 and user_uid:
        for threshold in [0.8, 0.9, 1.0]:
            if daily_usage + 1 == int(daily_limit * threshold):
                send_system_notification(
                    receive_user_uid=user_uid, 
                    title="MCP 사용량 임계치 도달", 
                    message=f"MCP 도구 사용량이 제한의 {int(threshold*100)}%에 근접/도달함."
                )

    # 내부 처리용 인자 제거 및 복사
    tool_args = arguments.copy()
    if "_user_uid" in tool_args: del tool_args["_user_uid"]

    try:
        # ------------------------------------------
        # Case 1: 정적 도구(Static Tool) 실행 로직
        # ------------------------------------------
        if name == "add":
            # 덧셈 결과 반환 및 로그 기록
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a + b)
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=True, result=result_val)
            return [TextContent(type="text", text=result_val)]

        if name == "subtract":
            # 뺄셈 결과 반환 및 로그 기록
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a - b)
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=True, result=result_val)
            return [TextContent(type="text", text=result_val)]

        if name == "hellouser":
            # 인사말 생성
            user_name = tool_args.get("name", "User")
            result_val = f"Hello {user_name}"
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=True, result=result_val)
            return [TextContent(type="text", text=result_val)]

        if name == "get_user_info":
            # Admin 권한 체크 및 사용자 상세 정보 조회
            if role != 'ROLE_ADMIN':
                return [TextContent(type="text", text="Error: Admin privileges required.")]
            target_id = tool_args.get("user_id")
            target_user = get_user(target_id)
            if not target_user:
                result_val = f"User not found: {target_id}"
                is_success = False
            else:
                user_dict = dict(target_user)
                if 'password' in user_dict: del user_dict['password']
                result_val = json.dumps(user_dict, default=str, ensure_ascii=False)
                is_success = True
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=is_success, result=result_val)
            return [TextContent(type="text", text=result_val)]

        if name == "get_current_time":
            # 서버 시간 문자열 반환
            from datetime import datetime
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            result_val = f"현재 서버 시간: {now_str}"
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=True, result=result_val)
            return [TextContent(type="text", text=result_val)]

        if name == "send_email":
            # 즉시 발송 혹은 예약 발송 처리
            recipient = tool_args.get("recipient")
            subject = tool_args.get("subject") or "AI Assistant Message"
            content = tool_args.get("content")
            scheduled_at = tool_args.get("scheduled_at")
            
            # 시간 형식 보정 (초 단위 추가)
            formatted_dt = f"{scheduled_at}:00" if scheduled_at and len(scheduled_at) == 16 else scheduled_at
            is_scheduled = bool(formatted_dt)
            
            try:
                log_id = log_email(user_uid=None, recipient=recipient, subject=subject, content=content, is_scheduled=is_scheduled, scheduled_dt=formatted_dt)
                if not is_scheduled:
                    sender = EmailSender()
                    success, err = sender.send_immediate(recipient, subject, content)
                    update_email_status(log_id, 'SENT' if success else 'FAILED', err)
                    result_val = f"이메일 발송 완료 (Log ID: {log_id})" if success else f"이메일 발송 실패: {err}"
                    is_success = success
                else:
                    add_scheduled_job(log_id, formatted_dt)
                    result_val = f"이메일 예약 완료 (Log ID: {log_id}, 시간: {formatted_dt})"
                    is_success = True
            except Exception as e_em:
                result_val = f"이메일 처리 오류: {str(e_em)}"
                is_success = False
            
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=is_success, result=result_val)
            return [TextContent(type="text", text=result_val)]

        if name == "get_tool_analysis":
            # OpenAPI 도구 분석 및 보고서 생성 보고
            from src.utils.openapi_analyzer import analyze_openapi_tool
            target_tid = tool_args.get("tool_id")
            analysis = await analyze_openapi_tool(target_tid)
            result_val = json.dumps(analysis, ensure_ascii=False, indent=2)
            is_success = (analysis.get("status") == "success")
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=is_success, result=result_val)
            return [TextContent(type="text", text=result_val)]

        # ------------------------------------------
        # Case 2: OpenAPI 도구 실행 로직
        # ------------------------------------------
        openapi_config = get_openapi_by_tool_id(name)
        if openapi_config:
            # [2-1] 외부 액세스 토큰 권한 체크
            if token_id:
                if not check_access_token_permission(token_id, name, "OPENAPI"):
                    logger.warning(f"Access Denied: Token {token_id} lacks permission for OpenAPI {name}")
                    return [TextContent(type="text", text=f"Error: Access Denied for this OpenAPI tool ('{name}').")]
            
            # [2-2] OpenAPI별 개별 사용량 제한 확인
            openapi_max = get_openapi_limit(user_uid=user_uid, user_id=user_id, token_id=token_id, role=role)
            if openapi_max != -1:
                openapi_usage = get_user_openapi_daily_usage(user_uid=user_uid, token_id=token_id)
                if openapi_usage >= openapi_max:
                    return [TextContent(type="text", text=f"Error: OpenAPI '{name}' limit exceeded.")]

            # 파라미터 병합 (DB 설정값 + 런타임 입력값)
            params = {}
            if openapi_config.get('params_schema'):
                try:
                    db_params = json.loads(openapi_config['params_schema'])
                    if isinstance(db_params, dict): params.update(db_params)
                except: pass
            params.update(tool_args)

            # API 호출 세부 설정 (Method, URL, Auth)
            method = openapi_config['method'].upper()
            target_url = openapi_config['api_url']
            headers = {}
            auth_type = openapi_config['auth_type']
            auth_param = openapi_config['auth_param_nm'] or "serviceKey"
            auth_key = openapi_config['auth_key_val']

            # 인증 방식에 따른 파라미터 보정
            if auth_type == "SERVICE_KEY":
                from urllib.parse import unquote
                params[auth_param] = unquote(auth_key)
            elif auth_type == "BEARER":
                headers["Authorization"] = f"Bearer {auth_key}"

            # 실제 HTTP 요청 실행 (비동기 처리)
            async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                if method == "GET":
                    response = await client.get(target_url, params=params, headers=headers)
                elif "POST" in method:
                    response = await client.post(target_url, json=tool_args, params=params, headers=headers)
                else:
                    response = await client.request(method, target_url, params=params, headers=headers)
                
                status_code = response.status_code
                res_text = response.text
                is_success = 200 <= status_code < 300
                
                # XML 응답일 경우 JSON으로 변환 시도
                final_text = res_text
                if "xml" in response.headers.get("Content-Type", "").lower():
                    try:
                        import xmltodict
                        final_text = json.dumps(xmltodict.parse(res_text), ensure_ascii=False)
                    except: pass

                # OpenAPI 실행 로그 및 통계 DB 기록
                log_openapi_usage({
                    "user_uid": user_uid, "token_id": token_id, "tool_id": name,
                    "method": method, "url": str(response.url), "status_code": status_code,
                    "success": 'SUCCESS' if is_success else 'FAIL', "ip_addr": "MCP-INTERNAL"
                })
                return [TextContent(type="text", text=final_text)]

        # ------------------------------------------
        # Case 3: Custom 도구(SQL/Python) 실행 로직
        # ------------------------------------------
        active_custom_tools = get_active_tools()
        target_tool = next((t for t in active_custom_tools if t['name'] == name), None)
        
        if target_tool:
            # [3-1] 외부 액세스 토큰 권한 체크
            if token_id:
                if not check_access_token_permission(token_id, name, "CUSTOM"):
                    logger.warning(f"Access Denied: Token {token_id} lacks permission for Custom Tool {name}")
                    return [TextContent(type="text", text=f"Error: Access Denied for this Custom tool ('{name}').")]

            # [3-2] Custom 도구 타입별 Executor 호출
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
            
            # 실행 성공 여부 판단 및 로그 기록
            is_success = not result_val.startswith("Error")
            if user_uid or token_id:
                log_tool_usage(user_uid=user_uid, token_id=token_id, tool_nm=name, tool_params=str(tool_args), success=is_success, result=result_val)
            return [TextContent(type="text", text=result_val)]

        # 해당 이름의 도구가 존재하지 않거나 비활성화된 경우
        return [TextContent(type="text", text=f"Error: Tool '{name}' not found or inactive.")]
    
    except Exception as e:
        logger.error(f"Execution error: {e}")
        return [TextContent(type="text", text=f"Error: {str(e)}")]
