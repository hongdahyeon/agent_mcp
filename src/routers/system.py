from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
import json
import os
try:
    from src.db import (
        get_all_configs, get_config_value, set_config, delete_config,
        get_all_tables, get_table_schema, get_table_data
    )
    from src.dependencies import get_current_user_jwt
except ImportError:
    from db import (
        get_all_configs, get_config_value, set_config, delete_config,
        get_all_tables, get_table_schema, get_table_data
    )
    from dependencies import get_current_user_jwt

"""
    설정, db 관리, 로그 파일
"""

router = APIRouter(tags=["system"])

# --- System Config ---
class SystemConfigUpsertRequest(BaseModel):
    name: str
    configuration: str
    description: str | None = None

# 설정 목록 조회
@router.get("/api/system/config")
async def api_get_configs(
    page: int = 1,
    size: int = 20,
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    return get_all_configs(page, size)

# 설정 추가/수정
@router.post("/api/system/config")
async def api_upsert_config(req: SystemConfigUpsertRequest, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    if not req.name or not req.configuration or not req.description:
         raise HTTPException(status_code=400, detail="All fields (name, configuration, description) are required.")
    try:
        json.loads(req.configuration)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Configuration must be a valid JSON string.")
    try:
        set_config(req.name, req.configuration, req.description)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"success": True}

# 설정 삭제
@router.delete("/api/system/config/{name}")
async def api_delete_config(name: str, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    delete_config(name)
    return {"success": True}


# --- DB Inspector ---
# 테이블 목록 조회
@router.get("/api/db/tables")
async def api_get_tables(current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    return {"tables": get_all_tables()}

# 테이블 스키마 조회
@router.get("/api/db/schema/{table_name}")
async def api_get_table_schema(table_name: str, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    try:
        return {"columns": get_table_schema(table_name)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# 테이블 데이터 조회
@router.get("/api/db/data/{table_name}")
async def api_get_table_data(
    table_name: str, 
    page: int = 1, 
    size: int = 100, 
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    offset = (page - 1) * size
    try:
        rows, total = get_table_data(table_name, limit=size, offset=offset)
        return {
            "rows": rows,
            "total": total,
            "page": page,
            "size": size
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Server Logs ---
LOG_DIR = "logs"

# 로그 파일 목록 조회
@router.get("/logs")
async def get_logs_list():
    try:
        files = [f for f in os.listdir(LOG_DIR) if f.endswith(".txt")]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(LOG_DIR, x)), reverse=True)
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}

# 로그 파일 내용 조회
@router.get("/logs/{filename}")
async def get_log_content(filename: str):
    file_path = os.path.join(LOG_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Log file not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return {"filename": filename, "content": f.read()}

# --- System Health & Scheduler ---

# api_get_health: 시스템 헬스 체크
@router.get("/api/system/health")
async def api_get_health(current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    health = {"db": "OK", "smtp": "OK", "scheduler": "OFF"}
    # 1. DB Check
    try:
        from src.db.connection import get_db_connection
        conn = get_db_connection()
        conn.execute("SELECT 1")
        conn.close()
    except Exception: health["db"] = "ERROR"
    # 2. SMTP Check
    try:
        from src.utils.mailer import EmailSender
        sender = EmailSender()
        success, _ = sender.check_smtp_connection()
        if not success: health["smtp"] = "ERROR"
    except Exception: health["smtp"] = "ERROR"
    # 3. Scheduler Check
    try:
        from src.scheduler import scheduler
        if scheduler.running: health["scheduler"] = "ON"
    except Exception: health["scheduler"] = "ERROR"
    return health

# 스케줄러에 등록된 작업 목록 조회
@router.get("/api/system/scheduler/jobs")
async def api_get_scheduler_jobs(current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.scheduler import get_scheduler_jobs
    return {"jobs": get_scheduler_jobs()}

# 스케줄러 제어
@router.post("/api/system/scheduler/control")
async def api_control_scheduler(action: str = Query(...), current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.scheduler import start_scheduler, shutdown_scheduler, scheduler
    try:
        if action == "start":
            if not scheduler.running: start_scheduler()
        elif action == "stop":
            if scheduler.running: shutdown_scheduler()
        return {"success": True, "running": scheduler.running}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 스케줄러 작업 삭제
@router.delete("/api/system/scheduler/jobs/{job_id}")
async def api_delete_scheduler_job(job_id: str, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.scheduler import scheduler
    try:
        scheduler.remove_job(job_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Job not found or error: {str(e)}")
