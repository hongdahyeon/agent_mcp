
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
import uvicorn
from mcp.server.sse import SseServerTransport
from mcp.server import Server
from mcp.types import Tool, TextContent
import logging
import os
from datetime import datetime

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
        )
    ]

@mcp.call_tool()
async def call_tool(name: str, arguments: dict):
    # 파일 및 콘솔에 로그 기록
    log_msg = f"Tool execution requested: {name} with args {arguments}"
    logger.info(log_msg)
    print(f"[DEBUG] {log_msg}") # 콘솔 직접 출력 (fallback)
    
    try:
        if name == "add":
            a = arguments.get("a", 0)
            b = arguments.get("b", 0)
            result = str(a + b)
            
            success_msg = f"Tool execution success: {name} -> {result}"
            logger.info(success_msg)
            return [TextContent(type="text", text=result)]
            
        elif name == "subtract":
            a = arguments.get("a", 0)
            b = arguments.get("b", 0)
            result = str(a - b)
            
            success_msg = f"Tool execution success: {name} -> {result}"
            logger.info(success_msg)
            return [TextContent(type="text", text=result)]
            
        elif name == "hellouser":
            user_name = arguments.get("name", "User")
            result = f"Hello {user_name}"
            
            success_msg = f"Tool execution success: {name} -> {result}"
            logger.info(success_msg)
            return [TextContent(type="text", text=result)]
            
        raise ValueError(f"Unknown tool: {name}")
    
    except Exception as e:
        error_msg = f"Tool execution failed: {name} - {str(e)}"
        logger.error(error_msg)
        print(f"[ERROR] {error_msg}")
        raise e


# ==========================================
# 3. Log Viewer API (Requirement #4)
# ==========================================

# ==========================================
# 3. 로그 뷰어 및 인증 API
# ==========================================

try:
    from src.db_manager import (
        init_db, get_user, verify_password, log_login_attempt, get_login_history,
        get_all_users, create_user, update_user, check_user_id
    )
except ImportError:
    from db_manager import (
        init_db, get_user, verify_password, log_login_attempt, get_login_history,
        get_all_users, create_user, update_user, check_user_id
    )

from pydantic import BaseModel

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
        # 계정 상태 확인
        # 컬럼/마이그레이션 이슈 대비 .get() 기본값 'Y' 사용
        if dict(user).get('is_enable', 'Y') == 'N':
            log_login_attempt(user['uid'], ip_addr, False, "Account Disabled")
            logger.warning(f"Login failed (Disabled): {req.user_id} from {ip_addr}")
            raise HTTPException(status_code=403, detail="Account is disabled")

        # 성공
        log_login_attempt(user['uid'], ip_addr, True, "Login Successful")
        logger.info(f"Login success: {req.user_id} from {ip_addr}")
        
        return {
            "success": True,
            "user": {
                "user_id": user['user_id'],
                "user_nm": user['user_nm'],
                "role": user['role']
            }
        }
    else:
        # 실패
        user_uid = user['uid'] if user else None
        log_login_attempt(user_uid, ip_addr, False, "Invalid Credentials")
        logger.warning(f"Login failed: {req.user_id} from {ip_addr}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/auth/history")
async def login_history():
    """최근 로그인 이력 조회."""
    try:
        history = get_login_history(50)
        return {"history": history}
    except Exception as e:
        logger.error(f"Failed to fetch login history: {e}")
        return {"error": str(e)}

# ==========================================
# 사용자 관리 API (관리자 전용)
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

@app.get("/api/users")
async def api_get_users(request: Request):
    """모든 사용자 조회 (프론트엔드에서 관리자 체크 필요, 여기서는 목록 반환)."""
    # 실제 환경에서는 세션/토큰 확인 필요
    try:
        users = get_all_users()
        return {"users": users}
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users")
async def api_create_user(req: UserCreateRequest):
    """새 사용자 생성."""
    try:
        if check_user_id(req.user_id):
            raise HTTPException(status_code=400, detail="User ID already exists")
            
        create_user(req.dict())
        logger.info(f"User created: {req.user_id}")
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/users/{user_id}")
async def api_update_user(user_id: str, req: UserUpdateRequest):
    """사용자 정보 수정."""
    try:
        update_user(user_id, req.dict(exclude_unset=True))
        logger.info(f"User updated: {user_id}")
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/check/{user_id}")
async def api_check_user_id(user_id: str):
    """사용자 ID 존재 여부 확인."""
    exists = check_user_id(user_id)
    return {"exists": exists}

@app.get("/logs")
async def get_logs_list():
    """수정 시간 내림차순으로 로그 파일 목록 반환."""
    try:
        files = [f for f in os.listdir(LOG_DIR) if f.endswith(".txt")]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(LOG_DIR, x)), reverse=True)
        return {"files": files}
    except Exception as e:
        logger.error(f"Failed to list log files: {e}")
        return {"error": str(e)}

@app.get("/logs/{filename}")
async def get_log_content(filename: str):
    """특정 로그 파일의 내용 반환."""
    file_path = os.path.join(LOG_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Log file not found")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"filename": filename, "content": content}
    except Exception as e:
        logger.error(f"Failed to read log file {filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ==========================================
# 4. 연결 설정 및 정적 파일
# ==========================================

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Vite 개발 서버를 위한 CORS 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite Dev Server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/sse")
async def handle_sse(request: Request):
    logger.info(f"New SSE connection request from {request.client.host}")
    async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
        await mcp.run(
            streams[0], 
            streams[1], 
            mcp.create_initialization_options()
        )

@app.post("/messages")
async def handle_messages(request: Request):
    await sse.handle_post_message(request.scope, request.receive, request._send)

# React 빌드 파일 서빙 (우선순위: dist 먼저 확인)
static_dir = "src/frontend/dist"
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
    logger.info(f"Serving React static files from {static_dir}")
else:
    # 이전 웹 인터페이스 폴백 또는 경고
    logger.warning(f"React 빌드 디렉토리를 찾을 수 없습니다: {static_dir}. src/frontend 에서 'npm run build'를 실행하세요.")
    if os.path.exists("src/web"):
         app.mount("/static", StaticFiles(directory="src/web"), name="static")
         @app.get("/")
         async def root():
             return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
