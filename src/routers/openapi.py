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
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    return get_openapi_list(page, size)

# [2] OpenAPI 등록/수정
@router.post("/api/openapi")
async def api_upsert_openapi(req: OpenApiUpsertRequest, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    upsert_openapi(req.dict())
    return {"success": True}

# [3] OpenAPI 삭제
@router.delete("/api/openapi/{openapi_id}")
async def api_delete_openapi(openapi_id: int, current_user: dict = Depends(get_current_user_jwt)):
    if current_user['role'] != 'ROLE_ADMIN': raise HTTPException(status_code=403, detail="Admin access required")
    delete_openapi(openapi_id)
    return {"success": True}


"""
    # [4] Proxy 실행 엔드포인트 (중요)
    -> 외부 앱이나 도구(Postman 등)에서 이 시스템을 경유하여 실제 OpenAPI 호출 시 사용하는 관문
    - tool_id로 openapi 조회 후 실제 api 호출
"""
@router.api_route("/api/execute/{tool_id}", methods=["GET", "POST"])
async def api_execute_openapi(
    tool_id: str,
    request: Request,
    current_user: dict = Depends(get_current_active_user) # API 본문 실행 전에 토큰 검증
):
    # 1. OpenAPI 정의 조회
    config = get_openapi_by_tool_id(tool_id)
    if not config:
        raise HTTPException(status_code=404, detail=f"OpenAPI configuration for '{tool_id}' not found")

    # 2. 파라미터 수집
    params = dict(request.query_params)
    body = None
    
    # POST 요청인 경우 body 처리
    if request.method == "POST":
        content_type = request.headers.get("Content-Type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
            except:
                body = {}
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
        # data.go.kr 등에서 제공하는 키는 이미 인코딩된 경우가 많음. 
        # httpx가 다시 인코딩하지 않도록 먼저 디코딩함.
        params[auth_param] = unquote(auth_key)
    elif auth_type == "BEARER":
        headers["Authorization"] = f"Bearer {auth_key}"

    # 5. 실제 호출 (httpx 사용)
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
                
            # 6. 결과 반환 및 변환
            content_type = response.headers.get("Content-Type", "").lower()
            
            # XML인 경우 JSON으로 변환 시도
            if "xml" in content_type:
                try:
                    import xmltodict
                    xml_data = response.text
                    # xmltodict.parse는 OrderedDict를 반환하므로 json.loads(json.dumps(...))로 순수 dict 변환
                    json_data = json.loads(json.dumps(xmltodict.parse(xml_data)))
                    return json_data
                except Exception as xml_err:
                    logger.error(f"XML to JSON conversion failed: {xml_err}")
                    # 변환 실패 시 원본 텍스트 반환
                    return Response(content=response.content, media_type=response.headers.get("Content-Type"))

            # 기본 JSON 반환
            try:
                return response.json()
            except:
                return Response(content=response.content, media_type=response.headers.get("Content-Type"))
                
        except Exception as e:
            logger.error(f"External API call failed: {e}")
            raise HTTPException(status_code=500, detail=f"External API call failed: {str(e)}")

from fastapi import Response