
from fastapi import FastAPI, Request, HTTPException, Header
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
            description="Greet the user",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string"}
                },
                "required": ["name"]
            }
        ),
        # DB 연동: 사용자 정보 조회 도구 추가
        Tool(
            name="get_user_info",
            description="Get user details by user_id (excluding password)",
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"}
                },
                "required": ["user_id"]
            }
        )
    ]

@mcp.call_tool()
async def call_tool(name: str, arguments: dict):
    # 파일 및 콘솔에 로그 기록
    log_msg = f"Tool execution requested: {name} with args {arguments}"
    logger.info(log_msg)
    print(f"[DEBUG] {log_msg}") # 콘솔 직접 출력 (fallback)
    
    # 사용자 식별 (Frontend에서 _user_uid 전달 가정)
    user_uid = arguments.get("_user_uid")
    print(f">>arguments: {arguments}")
    # 실제 Tool 인자에서 _user_uid 제거 (Tool 로직에 방해되지 않도록 cleaning)
    tool_args = arguments.copy()
    if "_user_uid" in tool_args:
        del tool_args["_user_uid"]
        
    try:
        result_val = ""
        
        # ---------------------------------------------------------
        # 0. Import Logic (Handling src.db_manager vs db_manager)
        # ---------------------------------------------------------
        try:
            from src.db_manager import get_user, log_tool_usage
        except ImportError:
            from db_manager import get_user, log_tool_usage

        # ---------------------------------------------------------
        # 1. get_user_info (우선순위 높임 + 포함 여부 확인)
        # ---------------------------------------------------------
        if "get_user_info" in name:
            logger.info(f"DEBUG: Entered get_user_info block (Matched '{name}')")
            
            target_id = tool_args.get("user_id")
            if not target_id:
                raise ValueError("Missing user_id parameter")
            
            user = get_user(target_id)
            if not user:
                result_val = f"User not found with ID: {target_id}"
            else:
                user_dict = dict(user)
                if 'password' in user_dict:
                    del user_dict['password']
                result_val = str(user_dict)
            
            success_msg = f"Tool execution success: {name} -> found"
            logger.info(success_msg)
            
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), True, result_val)
                
            return [TextContent(type="text", text=result_val)]
            
        # ---------------------------------------------------------
        # 2. Other Tools
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
             # Try import again in except block if needed, but usually redundant if 'try' block succeeded
             try:
                try:
                    from src.db_manager import log_tool_usage
                except ImportError:
                    from db_manager import log_tool_usage
                log_tool_usage(user_uid, name, str(tool_args), False, str(e))
             except:
                pass
             
        raise e


# ==========================================
# 3. 로그 뷰어 및 인증 API
# ==========================================

try:
    from src.db_manager import (
        init_db, get_user, verify_password, log_login_attempt, get_login_history,
        get_all_users, create_user, update_user, check_user_id, log_tool_usage,
        get_tool_usage_logs
    )
except ImportError:
    from db_manager import (
        init_db, get_user, verify_password, log_login_attempt, get_login_history,
        get_all_users, create_user, update_user, check_user_id, log_tool_usage,
        get_tool_usage_logs
    )
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# 시작 시 데이터베이스 초기화
init_db()

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


# ==========================================
# 4. 연결 설정 및 정적 파일
# ==========================================

# SSE & Static
# Vite 개발 서버를 위한 CORS 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/sse")
async def handle_sse(request: Request):
    async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
        await mcp.run(streams[0], streams[1], mcp.create_initialization_options())

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
