from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import json
import logging
try:
    from src.db import (
        get_tool_usage_logs, get_tool_stats, get_user_daily_usage, get_user_tool_stats, get_user_limit, get_admin_usage_stats,
        get_limit_list, upsert_limit, delete_limit,
        get_all_tools, create_tool, update_tool, delete_tool, get_tool_params, add_tool_param, clear_tool_params, get_tool_by_id,
        create_access_token, get_all_access_tokens, delete_access_token
    )
    from src.dependencies import get_current_user_jwt
    from src.tool_executor import execute_sql_tool, execute_python_tool
except ImportError:
    from db import (
        get_tool_usage_logs, get_tool_stats, get_user_daily_usage, get_user_tool_stats, get_user_limit, get_admin_usage_stats,
        get_limit_list, upsert_limit, delete_limit,
        get_all_tools, create_tool, update_tool, delete_tool, get_tool_params, add_tool_param, clear_tool_params, get_tool_by_id,
        create_access_token, get_all_access_tokens, delete_access_token
    )
    from dependencies import get_current_user_jwt
    from tool_executor import execute_sql_tool, execute_python_tool

"""
    MCP 관련
"""

router = APIRouter(prefix="/api", tags=["mcp"])
logger = logging.getLogger(__name__)

# MCP Tool 사용 이력 조회 (관리자 전용, 필터링 포함)
@router.get("/mcp/usage-history")
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

@router.get("/mcp/stats")
async def get_dashboard_stats():
    """도구별 사용 통계 집계 데이터 반환."""
    return {
        "tools": get_tool_stats(),
        "users": get_user_tool_stats()
    }

# 내 금일 사용량 및 잔여 횟수 조회
@router.get("/mcp/my-usage")
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

# (관리자용) 전체 사용자 사용량 통계 조회
@router.get("/mcp/usage-stats")
async def api_get_usage_stats(current_user: dict = Depends(get_current_user_jwt)):
    """(관리자용) 전체 사용자 사용량 통계 조회."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    return get_admin_usage_stats()


# --- MCP Limits ---
class LimitUpsertRequest(BaseModel):
    target_type: str
    target_id: str
    max_count: int
    description: str | None = ""

# 제한 정책 목록 조회 (관리자 전용)
@router.get("/mcp/limits")
async def api_get_limits(current_user: dict = Depends(get_current_user_jwt)):
    """제한 정책 목록 조회 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    return {"limits": get_limit_list()}

# 제한 정책 추가/수정 (관리자 전용)
@router.post("/mcp/limits")
async def api_upsert_limit(req: LimitUpsertRequest, current_user: dict = Depends(get_current_user_jwt)):
    """제한 정책 추가/수정 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    upsert_limit(req.target_type, req.target_id, req.max_count, req.description)
    return {"success": True}

# 제한 정책 삭제 (관리자 전용)
@router.delete("/mcp/limits/{limit_id}")
async def api_delete_limit(limit_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """제한 정책 삭제 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    delete_limit(limit_id)
    return {"success": True}


# --- Access Tokens ---
class AccessTokenCreateRequest(BaseModel):
    name: str

# 외부 접속용 토큰 목록 조회
@router.get("/access-tokens")
async def api_get_access_tokens(current_user: dict = Depends(get_current_user_jwt)):
    """외부 접속용 토큰 목록 조회."""
    if current_user['role'] != 'ROLE_ADMIN':
         raise HTTPException(status_code=403, detail="Admin access required")
    return {"tokens": get_all_access_tokens()}

# 외부 접속용 토큰 생성
@router.post("/access-tokens")
async def api_create_access_token(req: AccessTokenCreateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """외부 접속용 토큰 생성."""
    if current_user['role'] != 'ROLE_ADMIN':
         raise HTTPException(status_code=403, detail="Admin access required")
    token = create_access_token(req.name)
    return {"success": True, "token": token}

# 외부 접속용 토큰 삭제 (Soft Delete)
@router.delete("/access-tokens/{token_id}")
async def api_delete_access_token(token_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """외부 접속용 토큰 삭제 (Soft Delete)."""
    if current_user['role'] != 'ROLE_ADMIN':
         raise HTTPException(status_code=403, detail="Admin access required")
    delete_access_token(token_id)
    return {"success": True}


# --- Custom Tools ---
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
    
class ToolTestRequest(BaseModel):
    tool_type: str
    definition: str
    params: dict

# 동적 Tool 목록 조회 (관리자 전용)
@router.get("/mcp/custom-tools")
async def api_get_custom_tools(current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 목록 조회 (관리자 전용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    return get_all_tools()

# 동적 Tool 상세 조회 (파라미터 포함)
@router.get("/mcp/custom-tools/{tool_id}")
async def api_get_custom_tool_detail(tool_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 상세 조회 (파라미터 포함)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    tool = get_tool_by_id(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    params = get_tool_params(tool_id)
    return {"tool": tool, "params": params}

# 동적 Tool 생성
@router.post("/mcp/custom-tools")
async def api_create_custom_tool(req: CustomToolCreateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 생성."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    try:
        tool_id = create_tool(
            name=req.name, tool_type=req.tool_type, definition=req.definition,
            description_user=req.description_user or "", description_agent=req.description_agent or "",
            created_by=current_user['uid']
        )
        for p in req.params:
            add_tool_param(
                tool_id=tool_id, param_name=p.param_name, param_type=p.param_type,
                is_required=p.is_required, description=p.description or ""
            )
        return {"success": True, "tool_id": tool_id}
    except Exception as e:
        logger.error(f"Failed to create custom tool: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 동적 Tool 수정
@router.put("/mcp/custom-tools/{tool_id}")
async def api_update_custom_tool(tool_id: int, req: CustomToolUpdateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 수정."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    try:
        update_tool(
            tool_id=tool_id, name=req.name, tool_type=req.tool_type, definition=req.definition,
            description_user=req.description_user or "", description_agent=req.description_agent or "",
            is_active=req.is_active
        )
        clear_tool_params(tool_id)
        for p in req.params:
            add_tool_param(
                tool_id=tool_id, param_name=p.param_name, param_type=p.param_type,
                is_required=p.is_required, description=p.description or ""
            )
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update custom tool: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 동적 Tool 삭제
@router.delete("/mcp/custom-tools/{tool_id}")
async def api_delete_custom_tool(tool_id: int, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 삭제."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    delete_tool(tool_id)
    return {"success": True}

# 동적 Tool 로직 테스트 실행 (저장 전 확인용)
@router.post("/mcp/custom-tools/test")
async def api_test_custom_tool(req: ToolTestRequest, current_user: dict = Depends(get_current_user_jwt)):
    """동적 Tool 로직 테스트 실행 (저장 전 확인용)."""
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    try:
        if req.tool_type == 'SQL':
            result = await execute_sql_tool(req.definition, req.params)
            return {"success": True, "result": result}
        elif req.tool_type == 'PYTHON':
            result = await execute_python_tool(req.definition, req.params)
            return {"success": True, "result": result}
        else:
            raise HTTPException(status_code=400, detail="Unknown tool type")
    except Exception as e:
        return {"success": False, "error": str(e)}
