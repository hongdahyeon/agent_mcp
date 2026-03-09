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
# (기존) logs 하위 .txt 파일 조회
# (변경) logs 하위 .txt, .zip 파일 조회
@router.get("/logs")
async def get_logs_list(
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        from datetime import datetime
        today_str = datetime.now().strftime("%Y-%m-%d")
        files = []
        for f in os.listdir(LOG_DIR):
            if f.endswith(".txt") or f.endswith(".zip"):
                file_path = os.path.join(LOG_DIR, f)
                is_zip = f.endswith(".zip")
                files.append({
                    "name": f,
                    "type": "zip" if is_zip else "text",
                    "is_today": not is_zip and f.startswith(today_str),
                    "mtime": os.path.getmtime(file_path),
                    "size": os.path.getsize(file_path)
                })
        
        # 수정 시간 역순 정렬
        files.sort(key=lambda x: x["mtime"], reverse=True)
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}

class LogArchiveRequest(BaseModel):
    filenames: list[str]
    archive_name: str

# 로그 파일 압축 관리 (New: Delete originals after zip)
@router.post("/api/system/logs/archive")
async def api_archive_logs(
    req: LogArchiveRequest,
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not req.filenames:
        raise HTTPException(status_code=400, detail="No files selected")
    
    if not req.archive_name:
        raise HTTPException(status_code=400, detail="Archive name is required")

    from datetime import datetime
    import zipfile
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    safe_name = "".join([c for c in req.archive_name if c.isalnum() or c in (' ', '-', '_')]).strip()
    if not safe_name: safe_name = f"logs_archive_{datetime.now().strftime('%H%M%S')}"
    archive_filename = f"{safe_name}.zip"
    archive_path = os.path.join(LOG_DIR, archive_filename)
    
    try:
        successfully_archived = []
        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for filename in req.filenames:
                if filename.startswith(today_str):
                    continue
                
                file_path = os.path.join(LOG_DIR, filename)
                if os.path.exists(file_path) and os.path.dirname(os.path.abspath(file_path)) == os.path.abspath(LOG_DIR):
                    zipf.write(file_path, filename)
                    successfully_archived.append(file_path)
        
        # 압축 성공 후 원본 파일 삭제
        for path in successfully_archived:
            try:
                os.remove(path)
            except:
                pass # 삭제 실패 무시
                
        return {"success": True, "archive_name": archive_filename}
    except Exception as e:
        if os.path.exists(archive_path): os.remove(archive_path) # 실패 시 껍데기 삭제
        raise HTTPException(status_code=500, detail=f"Archiving failed: {str(e)}")

# Zip 내부 파일 목록 조회
@router.get("/api/system/logs/zip-content/{filename}")
async def api_get_zip_content(
    filename: str,
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    file_path = os.path.join(LOG_DIR, filename)
    if not filename.endswith(".zip") or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Zip file not found")
        
    import zipfile
    try:
        with zipfile.ZipFile(file_path, 'r') as zipf:
            return {"filename": filename, "files": [info.filename for info in zipf.infolist()]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Zip 압축 해제
@router.post("/api/system/logs/unzip")
async def api_unzip_logs(
    req: dict,
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    
    filename = req.get("filename")
    if not filename or not filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Invalid zip filename")
        
    file_path = os.path.join(LOG_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Zip file not found")
        
    import zipfile
    try:
        with zipfile.ZipFile(file_path, 'r') as zipf:
            zipf.extractall(LOG_DIR)
        
        # 해제 성공 후 zip 파일 삭제
        os.remove(file_path)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/{filename}")
async def get_log_content(
    filename: str,
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN': 
        raise HTTPException(status_code=403, detail="Admin access required")
    file_path = os.path.join(LOG_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Log file not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return {"filename": filename, "content": f.read()}

# --- System Health & Scheduler ---

# api_get_health: 시스템 헬스 체크
@router.get("/api/system/health")
async def api_get_health(
    current_user: dict = Depends(get_current_user_jwt)
):
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
async def api_get_scheduler_jobs(
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.scheduler import get_scheduler_jobs
    return {"jobs": get_scheduler_jobs()}

# 스케줄러 제어
@router.post("/api/system/scheduler/control")
async def api_control_scheduler(
    action: str = Query(...),
    current_user: dict = Depends(get_current_user_jwt)
):
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
async def api_delete_scheduler_job(
    job_id: str,
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.scheduler import scheduler
    try:
        scheduler.remove_job(job_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Job not found or error: {str(e)}")
