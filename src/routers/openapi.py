from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import json
import logging
from typing import List, Optional
from src.db import (
    get_openapi_list, get_openapi_by_tool_id, upsert_openapi, delete_openapi
)
from src.dependencies import get_current_user_jwt, get_current_active_user

"""
    OpenAPI 관련 API
    - 목록 조회
    - 등록/수정/삭제
    - 사용 통계 조회
    - 사용 이력 조회
    - 제한 정책 목록 조회
    - 제한 정책 등록/수정/삭제
    - 내 OpenAPI 사용량 조회
    - Proxy 실행 엔드포인트
"""

router = APIRouter(tags=["openapi"])
logger = logging.getLogger(__name__)

class OpenApiUpsertRequest(BaseModel):
    id: Optional[int] = None
    tool_id: str                             # tool id
    name_ko: str                             # tool ko 이름
    org_name: Optional[str] = None           # openapi 원본 이름
    method: str                              # http method
    api_url: str                             # api url
    auth_type: str                           # 인증 타입
    auth_param_nm: Optional[str] = None      # 인증 파라미터 이름
    auth_key_val: Optional[str] = None       # 인증 키 값
    params_schema: Optional[str] = None      # 파라미터 스키마
    description_agent: Optional[str] = None  # 에이전트 설명
    description_info: Optional[str] = None   # 사용자 설명 (추가)
    batch_id: Optional[str] = None           # 배치 id

# [1] OpenAPI 목록 조회
@router.get("/api/openapi")
async def api_get_openapi_list(page: int = 1, size: int = 20, current_user: dict = Depends(get_current_user_jwt)):
    # 모든 사용자가 목록 조회 가능 (등록/수정/삭제는 여전히 어드민 전용)
    return get_openapi_list(page, size)

# [2] OpenAPI 등록/수정
# => ADMIN 권한만 등록/수정 가능
@router.post("/api/openapi")
async def api_upsert_openapi(req: OpenApiUpsertRequest, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    upsert_openapi(req.dict())
    return {"success": True}

# [3] OpenAPI 삭제
# => ADMIN 권한만 삭제 가능
@router.delete("/api/openapi/{openapi_id}")
async def api_delete_openapi(openapi_id: int, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    delete_openapi(openapi_id)
    return {"success": True}

# [4] OpenAPI 제한 정책 모델
class OpenApiLimitRequest(BaseModel):
    id: Optional[int] = None
    target_type: str        # ROLE, USER, TOKEN
    target_id: str          # target identifier
    max_count: int          # limit count
    description: Optional[str] = None

# [5] OpenAPI 사용 통계 조회
# => ADMIN 권한만 조회 가능
@router.get("/api/openapi/stats")
async def api_get_openapi_stats(current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import get_openapi_stats
    return get_openapi_stats()

# [6] OpenAPI 사용 이력 조회 (상세)
# => ADMIN 권한만 조회 가능
@router.get("/api/openapi/usage-logs")
async def api_get_openapi_usage_logs(page: int = 1, size: int = 20, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import get_openapi_usage_logs
    return get_openapi_usage_logs(page, size)

# [7] OpenAPI 제한 정책 목록 조회
# => ADMIN 권한만 조회 가능
@router.get("/api/openapi/limits")
async def api_get_openapi_limits(page: int = 1, size: int = 20, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import get_openapi_limit_list
    return get_openapi_limit_list(page, size)

# [8] OpenAPI 제한 정책 등록/수정
# => ADMIN 권한만 등록/수정 가능
@router.post("/api/openapi/limits")
async def api_upsert_openapi_limit(req: OpenApiLimitRequest, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import upsert_openapi_limit
    upsert_openapi_limit(req.dict())
    return {"success": True}

# [9] OpenAPI 제한 정책 삭제
# => ADMIN 권한만 삭제 가능
@router.delete("/api/openapi/limits/{limit_id}")
async def api_delete_openapi_limit(limit_id: int, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import delete_openapi_limit
    delete_openapi_limit(limit_id)
    return {"success": True}

# [10] 내 OpenAPI 사용량 조회
@router.get("/api/openapi/my-usage")
async def api_get_my_openapi_usage(current_user: dict = Depends(get_current_active_user)):
    from src.db import get_openapi_limit, get_user_openapi_daily_usage, get_user_openapi_tool_usage
    
    user_uid = current_user.get('uid')
    user_id = current_user.get('user_id')
    role = current_user.get('role')
    token_id = current_user.get('_token_id')
    
    usage = get_user_openapi_daily_usage(user_uid=user_uid, token_id=token_id)
    limit = get_openapi_limit(user_uid=user_uid, user_id=user_id, token_id=token_id, role=role)
    tool_usage = get_user_openapi_tool_usage(user_uid=user_uid, token_id=token_id)
    
    return {
        "usage": usage,
        "limit": limit,
        "remaining": -1 if limit == -1 else max(0, limit - usage),
        "tool_usage": tool_usage
    }
