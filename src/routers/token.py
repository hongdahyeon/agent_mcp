from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict
from src.dependencies import get_current_user_jwt
from src.db.connection import get_db_connection
import sqlite3

router = APIRouter(prefix="/api/tokens", tags=["tokens"])

# [1] 토큰별 권한 목록 조회
@router.get("/{token_id}/permissions")
async def get_token_permissions(token_id: int, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    conn = get_db_connection()
    try:
        # 허용된 커스텀 도구 ID 목록
        allowed_tools = conn.execute("SELECT tool_id FROM h_access_token_tool_map WHERE token_id = ?", (token_id,)).fetchall()
        # 허용된 OpenAPI ID 목록
        allowed_openapis = conn.execute("SELECT openapi_id FROM h_access_token_openapi_map WHERE token_id = ?", (token_id,)).fetchall()
        
        return {
            "allowed_tool_ids": [r[0] for r in allowed_tools],
            "allowed_openapi_ids": [r[0] for r in allowed_openapis]
        }
    finally:
        conn.close()

# [2] 토큰별 권한 업데이트
@router.post("/{token_id}/permissions")
async def update_token_permissions(
    token_id: int,
    permissions: Dict[str, List[int]] = Body(...),
    current_user: dict = Depends(get_current_user_jwt)
):
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    allowed_tool_ids = permissions.get("allowed_tool_ids", [])
    allowed_openapi_ids = permissions.get("allowed_openapi_ids", [])
    
    conn = get_db_connection()
    try:
        # 기존 권한 삭제 후 재등록 (Transaction)
        conn.execute("DELETE FROM h_access_token_tool_map WHERE token_id = ?", (token_id,))
        conn.execute("DELETE FROM h_access_token_openapi_map WHERE token_id = ?", (token_id,))
        
        for tool_id in allowed_tool_ids:
            conn.execute("INSERT INTO h_access_token_tool_map (token_id, tool_id) VALUES (?, ?)", (token_id, tool_id))
            
        for openapi_id in allowed_openapi_ids:
            conn.execute("INSERT INTO h_access_token_openapi_map (token_id, openapi_id) VALUES (?, ?)", (token_id, openapi_id))
            
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
