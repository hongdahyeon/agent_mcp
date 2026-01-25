
from fastapi import FastAPI, Request, HTTPException, Header, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
import uvicorn
from mcp.server.sse import SseServerTransport
from mcp.server import Server
from mcp.types import Tool, TextContent
import logging
import os
from datetime import datetime
import sys
try:
    from src.utils.context import set_current_user, get_current_user, clear_current_user
except ImportError:
    from utils.context import set_current_user, get_current_user, clear_current_user

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
logger = logging.getLogger("mcp-server")
logger.setLevel(logging.INFO)
logger.propagate = False # Uvicorn이 로그를 중복 처리하지 않도록 설정

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
app = FastAPI()
mcp = Server("agent-mcp-sse")
sse = SseServerTransport("/messages")

@mcp.list_tools()
async def list_tools():
    return [
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
        # 관리자 전용: 사용자 토큰 이력 조회
        Tool(
            name="get_user_tokens",
            description="""
                [Admin Only] 특정 사용자의 토큰 발급 이력을 조회합니다.
                사용자의 ID(user_id)를 입력하면 발급된 토큰 목록과 활성(is_active), 만료일 정보를 반환합니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "조회할 사용자의 ID"}
                },
                "required": ["user_id"]
            }
        )
    ]

# 도구 실행시, 호출되는 함수
@mcp.call_tool()
async def call_tool(name: str, arguments: dict):
    # 파일 및 콘솔에 로그 기록
    log_msg = f"Tool execution requested: {name} with args {arguments}"
    logger.info(log_msg)
    print(f"[DEBUG] {log_msg}") # 콘솔 직접 출력 (fallback)
    
    try:
        from src.db_manager import get_user, log_tool_usage
    except ImportError:
        from db_manager import get_user, log_tool_usage

    # Context에서 사용자 정보 가져오기
    # => {token} 없는 인증되지 않은 유저의 경우 도구 실행 불가능
    current_user = get_current_user()
    if current_user:
        user_uid = current_user['uid']
        logger.info(f"Tool executed by authenticated user: {current_user['user_id']} ({current_user['role']})")
    else:
        # 인증되지 않은 사용자의 도구 실행 시도 -> 차단
        logger.warning("Tool execution blocked: Unauthenticated")
        return [TextContent(type="text", text="Error: Authentication required to execute tools. Please refresh token.")]
        
    tool_args = arguments.copy()
    # 혹시라도 클라이언트가 보냈을 _user_uid가 있다면 제거 (Clean args)
    if "_user_uid" in tool_args:
            del tool_args["_user_uid"]

    try:
        result_val = ""
        
        # ---------------------------------------------------------
        # 1. get_user_info (우선순위 높임 + 포함 여부 확인)
        # ---------------------------------------------------------
        if "get_user_info" in name:
            logger.info(f"DEBUG: Entered get_user_info block (Matched '{name}')")

            # 권한 체크 (Admin Only)
            if not current_user or current_user.get('role') != 'ROLE_ADMIN':
                result_val = "Error: Admin privileges required for this tool"
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
                    result_val = str(user_dict)
                    is_success = True
            
            logger.info(f"Tool execution: {name} -> success={is_success}")
            
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), is_success, result_val)
                
            return [TextContent(type="text", text=result_val)]

        # ---------------------------------------------------------
        # 2. get_user_tokens (Admin Only)
        # ---------------------------------------------------------
        if name == "get_user_tokens":
            # 권한 체크
            if not current_user or current_user.get('role') != 'ROLE_ADMIN':
                 result_val = "Error: Admin privileges required for this tool"
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
                    result_val = str(tokens)
                    is_success = True

            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), is_success, result_val)
            
            return [TextContent(type="text", text=result_val)]
            
        # ---------------------------------------------------------
        # 3. Other Tools
        # ---------------------------------------------------------
        if name == "add":
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a + b) # 정상 복구
            
            logger.info(f"Tool execution success: {name} -> {result_val}")
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), True, result_val)
                
            return [TextContent(type="text", text=result_val)]
            
        elif name == "subtract":
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a - b)
            
            logger.info(f"Tool execution success: {name} -> {result_val}")
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
                        from src.db_manager import log_tool_usage
                    except ImportError:
                        from db_manager import log_tool_usage
                    log_tool_usage(user_uid, name, str(tool_args), False, str(e))
                except:
                    pass
                
        # raise e 대신 에러 메시지 리턴으로 변경 (서버 크래시 방지)
        return [TextContent(type="text", text=f"Error: {str(e)}")]


# ==========================================
# 3. 로그 뷰어 및 인증 API
# ==========================================

try:
    from src.db_init_manager import init_db
    from src.db_manager import (
        get_user, verify_password, log_login_attempt, get_login_history,
        get_all_users, create_user, update_user, check_user_id, log_tool_usage,
        get_tool_usage_logs, create_user_token, get_user_token, get_user_by_active_token,
        get_all_user_tokens
    )
except ImportError:
    from db_init_manager import init_db
    from db_manager import (
        get_user, verify_password, log_login_attempt, get_login_history,
        get_all_users, create_user, update_user, check_user_id, log_tool_usage,
        get_tool_usage_logs, create_user_token, get_user_token, get_user_by_active_token,
        get_all_user_tokens
    )
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# 시작 시 데이터베이스 초기화
try:
    init_db()
    logger.info("Database initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    print(f"!!! DB INIT FAILED: {e} !!!")

class LoginRequest(BaseModel):
    user_id: str
    password: str

@app.post("/auth/login")
async def login(req: LoginRequest, request: Request):
    """로그인 처리 및 이력 기록."""
    if not req.user_id or not req.password:
        raise HTTPException(status_code=400, detail="Missing credentials")

    # 사용자 조회
    user = get_user(req.user_id)
    ip_addr = request.client.host
    if user and verify_password(req.password, user['password']):
        if dict(user).get('is_enable', 'Y') == 'N':
            log_login_attempt(user['uid'], ip_addr, False, "Account Disabled")
            raise HTTPException(status_code=403, detail="Account is disabled")
        log_login_attempt(user['uid'], ip_addr, True, "Login Successful")
        return {"success": True, "user": {"uid": user['uid'], "user_id": user['user_id'], "user_nm": user['user_nm'], "role": user['role']}}
    else:
        user_uid = user['uid'] if user else None
        log_login_attempt(user_uid, ip_addr, False, "Invalid Credentials")
        raise HTTPException(status_code=401, detail="Invalid credentials")

#  유저 로그인 기록 조회
# => 페이징 포함 (26.01.23)
@app.get("/auth/history")
async def login_history(page: int = 1, size: int = 20):
    try:
        return get_login_history(page, size)
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# 4. 사용자 관리 API (관리자 전용)
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

# 모든 사용자 조회
# => 페이징 포함 (26.01.23)
@app.get("/api/users")
async def api_get_users(request: Request, page: int = 1, size: int = 20):
    """모든 사용자 조회 (프론트엔드에서 관리자 체크 필요, 페이징 포함)."""
    return get_all_users(page, size)

@app.post("/api/users")
async def api_create_user(req: UserCreateRequest):
    """새 사용자 생성."""
    if check_user_id(req.user_id):
        raise HTTPException(status_code=400, detail="User ID already exists")
    create_user(req.dict())
    return {"success": True}

@app.put("/api/users/{user_id}")
async def api_update_user(user_id: str, req: UserUpdateRequest):
    """사용자 정보 수정."""
    update_user(user_id, req.dict(exclude_unset=True))
    return {"success": True}

@app.get("/api/users/check/{user_id}")
async def api_check_user_id(user_id: str):
    """사용자 ID 존재 여부 확인."""
    return {"exists": check_user_id(user_id)}

@app.get("/logs")
async def get_logs_list():
    """수정 시간 내림차순으로 로그 파일 목록 반환."""
    try:
        files = [f for f in os.listdir(LOG_DIR) if f.endswith(".txt")]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(LOG_DIR, x)), reverse=True)
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}

@app.get("/logs/{filename}")
async def get_log_content(filename: str):
    """특정 로그 파일의 내용 반환."""
    file_path = os.path.join(LOG_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Log file not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return {"filename": filename, "content": f.read()}

# MCP Tool 사용 이력 조회
# => 페이징 + 필터링 포함 (26.01.23)
@app.get("/api/mcp/usage-history")
async def get_usage_history(
    page: int = 1, 
    size: int = 20, 
    user_id: str | None = None,
    tool_nm: str | None = None,
    success: str | None = None,
    x_user_id: str | None = Header(default=None, alias="X-User-Id")
):
    """MCP Tool 사용 이력 조회 (관리자 전용, 필터링 포함)."""
    if not x_user_id: raise HTTPException(status_code=401, detail="Missing User ID header")
    user = get_user(x_user_id)
    if not user or user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    return get_tool_usage_logs(page, size, user_id, tool_nm, success)

# 도구별 사용 통계 집계 데이터 반환
# => 대시보드에서 사용
@app.get("/api/mcp/stats")
async def get_dashboard_stats():
    """도구별 사용 통계 집계 데이터 반환."""
    try:
        from src.db_manager import get_tool_stats
    except ImportError:
        from db_manager import get_tool_stats
    return get_tool_stats()




# ==========================================
# >> 사용자 토큰 관리 (Phase 1)
# ==========================================
@app.post("/api/user/token")
async def api_create_token(x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    """사용자 토큰 생성/재발급."""
    if not x_user_id: raise HTTPException(status_code=401, detail="Missing User ID header")
    user = get_user(x_user_id)
    if not user: raise HTTPException(status_code=401, detail="User not found")
    
    token = create_user_token(user['uid'])
    return {"success": True, "token": token}

@app.get("/api/user/token")
async def api_get_token(x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    """사용자 현재 토큰 조회."""
    if not x_user_id: raise HTTPException(status_code=401, detail="Missing User ID header")
    user = get_user(x_user_id)
    if not user: raise HTTPException(status_code=401, detail="User not found")
    
    token_data = get_user_token(user['uid'])
    if token_data:
        return {"exists": True, "token": token_data['token_value'], "expired_at": token_data['expired_at']}
    else:
        return {"exists": False}


# ==========================================
# 5. DB 스키마 및 데이터 관리 API (관리자 전용) (New)
# ==========================================
try:
    from src.db_manager import get_all_tables, get_table_schema, get_table_data
except ImportError:
    from db_manager import get_all_tables, get_table_schema, get_table_data

@app.get("/api/db/tables")
async def api_get_tables(x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    """전체 테이블 목록 조회 (Auth Disabled)."""
    # if not x_user_id: raise HTTPException(status_code=401, detail="Missing User ID header")
    # user = get_user(x_user_id)
    # if not user or user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    return {"tables": get_all_tables()}

@app.get("/api/db/schema/{table_name}")
async def api_get_table_schema(table_name: str, x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    """특정 테이블 스키마 조회 (Auth Disabled)."""
    # if not x_user_id: raise HTTPException(status_code=401, detail="Missing User ID header")
    # user = get_user(x_user_id)
    # if not user or user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        return {"columns": get_table_schema(table_name)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/db/data/{table_name}")
async def api_get_table_data(table_name: str, limit: int = 100, x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    """특정 테이블 데이터 조회 (Auth Disabled)."""
    # if not x_user_id: raise HTTPException(status_code=401, detail="Missing User ID header")
    # user = get_user(x_user_id)
    # if not user or user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        return {"rows": get_table_data(table_name, limit)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==========================================
# 4. 연결 설정 및 정적 파일
# ==========================================

# SSE & Static
# Vite 개발 서버를 위한 CORS 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# /sse?token={token} 형태로 접근
# => {token} 없는 인증되지 않은 유저의 경우 Guest Mode로 처리
# => {token} 없는 유저여도 도구 목록 조회가능, but 도구 사용은 위에서 막힘
@app.get("/sse")
async def handle_sse(request: Request, token: str = Query(None)):
    print(f"*** SSE REQUEST RECEIVED. Token: {token} ***")
    try:
        if token:
            print(f"*** Validating token: {token} ***")
            user = get_user_by_active_token(token)
            print(f"*** Token validation result: {user} ***")
            
            if not user:
                logger.warning(f"SSE Connection Failed: Invalid or Expired Token ({token})")
                print("*** TOKEN INVALID ***")
                raise HTTPException(status_code=401, detail="Invalid or Expired Token")
            
            if user.get('is_enable') == 'N':
                 logger.warning(f"SSE Connection Failed: Account Disabled ({user['user_id']})")
                 print("*** ACCOUNT DISABLED ***")
                 raise HTTPException(status_code=403, detail="Account is disabled")

            set_current_user(user)
            logger.info(f"SSE Connected: {user['user_id']} ({user['role']})")
        else:
            logger.info("SSE Connected without Token (Guest or Inspector usually does this)")
            print("*** SSE Connect without Token (Guest Mode) ***")
            pass

        print("*** Entering sse.connect_sse block ***")
        async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
            print("*** Entering mcp.run block ***")
            await mcp.run(streams[0], streams[1], mcp.create_initialization_options())
            print("*** Exited mcp.run block (Connection Closed) ***")
            
    except Exception as e:
        error_detail = f"SSE HANDLER EXCEPTION: {str(e)}"
        logger.error(error_detail, exc_info=True)  # 파일 로그에 스택트레이스 포함
        print(f"!!! {error_detail} !!!")
        import traceback
        traceback.print_exc()
        raise e

@app.post("/messages")
async def handle_messages(request: Request):
    await sse.handle_post_message(request.scope, request.receive, request._send)

# React 빌드 파일 서빙 (우선순위: dist 먼저 확인)
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
