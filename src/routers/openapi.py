from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import httpx
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


"""
    # [11] Proxy 실행 엔드포인트 (중요)
    -> 외부 앱이나 도구(Postman 등)에서 이 시스템을 경유하여 실제 OpenAPI 호출 시 사용하는 관문
    - tool_id로 openapi 조회 후 실제 api 호출
"""
@router.api_route("/api/execute/{tool_id}", methods=["GET", "POST"])
async def api_execute_openapi(
    tool_id: str,
    request: Request,
    current_user: dict = Depends(get_current_active_user) # API 본문 실행 전에 토큰 검증
):
    # 0. 인증 정보 추출 및 제한 체크
    user_uid = current_user.get('uid')
    user_id = current_user.get('user_id')
    role = current_user.get('role')
    token_id = current_user.get('_token_id')
    
    from src.db import get_openapi_limit, get_user_openapi_daily_usage, log_openapi_usage
    
    # 일일 제한량 조회 (TOKEN > USER > ROLE 우선순위)
    max_count = get_openapi_limit(user_uid=user_uid, user_id=user_id, token_id=token_id, role=role)
    
    if max_count != -1: # -1은 무제한
        current_usage = get_user_openapi_daily_usage(user_uid=user_uid, token_id=token_id)
        if current_usage >= max_count:
            # 제한 초과 시에도 실패 로그 기록 with 사유
            log_openapi_usage({
                "user_uid": user_uid,
                "token_id": token_id,
                "tool_id": tool_id,
                "method": request.method,
                "url": str(request.url),
                "status_code": 429,
                "success": 'FAIL',
                "error_msg": f"Usage limit exceeded ({current_usage}/{max_count})",
                "ip_addr": request.client.host if request.client else None
            })
            raise HTTPException(
                status_code=429,
                detail=f"OpenAPI usage limit exceeded ({current_usage}/{max_count}). Please contact admin."
            )

    # 1. OpenAPI 정의 조회
    config = get_openapi_by_tool_id(tool_id)
    if not config:
        raise HTTPException(status_code=404, detail=f"OpenAPI configuration for '{tool_id}' not found")

    # 2. 파라미터 수집
    params = dict(request.query_params)
    # token 파라미터는 프록시 내부용이므로 외부 API에 전달하지 않음
    if 'token' in params: del params['token']
    
    body = None
    
    # POST 요청인 경우 body 처리
    if request.method == "POST":
        content_type = request.headers.get("Content-Type", "")
        if "application/json" in content_type:
            try: body = await request.json()
            except: body = {}
        elif "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            form_data = await request.form()
            body = dict(form_data)

    # 3. 외부 API 호출 설정
    target_url = config['api_url']
    method = config['method'].upper()
    headers = {}
    
    # 4. 인증 처리
    auth_type = config['auth_type']
    auth_param = config['auth_param_nm'] or "serviceKey"
    auth_key = config['auth_key_val']

    if auth_type == "SERVICE_KEY":
        from urllib.parse import unquote
        params[auth_param] = unquote(auth_key)
    elif auth_type == "BEARER":
        headers["Authorization"] = f"Bearer {auth_key}"

    # 5. 실제 호출 (httpx 사용)
    status_code = 500
    success = 'FAIL'
    error_msg = None
    
    async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
        try:
            if method == "GET":
                response = await client.get(target_url, params=params, headers=headers)
            elif method == "POST_JSON":
                response = await client.post(target_url, json=body, params=params, headers=headers)
            elif method == "POST_FORM":
                response = await client.post(target_url, data=body, params=params, headers=headers)
            else: # DEFAULT POST
                response = await client.post(target_url, json=body, params=params, headers=headers)
                
            status_code = response.status_code
            success = 'SUCCESS' if 200 <= status_code < 300 else 'FAIL'
            if success == 'FAIL':
                error_msg = f"HTTP {status_code}: {response.text[:200]}"
            
            # 6. 결과 반환 및 변환
            content_type = response.headers.get("Content-Type", "").lower()
            
            # XML인 경우 JSON으로 변환 시도
            final_result = None
            if "xml" in content_type:
                try:
                    import xmltodict
                    xml_data = response.text
                    final_result = json.loads(json.dumps(xmltodict.parse(xml_data)))
                except Exception as xml_err:
                    logger.error(f"XML to JSON conversion failed: {xml_err}")
                    final_result = response.content
            else:
                try: final_result = response.json()
                except: final_result = response.content

            # 통계 로깅
            log_openapi_usage({
                "user_uid": user_uid,
                "token_id": token_id,
                "tool_id": tool_id,
                "method": method,
                "url": str(response.url),
                "status_code": status_code,
                "success": success,
                "error_msg": error_msg,
                "ip_addr": request.client.host if request.client else None
            })

            if isinstance(final_result, (dict, list)):
                return final_result
            return Response(content=final_result, media_type=response.headers.get("Content-Type"))

        # API 호출 실패 > 실패 로그 기록
        except Exception as e:
            logger.error(f"External API call failed: {e}")
            log_openapi_usage({
                "user_uid": user_uid,
                "token_id": token_id,
                "tool_id": tool_id,
                "method": method,
                "url": target_url,
                "status_code": status_code,
                "success": 'FAIL',
                "ip_addr": request.client.host if request.client else None
            })
            raise HTTPException(status_code=500, detail=f"External API call failed: {str(e)}")

from fastapi import Response