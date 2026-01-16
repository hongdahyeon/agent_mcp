
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
# 1. Logging Setup (Requirement: logs/yyyy-mm-dd-hh:mm.txt)
# ==========================================
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Generate filename based on startup time
current_time = datetime.now().strftime("%Y-%m-%d")
log_filename = f"{LOG_DIR}/{current_time}.txt"

# Configure logging - Attach handlers directly to our logger to ensure they persist
logger = logging.getLogger("mcp-server")
logger.setLevel(logging.INFO)
logger.propagate = False # Prevent Uvicorn from handling/suppressing these logs

# Create handlers
# buffering=1 means line buffered
file_handler = logging.FileHandler(log_filename, encoding='utf-8', mode='a')
file_handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s'))

stream_handler = logging.StreamHandler()
stream_handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s'))

# Add handlers
# Force clear existing handlers to handle Uvicorn hot-reloads causing stale handlers
if logger.handlers:
    logger.handlers.clear()

logger.addHandler(file_handler)
logger.addHandler(stream_handler)

logger.info(f"Server started. Log file: {log_filename}")


# ==========================================
# 2. Initialize MCP Server
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
        # Hellouser Tool Added
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
    # Log to file and console
    log_msg = f"Tool execution requested: {name} with args {arguments}"
    logger.info(log_msg)
    print(f"[DEBUG] {log_msg}") # Direct console fallback
    
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
# 3. Log Viewer & Auth API
# ==========================================

try:
    from src.db_manager import init_db, get_user, verify_password, log_login_attempt, get_login_history
except ImportError:
    from db_manager import init_db, get_user, verify_password, log_login_attempt, get_login_history

from pydantic import BaseModel

# Initialize Database on startup
init_db()

class LoginRequest(BaseModel):
    user_id: str
    password: str

@app.post("/auth/login")
async def login(req: LoginRequest, request: Request):
    """Handle login and log history."""
    if not req.user_id or not req.password:
        raise HTTPException(status_code=400, detail="Missing credentials")

    # Get user
    user = get_user(req.user_id)
    ip_addr = request.client.host

    if user and verify_password(req.password, user['password']):
        # Success
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
        # Failure
        user_uid = user['uid'] if user else None
        log_login_attempt(user_uid, ip_addr, False, "Invalid Credentials")
        logger.warning(f"Login failed: {req.user_id} from {ip_addr}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/auth/history")
async def login_history():
    """Get recent login history."""
    try:
        history = get_login_history(50)
        return {"history": history}
    except Exception as e:
        logger.error(f"Failed to fetch login history: {e}")
        return {"error": str(e)}

@app.get("/logs")
async def get_logs_list():
    """Returns a list of log files sorted by modification time (descending)."""
    try:
        files = [f for f in os.listdir(LOG_DIR) if f.endswith(".txt")]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(LOG_DIR, x)), reverse=True)
        return {"files": files}
    except Exception as e:
        logger.error(f"Failed to list log files: {e}")
        return {"error": str(e)}

@app.get("/logs/{filename}")
async def get_log_content(filename: str):
    """Returns the content of a specific log file."""
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
# 4. Connection Setup & Static Files
# ==========================================

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add CORS for Vite Dev Server
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

# Serve React Build Files (Priority: Check dist first)
static_dir = "src/frontend/dist"
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
    logger.info(f"Serving React static files from {static_dir}")
else:
    # Fallback to old web interface or warning
    logger.warning(f"React build directory not found at {static_dir}. Run 'npm run build' in src/frontend.")
    if os.path.exists("src/web"):
         app.mount("/static", StaticFiles(directory="src/web"), name="static")
         @app.get("/")
         async def root():
             return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
