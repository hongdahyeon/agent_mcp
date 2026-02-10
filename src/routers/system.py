from fastapi import APIRouter, Depends, HTTPException, status
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
