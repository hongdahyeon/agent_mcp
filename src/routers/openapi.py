from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import json
import logging
from typing import List, Optional
from src.db import (
    get_openapi_list, get_openapi_by_tool_id, upsert_openapi, delete_openapi,
    get_openapi_categories, upsert_openapi_category, update_openapi_category, delete_openapi_category,
    search_openapi_tags, update_openapi_tag, delete_openapi_tag, get_openapi_by_meta
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
    category_id: Optional[int] = None        # 카테고리 ID
    tags: List[str] = []                     # 태그 목록


# [1] OpenAPI 목록 조회
@router.get("/api/openapi")
async def api_get_openapi_list(
    page: int = 1, 
    size: int = 20, 
    q: Optional[str] = None, 
    category_id: Optional[int] = None, 
    tag: Optional[str] = None,
    current_user: dict = Depends(get_current_user_jwt)
):
    # 모든 사용자가 목록 조회 가능 (등록/수정/삭제는 여전히 어드민 전용)
    return get_openapi_list(page, size, q=q, category_id=category_id, tag=tag)

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

# [4] 카테고리 목록 조회
@router.get("/api/openapi/categories")
async def api_get_categories(current_user: dict = Depends(get_current_user_jwt)):
    return get_openapi_categories()


class CategoryRequest(BaseModel):
    name: str

# [5] 카테고리 등록
@router.post("/api/openapi/categories")
async def api_upsert_category(req: CategoryRequest, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    category_id = upsert_openapi_category(req.name)
    return {"success": True, "id": category_id}

# [6] 카테고리 수정
@router.put("/api/openapi/categories/{category_id}")
async def api_update_category(category_id: int, req: CategoryRequest, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    update_openapi_category(category_id, req.name)
    return {"success": True}

# [7] 카테고리 삭제 (관리자용, 연관 API 0건일 때만)
@router.delete("/api/openapi/categories/{category_id}")
async def api_delete_category(category_id: int, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    try:
        delete_openapi_category(category_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# [8] 태그 검색 (Autosuggest/Debounce용)
@router.get("/api/openapi/tags/search")
async def api_search_tags(q: str = "", current_user: dict = Depends(get_current_user_jwt)):
    return search_openapi_tags(q)

# [9] 태그 수정 (관리자용)
@router.put("/api/openapi/tags/{tag_id}")
async def api_update_tag(tag_id: int, req: CategoryRequest, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    update_openapi_tag(tag_id, req.name)
    return {"success": True}

# [10] 태그 삭제 (관리자용, 연관 API 0건일 때만)
@router.delete("/api/openapi/tags/{tag_id}")
async def api_delete_tag(tag_id: int, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    try:
        delete_openapi_tag(tag_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# [11] 메타데이터별 OpenAPI 목록 조회 (관리자용 상세 정보 보완용)
@router.get("/api/openapi/by-meta/{meta_type}/{meta_id}")
async def api_get_openapi_by_meta(meta_type: str, meta_id: int, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    return get_openapi_by_meta(meta_type, meta_id)



class OpenApiLimitRequest(BaseModel):
    id: Optional[int] = None
    target_type: str        # ROLE, USER, TOKEN
    target_id: str          # target identifier
    max_count: int          # limit count
    description: Optional[str] = None

# [12] OpenAPI 사용 통계 조회 (사용량/성공여부/툴별)
# => ADMIN 권한만 조회 가능
@router.get("/api/openapi/stats")
async def api_get_openapi_stats(current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import get_openapi_stats, get_openapi_hourly_daily_stats
    stats = get_openapi_stats()
    stats['heatmapStats'] = get_openapi_hourly_daily_stats()
    return stats

# [13] 특정 유저의 전체 기간 도구별 사용량 (Top 5)
@router.get("/api/openapi/user-tool-stats")
async def api_get_openapi_user_tool_stats(label: str, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import get_openapi_user_tool_detail
    return get_openapi_user_tool_detail(label)

# [14] OpenAPI 메타데이터 통계 조회 (카테고리/태그별)
# => ADMIN 권한만 조회 가능
@router.get("/api/openapi/meta-stats")
async def api_get_openapi_meta_stats(current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import get_openapi_meta_stats
    return get_openapi_meta_stats()

# [15] OpenAPI 사용 이력 조회 (상세)
# => ADMIN 권한만 조회 가능
@router.get("/api/openapi/usage-logs")
async def api_get_openapi_usage_logs(page: int = 1, size: int = 20, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import get_openapi_usage_logs
    return get_openapi_usage_logs(page, size)

# [16] OpenAPI 제한 정책 목록 조회
# => ADMIN 권한만 조회 가능
@router.get("/api/openapi/limits")
async def api_get_openapi_limits(page: int = 1, size: int = 20, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import get_openapi_limit_list
    return get_openapi_limit_list(page, size)

# [17] OpenAPI 제한 정책 등록/수정
# => ADMIN 권한만 등록/수정 가능
@router.post("/api/openapi/limits")
async def api_upsert_openapi_limit(req: OpenApiLimitRequest, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import upsert_openapi_limit
    upsert_openapi_limit(req.dict())
    return {"success": True}

# [18] OpenAPI 제한 정책 삭제
# => ADMIN 권한만 삭제 가능
@router.delete("/api/openapi/limits/{limit_id}")
async def api_delete_openapi_limit(limit_id: int, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    from src.db import delete_openapi_limit
    delete_openapi_limit(limit_id)
    return {"success": True}

# [19] 내 OpenAPI 사용량 조회
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

# [20] OpenAPI 상세 정보 PDF 내보내기
@router.get("/api/openapi/{tool_id}/export")
async def api_export_openapi_pdf(
    tool_id: str, current_user:
    dict = Depends(get_current_active_user)
):
    from src.utils.pdf_generator import generate_openapi_pdf
    
    api_data = get_openapi_by_tool_id(tool_id)
    if not api_data:
        raise HTTPException(status_code=404, detail="OpenAPI not found")
    
    # ROLE_ADMIN 여부 확인
    is_admin = current_user.get('role') == 'ROLE_ADMIN'
    
    try:
        pdf_bytes = generate_openapi_pdf(api_data, is_admin=is_admin)
        from fastapi.responses import Response
        
        # 파일명 인코딩 (한글 대응)
        import urllib.parse
        filename = f"{api_data['name_ko']}_specification.pdf"
        encoded_filename = urllib.parse.quote(filename)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
            }
        )
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=f"PDF 생성 중 오류가 발생했습니다: {str(e)}")
