from fastapi import FastAPI, Request, HTTPException, Query, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from mcp.server.sse import SseServerTransport
import uvicorn
import logging
import os
import sys

# 프로젝트 루트를 sys.path에 추가하여 'src' 모듈을 찾을 수 있게 합니다.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.init_manager import init_db
from src.mcp_server_impl import mcp
from src.scheduler import start_scheduler, shutdown_scheduler
from src.utils.auth import verify_token
from src.db import get_user, get_access_token
from src.utils.context import set_current_user, clear_current_user
# Include Routers
from src.routers import auth, users, mcp as mcp_router, system, email, files, openapi, execution

"""
    - routers/*.py
    - mcp_server_impl.py
    - dependencies.py
    
    1. 앱 초기화
    2. 라우터 포함
    3. SSE 핸들러
"""

# ==========================================
# 1. 로깅 설정
# ==========================================
import datetime
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
current_time = datetime.datetime.now().strftime("%Y-%m-%d")
log_filename = f"{LOG_DIR}/{current_time}.txt"

logger = logging.getLogger() 
logger.setLevel(logging.INFO)
logging.getLogger('apscheduler').setLevel(logging.WARNING)

if logger.handlers: logger.handlers.clear()
file_handler = logging.FileHandler(log_filename, encoding='utf-8', mode='a')
file_handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s'))
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s'))
logger.addHandler(file_handler)
logger.addHandler(stream_handler)
logger.info(f"Server started. Log file: {log_filename}")

# ==========================================
# 2. Server Init
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        logger.info("Database initialized.")
        start_scheduler()
    except Exception as e:
        logger.error(f"Startup error: {e}")
    yield
    try:
        shutdown_scheduler()
    except Exception as e:
        logger.error(f"Shutdown error: {e}")

app = FastAPI(lifespan=lifespan)
sse = SseServerTransport("/messages")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. Include Routers
# ==========================================
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(mcp_router.router)
app.include_router(system.router)
app.include_router(email.router)
app.include_router(files.router)
app.include_router(openapi.router)
app.include_router(execution.router)

# ==========================================
# 4. SSE Handler (Integrated)
# ==========================================
@app.get("/sse")
async def handle_sse(request: Request, token: str = Query(None)):
    print(f"*** SSE REQUEST RECEIVED. Token: {token} ***")
    try:
        if token:
            try:
                # 1. JWT Check
                payload = None
                try:
                    payload = verify_token(token)
                except Exception:
                    payload = None

                if payload:
                     user_id = payload.get("sub")
                     user = get_user(user_id)
                     if user: print(f"*** Valid JWT: {user['user_id']} ***")
                else:
                     # 2. Access Token Check
                     access_token_data = get_access_token(token)
                     if access_token_data:
                         print(f"*** Valid Access Token: {access_token_data['name']} ***")
                         user = get_user('external')
                         if not user: user = get_user('admin')
                     else:
                         user = None
            except Exception as e:
                logger.error(f"Token validation error: {e}")
                user = None
        else:
            user = None

        if user:
            if dict(user).get('is_enable', 'Y') == 'N':
                 raise HTTPException(status_code=403, detail="Account is disabled")
            set_current_user(dict(user))
            logger.info(f"SSE Connected: {user['user_id']}")
        else:
            # TODO: 토큰이 유효하지 않은 경우, 프론트엔드에서 적절한 처리를 할 수 있도록 응답을 반환해야 함
            logger.warning("Connection attempt without valid token - Access Denied")
            raise HTTPException(status_code=401, detail="Authentication required. Please provide a valid token.")

        async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
            await mcp.run(streams[0], streams[1], mcp.create_initialization_options())
            
    except Exception as e:
        logger.error(f"SSE Error: {e}")
        import traceback
        traceback.print_exc()
        raise e

""" 
    # 'FastAPI가 이미 완료된 요청에 대해 중복으로 응답을 보내려다 에러가 나는 것을 막기 위한 "가짜 응답 객체'
    - /messages POST 요청을 받아서 SSE로 전달
    - NoOpResponse를 사용하여 중복 응답 방지
    - 상황
        (1) sse.handle_post_message 함수가 실행되면서 이미 client에게 응답(202)을 보냄
        (2) 문제
            - FastAPI는 기본적으로 모든 라우터 함수가 끝나면 응답을 보내려고 함
            - 이 때, 이미 SSE가 응답을 보냈기 때문에 중복 응답이 발생하여 에러가 남
        (3) 해결
            이를 방지하기 위해 NoOpResponse를 사용하여 중복 응답을 방지
"""
class NoOpResponse(Response):
    def __init__(self):
        super().__init__()
    
    async def __call__(self, scope, receive, send):
        # Do not send anything, assuming sse.handle_post_message already handled the response
        pass

@app.post("/messages")
async def handle_messages(request: Request):
    await sse.handle_post_message(request.scope, request.receive, request._send)
    return NoOpResponse()

# ==========================================
# 5. Static Files
# ==========================================
static_dir = "src/frontend/dist"
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    if os.path.exists("src/web"):
        app.mount("/static", StaticFiles(directory="src/web"), name="static")
        @app.get("/")
        async def root(): return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
