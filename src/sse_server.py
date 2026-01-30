
from fastapi import FastAPI, Request, HTTPException, Header, Query, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import uvicorn
from mcp.server.sse import SseServerTransport
from mcp.server import Server
from mcp.types import Tool, TextContent
import logging
import os
from datetime import datetime, timedelta
import sys
import json
from contextlib import asynccontextmanager
import requests

try:
    from src.utils.context import set_current_user, get_current_user, clear_current_user
    from src.tool_executor import execute_sql_tool, execute_python_tool
    from src.utils.mailer import EmailSender
    from src.db.email_manager import log_email, update_email_status, get_email_logs, cancel_email_log
    from src.scheduler import start_scheduler, shutdown_scheduler
    from src.utils.auth import create_access_token, verify_token, verify_password, get_password_hash
except ImportError:
    from utils.context import set_current_user, get_current_user, clear_current_user
    from tool_executor import execute_sql_tool, execute_python_tool
    from utils.mailer import EmailSender
    from db.email_manager import log_email, update_email_status, get_email_logs
    from utils.auth import create_access_token, verify_token, verify_password, get_password_hash
    try:
        from scheduler import start_scheduler, shutdown_scheduler
    except ImportError:
        from src.scheduler import start_scheduler, shutdown_scheduler

# CRITICAL DEBUG: Verify exact file execution
print(f"!!! SERVER STARTING FROM: {os.path.abspath(__file__)} !!!")

# ==========================================
# 1. 로깅 설정 (요구사항: logs/yyyy-mm-dd-hh:mm.txt)
# ==========================================
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# 시작 시간을 기준으로 파일명 생성
current_time = datetime.now().strftime("%Y-%m-%d")
log_filename = f"{LOG_DIR}/{current_time}.txt"

# 로깅 구성 - 핸들러를 로거에 직접 연결하여 유지되도록 함
# ROOT Logger 설정 (모든 모듈의 로그를 캡처하기 위해)
logger = logging.getLogger() 
logger.setLevel(logging.INFO)

# APScheduler 로그 레벨 조정 (매 분마다 실행 로그 찍히는 것 방지)
logging.getLogger('apscheduler').setLevel(logging.WARNING)

# 핸들러 생성
# buffering=1: 라인 단위 버퍼링
file_handler = logging.FileHandler(log_filename, encoding='utf-8', mode='a')
file_handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s'))

stream_handler = logging.StreamHandler()
stream_handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s'))

# 핸들러 추가
# Uvicorn 핫 리로드로 인한 오래된 핸들러 누적 방지를 위해 기존 핸들러 제거
if logger.handlers:
    logger.handlers.clear()

logger.addHandler(file_handler)
logger.addHandler(stream_handler)

logger.info(f"Server started. Log file: {log_filename}")


# ==========================================
# 2. MCP 서버 초기화
# ==========================================
# [1] lifespan: 스케줄러 시작/종료 관리
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 스케줄러 시작
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
    
    yield
    
    # Shutdown: 스케줄러 종료
    try:
        shutdown_scheduler()
    except Exception as e:
        logger.error(f"Failed to shutdown scheduler: {e}")

app = FastAPI(lifespan=lifespan)
mcp = Server("agent-mcp-sse")
sse = SseServerTransport("/messages")

# ==========================================
# Auth Dependency & Scheme
# ==========================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user_jwt(token: str = Depends(oauth2_scheme)):
    """
    Validate JWT token and return user info.
    Replacing X-User-Id header validation.
    """
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    user = get_user(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    return dict(user)

# 2-1. Tool 목록 조회
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
        # Hellouser 도구 추가
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
        # DB 연동: 사용자 정보 조회 도구 추가
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

        # get_user_tokens tool 삭제 (2026.01.30)

    ]
    
    # Mark static tools as [System]
    for t in static_tools:
        # Prepend identifying tag to description for frontend to recognize
        t.description = f"[System] {t.description.strip()}"

    # 2. 동적 도구 목록 로드 (DB)
    dynamic_tools = []
    try:
        try:
            from src.db import get_active_tools, get_tool_params
        except ImportError:
            from db import get_active_tools, get_tool_params
            
        active_tools = get_active_tools()
        for tool_data in active_tools:
            tool_id = tool_data['id']
            tool_name = tool_data['name']
            desc_agent = tool_data['description_agent'] or ""
            
            # 파라미터 정보 로드
            params = get_tool_params(tool_id)
            
            # JSON Schema 변환
            properties = {}
            required = []
            
            for p in params:
                p_name = p['param_name']
                p_type_str = p['param_type'].upper()
                is_required = (p['is_required'] == 'Y')
                
                # 타입 매핑
                json_type = "string"
                if p_type_str == 'NUMBER':
                    json_type = "number" # or integer
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
        # 동적 로딩 실패하더라도 정적 툴은 반환
        pass

    # list_tools: server.py에 등록된 tool + 동적등록된 tool 조회
    return static_tools + dynamic_tools

# 2-2. 도구 실행시, 호출되는 함수
# (1) context에서 사용자 정보 가져오기: get_current_user()
# (2) 도구 사용량 체크: get_user_daily_usage(), get_user_limit()
# (3) 도구 실행: {name}에 해당하는 도구 실행
# (4) 도구 사용 기록 남기기: log_tool_usage
@mcp.call_tool()
async def call_tool(name: str, arguments: dict):
    # 파일 및 콘솔에 로그 기록
    log_msg = f"Tool execution requested: {name} with args {arguments}"
    logger.info(log_msg)
    print(f"[DEBUG] {log_msg}") # 콘솔 직접 출력 (fallback)
    
    try:
        from src.db import get_user, log_tool_usage, get_user_daily_usage, get_user_limit
    except ImportError:
        from db import get_user, log_tool_usage, get_user_daily_usage, get_user_limit

    # [1] Context에서 사용자 정보 가져오기
    # => {token} 없는 인증되지 않은 유저의 경우 도구 실행 불가능
    current_user = get_current_user()
    print(f"current_user:: {current_user}")
    if current_user:
        user_uid = current_user['uid']
        logger.info(f"Tool executed by authenticated user: {current_user['user_id']} ({current_user['role']})")
    else:
        # 인증되지 않은 사용자의 도구 실행 시도 -> 차단
        logger.warning("Tool execution blocked: Unauthenticated")
        return [TextContent(type="text", text="Error: Authentication required to execute tools. Please refresh token.")]
        

    # [2] 사용량 제한 체크 (Rate Limiting)
    # => Admin(-1)은 무제한, User(50)은 제한
    daily_usage = get_user_daily_usage(user_uid)
    daily_limit = get_user_limit(user_uid, current_user.get('role', 'ROLE_USER'))
    
    if daily_limit != -1 and daily_usage >= daily_limit:
        logger.warning(f"Tool execution blocked: Daily limit exceeded ({user_uid}, Usage: {daily_usage}/{daily_limit})")
        return [TextContent(type="text", text=f"Error: Daily usage limit exceeded ({daily_usage}/{daily_limit}). Please contact admin.")]

    # [3] 도구 실행 준비
    tool_args = arguments.copy()
    # 혹시라도 클라이언트가 보냈을 _user_uid가 있다면 제거 (Clean args)
    if "_user_uid" in tool_args:
            del tool_args["_user_uid"]

    # [4] 도구 실행
    try:
        result_val = ""
        
        # ---------------------------------------------------------
        # 1. get_user_info (우선순위 높임 + 포함 여부 확인)
        # ---------------------------------------------------------
        if "get_user_info" in name:
            logger.info(f"DEBUG: Entered get_user_info block (Matched '{name}')")

            # 권한 체크 (Admin Only)
            if not current_user or current_user.get('role') != 'ROLE_ADMIN':
                result_val = "WARN: Admin privileges required for this tool"
                is_success = False
            else:
                target_id = tool_args.get("user_id")
                if not target_id:
                    result_val = "Missing user_id parameter"
                    is_success = False
                    # raise 제거
                    # raise ValueError("Missing user_id parameter")
                else:
                    # 대상 사용자 조회 (UID 획득용)
                    target_user = get_user(target_id)
                    
                if not target_user:
                    result_val = f"User not found with ID: {target_id}"
                    is_success = False
                else:
                    user_dict = dict(target_user)
                    if 'password' in user_dict:
                        del user_dict['password']
                    result_val = json.dumps(user_dict, default=str, ensure_ascii=False) # json value 형태로 반환
                    is_success = True
            
            logger.info(f"Tool execution: {name} -> success={is_success}")
            
            # {user_uid}가 있을 경우, usage 정보 저장
            # => h_mcp_tool_usage 테이블의 {user_uid}컬럼이 not-null이기 때문에, user_uid가 없다면 저장 불가능
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), is_success, result_val)
                
            return [TextContent(type="text", text=result_val)]

        # ---------------------------------------------------------
        # 2. get_user_tokens (Admin Only)
        # ---------------------------------------------------------
        if name == "get_user_tokens":
            logger.info(f"DEBUG: Entered get_user_tokens block (Matched '{name}')")

            # 권한 체크 (Admin Only)
            if not current_user or current_user.get('role') != 'ROLE_ADMIN':
                 result_val = "WARN: Admin privileges required for this tool"
                 is_success = False
            else:
                target_id = tool_args.get("user_id")
                if not target_id:
                    result_val = "Error: Missing user_id parameter"
                    is_success = False
                    # raise 제거
                    # raise ValueError("Missing user_id parameter")
                else:
                    # 대상 사용자 조회 (UID 획득용)
                    target_user = get_user(target_id)
                if not target_user:
                    result_val = f"User not found: {target_id}"
                    is_success = False
                else:
                    # 토큰 목록 조회
                    tokens = get_all_user_tokens(target_user['uid'])
                    result_val = json.dumps(tokens, default=str, ensure_ascii=False) # json value 형태로 반환
                    is_success = True

            # {user_uid}가 있을 경우, usage 정보 저장
            # => h_mcp_tool_usage 테이블의 {user_uid}컬럼이 not-null이기 때문에, user_uid가 없다면 저장 불가능
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), is_success, result_val)
            
            return [TextContent(type="text", text=result_val)]
            
        # ---------------------------------------------------------
        # 3. Other Tools
        # - add, subtract, hellouser
        # ---------------------------------------------------------
        if name == "add":
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a + b)
            
            logger.info(f"Tool execution success: {name} -> {result_val}")

            # {user_uid}가 있을 경우, usage 정보 저장
            # => h_mcp_tool_usage 테이블의 {user_uid}컬럼이 not-null이기 때문에, user_uid가 없다면 저장 불가능
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), True, result_val)
                
            return [TextContent(type="text", text=result_val)]
            
        elif name == "subtract":
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a - b)
            
            logger.info(f"Tool execution success: {name} -> {result_val}")

            # {user_uid}가 있을 경우, usage 정보 저장
            # => h_mcp_tool_usage 테이블의 {user_uid}컬럼이 not-null이기 때문에, user_uid가 없다면 저장 불가능
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), True, result_val)
            
            return [TextContent(type="text", text=result_val)]
            
        elif name == "hellouser":
            user_name = tool_args.get("name", "User")
            result_val = f"Hello {user_name}"
            
            logger.info(f"Tool execution success: {name} -> {result_val}")
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), True, result_val)
            
            return [TextContent(type="text", text=result_val)]

        # ---------------------------------------------------------
        # 4. Dynamic Tools
        # ---------------------------------------------------------
        # 동적 도구인지 확인
        try:
            try:
                from src.db import get_active_tools
            except ImportError:
                from db import get_active_tools
                
            active_tools = get_active_tools()
            target_tool = next((t for t in active_tools if t['name'] == name), None)
            
            if target_tool:
                logger.info(f"DEBUG: Executing dynamic tool '{name}' ({target_tool['tool_type']})")
                
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
                
                logger.info(f"Tool execution: {name} -> success={is_success}")
                
                if user_uid:
                    log_tool_usage(user_uid, name, str(tool_args), is_success, result_val)
                    
                return [TextContent(type="text", text=result_val)]
                
        except Exception as e:
            logger.error(f"Dynamic tool execution error: {e}")
            # fall through to default error handler
            # raise e
            
        logger.error(f"DEBUG: No tool matched. Name='{name}'")
        # raise ValueError(f"Unknown tool: {name}")
        return [TextContent(type="text", text=f"DEBUG FAIL: Received name='{name}' len={len(name)} hex={name.encode('utf-8').hex()}")]
    
    except Exception as e:
        error_msg = f"Tool execution failed: {name} - {str(e)}"
        logger.error(error_msg)
        print(f"[ERROR] {error_msg}")
        
        if user_uid:
                # Try import again in except block if needed
                try:
                    try:
                        from src.db import log_tool_usage
                    except ImportError:
                        from db import log_tool_usage
                    log_tool_usage(user_uid, name, str(tool_args), False, str(e))
                except:
                    pass
                
        # raise e 대신 에러 메시지 리턴으로 변경 (서버 크래시 방지)
        return [TextContent(type="text", text=f"Error: {str(e)}")]


# ==========================================
# 3. import db
# ==========================================
try:
    from src.db.init_manager import init_db
    from src.db import (
        get_user, verify_password, log_login_attempt, get_login_history,
        get_all_users, create_user, update_user, check_user_id, log_tool_usage,
        get_tool_usage_logs, get_user_daily_usage, get_user_limit, get_admin_usage_stats,
        get_limit_list, upsert_limit, delete_limit,
        get_all_tools, create_tool, update_tool, delete_tool, get_tool_params, add_tool_param, clear_tool_params, get_tool_by_id,
        get_all_configs, get_config_value, set_config, delete_config,
        log_email, update_email_status, get_email_logs, cancel_email_log,
        create_access_token, get_access_token, get_all_access_tokens, delete_access_token
    )
except ImportError:
    # 실행 위치에 따라 경로가 다를 수 있음
    try:
        from db.init_manager import init_db
    except ImportError:
         from src.db.init_manager import init_db
         
    from db import (
        get_user, verify_password, log_login_attempt, get_login_history,
        get_all_users, create_user, update_user, check_user_id, log_tool_usage,
        get_tool_usage_logs, get_user_daily_usage, get_user_limit, get_admin_usage_stats,
        get_limit_list, upsert_limit, delete_limit,
        get_all_tools, create_tool, update_tool, delete_tool, get_tool_params, add_tool_param, clear_tool_params, get_tool_by_id,
        get_all_configs, get_config_value, set_config, delete_config,
        log_email, update_email_status, get_email_logs, cancel_email_log,
        create_access_token, get_access_token, get_all_access_tokens, delete_access_token
    )
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


# ==========================================
# 4. 시작 시 데이터베이스 초기화
# ==========================================
try:
    init_db()
    logger.info("Database initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    print(f"!!! DB INIT FAILED: {e} !!!")

class LoginRequest(BaseModel):
    user_id: str
    password: str


# ==========================================
# 5. 로그인 API
# ==========================================
# ==========================================
# 5. 로그인 API (JWT Based)
# ==========================================
@app.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), request: Request = None):
    """
    OAuth2 Password Flow Login.
    Returns JWT Access Token.
    """
    # 사용자 조회
    user = get_user(form_data.username)
    ip_addr = request.client.host if request else "unknown"
    
    if user and verify_password(form_data.password, user['password']):
        if dict(user).get('is_enable', 'Y') == 'N':
            log_login_attempt(user['uid'], ip_addr, False, "Account Disabled")
            raise HTTPException(status_code=403, detail="Account is disabled")
            
        # JWT 생성
        access_token_expires = timedelta(hours=12)
        access_token = create_access_token(
            data={"sub": user['user_id'], "role": user['role']},
            expires_delta=access_token_expires
        )
        
        # 로그인 이력 기록
        log_login_attempt(user['uid'], ip_addr, True, "Login Successful (JWT)")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "uid": user['uid'], 
                "user_id": user['user_id'], 
                "user_nm": user['user_nm'], 
                "role": user['role']
            }
        }
    else:
        user_uid = user['uid'] if user else None
        log_login_attempt(user_uid, ip_addr, False, "Invalid Credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==========================================
# 6. 유저 로그인 기록
# ==========================================
# 6-1. 유저 로그인 기록 조회 API (페이징 포함)
@app.get("/auth/history")
async def login_history(page: int = 1, size: int = 20):
    try:
        return get_login_history(page, size)
    except Exception as e:
        return {"error": str(e)}


# ==========================================
# 7. 사용자 관리 API (관리자 전용)
# ==========================================
class UserCreateRequest(BaseModel):
    user_id: str
    password: str
    user_nm: str
    role: str = "ROLE_USER"
    is_enable: str = "Y"

class UserUpdateRequest(BaseModel):
    user_nm: str | None = None
    role: str | None = None
    is_enable: str | None = None


# 7-1. 모든 사용자 조회 API (관리자 전용) => 페이징 포함 (26.01.23)
@app.get("/api/users")
async def api_get_users(request: Request, page: int = 1, size: int = 20, current_user: dict = Depends(get_current_user_jwt)):
    """모든 사용자 조회 (프론트엔드에서 관리자 체크 필요, 페이징 포함)."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    return get_all_users(page, size)

# 7-2. 새 사용자 생성 API (관리자 전용)
@app.post("/api/users")
async def api_create_user(req: UserCreateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """새 사용자 생성."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    if check_user_id(req.user_id):
        raise HTTPException(status_code=400, detail="User ID already exists")
    create_user(req.dict())
    return {"success": True}

# 7-3. 사용자 정보 수정 API (관리자 전용)
@app.put("/api/users/{user_id}")
async def api_update_user(user_id: str, req: UserUpdateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """사용자 정보 수정."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    update_user(user_id, req.dict(exclude_unset=True))
    return {"success": True}

# 7-4. 사용자 ID 존재 여부 확인 API (관리자 전용)
@app.get("/api/users/check/{user_id}")
async def api_check_user_id(user_id: str, current_user: dict = Depends(get_current_user_jwt)):
    """사용자 ID 존재 여부 확인."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"exists": check_user_id(user_id)}


# ==========================================
# 8. 로그 관리 API
# ==========================================
# 8-1. 로그 파일 목록 조회 API
@app.get("/logs")
async def get_logs_list():
    """수정 시간 내림차순으로 로그 파일 목록 반환."""
    try:
        files = [f for f in os.listdir(LOG_DIR) if f.endswith(".txt")]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(LOG_DIR, x)), reverse=True)
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}

# 8-2. 로그 파일 조회 API
@app.get("/logs/{filename}")
async def get_log_content(filename: str):
    """특정 로그 파일의 내용 반환."""
    file_path = os.path.join(LOG_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Log file not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return {"filename": filename, "content": f.read()}


# ==========================================
# 9. MCP Tool 사용 이력 조회 API
# ==========================================
# 9-1. MCP Tool 사용 이력 조회 API => 페이징 + 필터링 포함 (26.01.23)
@app.get("/api/mcp/usage-history")
async def get_usage_history(
    page: int = 1, 
    size: int = 20, 
    user_id: str | None = None,
    tool_nm: str | None = None,
    success: str | None = None,
    current_user: dict = Depends(get_current_user_jwt)
):
    """MCP Tool 사용 이력 조회 (관리자 전용, 필터링 포함)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    return get_tool_usage_logs(page, size, user_id, tool_nm, success)

# 9-2. 도구별 사용 통계 집계 데이터 반환 API => 대시보드에서 사용
@app.get("/api/mcp/stats")
async def get_dashboard_stats():
    """도구별 사용 통계 집계 데이터 반환."""
    try:
        from src.db import get_tool_stats
    except ImportError:
        from db import get_tool_stats
    return get_tool_stats()



# 10. 사용자 토큰 관리(h_user_token) 삭제 .. (2026.01.30)


# ==========================================
# 11. DB 스키마 및 데이터 관리
# -> {ROLE_ADMIN} 권한 필요
# ==========================================
try:
    from src.db import get_all_tables, get_table_schema, get_table_data
except ImportError:
    from db import get_all_tables, get_table_schema, get_table_data
# 11-1. 전체 테이블 목록 조회 API (관리자 전용)
@app.get("/api/db/tables")
async def api_get_tables(current_user: dict = Depends(get_current_user_jwt)):
    """전체 테이블 목록 조회 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    return {"tables": get_all_tables()}

# 11-2. 특정 테이블 스키마 조회 API (관리자 전용)
@app.get("/api/db/schema/{table_name}")
async def api_get_table_schema(table_name: str, current_user: dict = Depends(get_current_user_jwt)):
    """특정 테이블 스키마 조회 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        return {"columns": get_table_schema(table_name)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# 11-3. 특정 테이블 데이터 조회 API (관리자 전용)
@app.get("/api/db/data/{table_name}")
async def api_get_table_data(table_name: str, limit: int = 100, current_user: dict = Depends(get_current_user_jwt)):
    """특정 테이블 데이터 조회 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        return {"rows": get_table_data(table_name, limit)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==========================================
# 12. 사용량 제한 및 통계
# ==========================================
# 12-1. 각 개인 사용자별 잔여, 사용량 조회 API
@app.get("/api/mcp/my-usage")
async def api_get_my_usage(current_user: dict = Depends(get_current_user_jwt)):
    """내 금일 사용량 및 잔여 횟수 조회."""
    user = current_user
    
    usage = get_user_daily_usage(user['uid'])
    limit = get_user_limit(user['uid'], user['role'])
    
    remaining = -1 if limit == -1 else (limit - usage)
    if remaining < 0 and limit != -1: remaining = 0
    
    return {
        "user_id": user['user_id'],
        "usage": usage,
        "limit": limit,
        "remaining": remaining
    }

# 12-2. 관리자> 전체 사용자의 사용량 통계 조회 API
@app.get("/api/mcp/usage-stats")
async def api_get_usage_stats(current_user: dict = Depends(get_current_user_jwt)):
    """(관리자용) 전체 사용자 사용량 통계 조회."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    return get_admin_usage_stats()


# 12-3. 관리자> 제한 정책 관리 요청을 위한 DTO
class LimitUpsertRequest(BaseModel):
    target_type: str # 'USER' or 'ROLE'
    target_id: str
    max_count: int
    description: str | None = ""

# 12-4. 관리자> 제한 정책 목록 조회 API
@app.get("/api/mcp/limits")
async def api_get_limits(current_user: dict = Depends(get_current_user_jwt)):
    """제한 정책 목록 조회 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    return {"limits": get_limit_list()}

# 12-5. 관리자> 제한 정책 추가/수정 API
@app.post("/api/mcp/limits")
async def api_upsert_limit(req: LimitUpsertRequest, current_user: dict = Depends(get_current_user_jwt)):
    """제한 정책 추가/수정 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    upsert_limit(req.target_type, req.target_id, req.max_count, req.description)
    return {"success": True}

# 12-6. 관리자> 제한 정책 삭제 API
@app.delete("/api/mcp/limits/{limit_id}")
async def api_delete_limit(limit_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """제한 정책 삭제 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    delete_limit(limit_id)
    return {"success": True}


# ==========================================
# 13. 동적 Tool 관리 API
# ==========================================

class ToolParamCreateRequest(BaseModel):
    param_name: str
    param_type: str # STRING, NUMBER, BOOLEAN
    is_required: str = "Y"
    description: str | None = None

class CustomToolCreateRequest(BaseModel):
    name: str
    tool_type: str # SQL, PYTHON
    definition: str
    description_user: str | None = None


# ==========================================
# 14. 시스템 설정 관리 API
# ==========================================
class SystemConfigUpsertRequest(BaseModel):
    name: str # Renamed from conf_key
    configuration: str # Renamed from conf_value (JSON string)
    description: str | None = None
    
# 14-1. 설정 목록 조회 API (관리자 전용)
@app.get("/api/system/config")
async def api_get_configs(current_user: dict = Depends(get_current_user_jwt)):
    """시스템 설정 목록 조회 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    return {"configs": get_all_configs()}

# 14-2. 설정 추가/수정 API (관리자 전용)
@app.post("/api/system/config")
async def api_upsert_config(req: SystemConfigUpsertRequest, current_user: dict = Depends(get_current_user_jwt)):
    """시스템 설정 추가/수정 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    if not req.name or not req.configuration or not req.description:
         raise HTTPException(status_code=400, detail="All fields (name, configuration, description) are required.")

    # JSON Validation
    try:
        json.loads(req.configuration)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Configuration must be a valid JSON string.")

    try:
        set_config(req.name, req.configuration, req.description)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return {"success": True}

# 14-3. 설정 삭제 API (관리자 전용)
@app.delete("/api/system/config/{name}")
async def api_delete_config(name: str, current_user: dict = Depends(get_current_user_jwt)):
    """시스템 설정 삭제 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    delete_config(name)
    return {"success": True}
    description_agent: str | None = None
    params: list[ToolParamCreateRequest] = []

class CustomToolUpdateRequest(BaseModel):
    name: str
    tool_type: str
    definition: str
    description_user: str | None = None
    description_agent: str | None = None
    is_active: str = "Y"
    params: list[ToolParamCreateRequest] = []

# 13-1. 동적 Tool 목록 조회 > {ROLE_ADMIN} 권한만 가능
@app.get("/api/mcp/custom-tools")
async def api_get_custom_tools(current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 목록 조회 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    return get_all_tools()

# 13-2. 동적 Tool 상세 조회 > {ROLE_ADMIN} 권한만 가능
@app.get("/api/mcp/custom-tools/{tool_id}")
async def api_get_custom_tool_detail(tool_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 상세 조회 (파라미터 포함)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    tool = get_tool_by_id(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
        
    params = get_tool_params(tool_id)
    return {"tool": tool, "params": params}

# 13-3. 동적 Tool 생성 > {ROLE_ADMIN} 권한만 가능
@app.post("/api/mcp/custom-tools")
async def api_create_custom_tool(req: CustomToolCreateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 생성."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # 1. Tool 생성
        tool_id = create_tool(
            name=req.name,
            tool_type=req.tool_type,
            definition=req.definition,
            description_user=req.description_user or "",
            description_agent=req.description_agent or "",
            created_by=current_user['uid']
        )
        
        # 2. Params 생성
        for p in req.params:
            add_tool_param(
                tool_id=tool_id,
                param_name=p.param_name,
                param_type=p.param_type,
                is_required=p.is_required,
                description=p.description or ""
            )
            
        return {"success": True, "tool_id": tool_id}
    except Exception as e:
        logger.error(f"Failed to create custom tool: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 13-4. 동적 Tool 수정 > {ROLE_ADMIN} 권한만 가능
@app.put("/api/mcp/custom-tools/{tool_id}")
async def api_update_custom_tool(tool_id: int, req: CustomToolUpdateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 수정."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # 1. Tool 정보 수정
        update_tool(
            tool_id=tool_id,
            name=req.name,
            tool_type=req.tool_type,
            definition=req.definition,
            description_user=req.description_user or "",
            description_agent=req.description_agent or "",
            is_active=req.is_active
        )
        
        # 2. Params 재생성 (Clear & Add)
        clear_tool_params(tool_id)
        for p in req.params:
            add_tool_param(
                tool_id=tool_id,
                param_name=p.param_name,
                param_type=p.param_type,
                is_required=p.is_required,
                description=p.description or ""
            )
            
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update custom tool: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 13-5. 동적 Tool 삭제 > {ROLE_ADMIN} 권한만 가능
@app.delete("/api/mcp/custom-tools/{tool_id}")
async def api_delete_custom_tool(tool_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 삭제."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    delete_tool(tool_id)
    return {"success": True}

# 13-6. 동적 Tool 테스트 실행 > {ROLE_ADMIN} 권한만 가능
class ToolTestRequest(BaseModel):
    tool_type: str # SQL, PYTHON
    definition: str
    params: dict # 실행 파라미터 ({ "a": 1, "b": 2 })

# 13-7. 동적 Tool 테스트 실행 > {ROLE_ADMIN} 권한만 가능
@app.post("/api/mcp/custom-tools/test")
async def api_test_custom_tool(req: ToolTestRequest, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 로직 테스트 실행 (저장 전 확인용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        try:
            from src.tool_executor import execute_sql_tool, execute_python_tool
        except ImportError:
            from tool_executor import execute_sql_tool, execute_python_tool
        
        if req.tool_type == 'SQL':
            # SQL Injection 방지 등은 Executor 내부에서 처리 (여기서는 테스트이므로 Raw Error 반환 허용)
            result = await execute_sql_tool(req.definition, req.params)
            return {"success": True, "result": result}
            
        elif req.tool_type == 'PYTHON':
            result = await execute_python_tool(req.definition, req.params)
            return {"success": True, "result": result}
            
        else:
            raise HTTPException(status_code=400, detail="Unknown tool type")
            
    except Exception as e:
        return {"success": False, "error": str(e)}



# ==========================================
# 15. 메일 발송 API
# ==========================================
class EmailSendRequest(BaseModel):
    recipient: str
    subject: str
    content: str
    is_scheduled: bool = False
    scheduled_dt: str | None = None # YYYY-MM-DD HH:MM

# 15-1. 메일 발송 API
@app.post("/api/email/send")
async def api_send_email(req: EmailSendRequest, current_user: dict = Depends(get_current_user_jwt)):
    """메일 발송 요청 ( 즉시/예약 )"""
    # 1. 인증 체크 (Depends에서 처리됨)
    user = current_user

    # 2. DB 이력 저장 (PENDING)
    try:
        log_id = log_email(
            user_uid=user['uid'],
            recipient=req.recipient,
            subject=req.subject,
            content=req.content,
            is_scheduled=req.is_scheduled,
            scheduled_dt=req.scheduled_dt
        )
    except Exception as e:
        logger.error(f"Failed to log email: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # 3. 즉시 발송인 경우, 바로 발송 시도
    if not req.is_scheduled:
        sender = EmailSender()
        success, error_msg = sender.send_immediate(req.recipient, req.subject, req.content)
        
        # 결과 업데이트
        new_status = 'SENT' if success else 'FAILED'
        update_email_status(log_id, new_status, error_msg)
        
        if not success:
            return {"success": False, "log_id": log_id, "error": error_msg}
            
        return {"success": True, "log_id": log_id, "status": "SENT"}
    
    # 예약 발송인 경우: 스케줄러에 작업 등록
    try:
         try:
             from src.scheduler import add_scheduled_job
         except ImportError:
             from scheduler import add_scheduled_job
            
         logger.info("Scheduling email job for log_id: {}".format(log_id))
         add_scheduled_job(log_id, req.scheduled_dt)
         return {"success": True, "log_id": log_id, "status": "PENDING (Scheduled)"}
    except Exception as e:
         logger.error(f"Failed to schedule job: {e}")
         # 스케줄러 등록 실패해도 DB에는 PENDING 상태로 남아있으므로 Polling Job이 처리 가능
         return {"success": True, "log_id": log_id, "status": "PENDING (Scheduled, Job Add Failed)", "warning": str(e)}

# 15-2. 메일 발송 이력 조회 API
@app.get("/api/email/logs")
async def api_get_email_logs(limit: int = 100, current_user: dict = Depends(get_current_user_jwt)):
    """메일 발송 이력 조회"""
    # authenticated user
    user = current_user
        
    # 관리자는 전체 조회, 일반 유저는 본인 것만 조회? 
    # 요구사항에는 명시 없으나 일단 본인 것만 조회하도록 하거나, 
    # 관리자 기능으로 전체 조회를 허용할 수도 있음. 여기서는 관리자는 전체, 유저는 본인 것만 조회로 구현.
    target_uid = None
    if user['role'] != 'ROLE_ADMIN':
        target_uid = user['uid']
        
    logs = get_email_logs(limit, target_uid)
    return {"logs": logs}

# 15-3. 메일 발송 취소 API
@app.post("/api/email/cancel/{log_id}")
async def api_cancel_email(log_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """예약 메일 발송 취소"""
    user = current_user
        
    is_admin = user['role'] == 'ROLE_ADMIN'
    
    success, msg = cancel_email_log(log_id, user['uid'], is_admin)
    
    if not success:
        raise HTTPException(status_code=400, detail=msg)
        
    return {"success": True, "message": msg}


# ==========================================
# 16. 외부 접속 토큰 관리 API (h_access_token)
# ==========================================
class AccessTokenCreateRequest(BaseModel):
    name: str

# 16-1. 토큰 목록 조회 (관리자 전용)
@app.get("/api/access-tokens")
async def api_get_access_tokens(current_user: dict = Depends(get_current_user_jwt)):
    """외부 접속용 토큰 목록 조회."""
    if current_user['role'] != 'ROLE_ADMIN':
         raise HTTPException(status_code=403, detail="Admin access required")
    return {"tokens": get_all_access_tokens()}

# 16-2. 토큰 생성 (관리자 전용)
@app.post("/api/access-tokens")
async def api_create_access_token(req: AccessTokenCreateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """외부 접속용 토큰 생성."""
    if current_user['role'] != 'ROLE_ADMIN':
         raise HTTPException(status_code=403, detail="Admin access required")
    
    token = create_access_token(req.name)
    return {"success": True, "token": token}

# 16-3. 토큰 삭제 (관리자 전용)
@app.delete("/api/access-tokens/{token_id}")
async def api_delete_access_token(token_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """외부 접속용 토큰 삭제 (Soft Delete)."""
    if current_user['role'] != 'ROLE_ADMIN':
         raise HTTPException(status_code=403, detail="Admin access required")
    
    delete_access_token(token_id)
    return {"success": True}


# ==========================================
# 13. 연결 설정 및 정적 파일
# ==========================================
# 13-1. SSE & Static
# Vite 개발 서버를 위한 CORS 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 13-2. SSE
# /sse?token={token} 형태로 접근
# => {token} 없는 인증되지 않은 유저의 경우 Guest Mode로 처리
# => {token} 없는 유저여도 도구 목록 조회가능, but 도구 사용은 위에서 막힘
@app.get("/sse")
async def handle_sse(request: Request, token: str = Query(None)):
    print(f"*** SSE REQUEST RECEIVED. Token: {token} ***")
    try:
        # 13-2-1. Token 확인
        if token:
            print(f"*** SSE REQUEST RECEIVED. Token: {token} ***")
            try:
                # 1. JWT 토큰 검증 시도
                payload = None
                try:
                    payload = verify_token(token)
                except Exception:
                    # JWT 파싱 실패 시, 일반 Access Token으로 간주하고 계속 진행
                    payload = None

                if payload:
                     # JWT Valid
                     user_id = payload.get("sub")
                     user = get_user(user_id)
                     if user:
                         print(f"*** Token validation result: {user['user_id']} ({user['role']}) ***")
                     else:
                         print("*** User not found (JWT) ***")
                else:
                     # 2. h_access_token 검증 시도
                     access_token_data = get_access_token(token)
                     if access_token_data:
                         print(f"*** Valid Access Token Found: {access_token_data['name']} ***")
                         # 외부 접속용 토큰은 'external' 시스템 관리자 계정 권한으로 매핑
                         user = get_user('external')
                         if not user:
                             # 만약 external 유저가 없다면 admin으로 매핑하거나 에러 처리 (여기서는 Admin 매핑 시도)
                             user = get_user('admin')
                             print("*** 'external' user not found, fallback to 'admin' ***")
                     else:
                         print("*** TOKEN INVALID (Neither JWT nor AccessToken) ***")
                         user = None
            except Exception as e:
                print(f"*** Token validation error: {e} ***")
                logger.error(f"Token validation error: {e}")
                user = None

        # 13-2-2. 사용자 컨텍스트 설정 (User Context Setup)
        if user:
            # 비활성 계정 체크
            if dict(user).get('is_enable', 'Y') == 'N':
                 print("*** ACCOUNT DISABLED ***")
                 raise HTTPException(status_code=403, detail="Account is disabled")

            # ContextVar에 사용자 정보 저장 -> 이후 Tool 실행 시 get_current_user()로 접근 가능
            set_current_user(dict(user))
            logger.info(f"SSE Connected: {user['user_id']} ({user['role']})")
        else:
            # 토큰이 없거나 유효하지 않은 경우 -> Guest 모드로 접속 허용
            # (단, Tool 실행 시 인증 체크(call_tool)에서 막힘)
            print("*** Guest User Connected (No Token or Invalid) ***")
            logger.warning("SSE Connected: Unauthenticated (Guest)")
            # 컨텍스트 초기화 (이전 요청의 정보가 남지 않도록)
            clear_current_user()

        # 13-2-3. SSE 연결 및 MCP 프로토콜 실행
        # sse.connect_sse: ASGI 요청을 SSE 연결로 업그레이드하고, 입력/출력 스트림을 생성함
        try:
            print("*** Entering sse.connect_sse block ***")
            async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
                print("*** Entering mcp.run block ***")
                
                # mcp.run: MCP 프로토콜 루프 실행
                # - streams[0]: Read Stream (클라이언트 -> 서버 요청)
                # - streams[1]: Write Stream (서버 -> 클라이언트 응답)
                # - 연결이 끊어질 때까지 계속 실행됨
                await mcp.run(streams[0], streams[1], mcp.create_initialization_options())
                
                print("*** Exited mcp.run block (Connection Closed) ***")
        except Exception as e:
            print(f"*** SSE Error: {e} ***")
            logger.error(f"SSE Error: {str(e)}")
        finally:
            print("*** SSE Connection Finalized ***")
            
    except Exception as e:
        error_detail = f"SSE HANDLER EXCEPTION: {str(e)}"
        logger.error(error_detail, exc_info=True)  # 파일 로그에 스택트레이스 포함
        print(f"!!! {error_detail} !!!")
        import traceback
        traceback.print_exc()
        raise e

# 13-3. POST /messages
@app.post("/messages")
async def handle_messages(request: Request):
    await sse.handle_post_message(request.scope, request.receive, request._send)

# 13-4. React 빌드 파일 서빙 (우선순위: dist 먼저 확인)
static_dir = "src/frontend/dist"
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    if os.path.exists("src/web"):
        app.mount("/static", StaticFiles(directory="src/web"), name="static")
        @app.get("/")
        async def root(): return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    print("!!! STARTING ON PORT 8000 !!!")
    uvicorn.run(app, host="0.0.0.0", port=8000)
