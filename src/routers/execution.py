from fastapi import APIRouter, Depends, HTTPException, Request, Response
import httpx
import json
import logging
from src.db import get_openapi_by_tool_id
from src.dependencies import get_current_active_user

router = APIRouter(tags=["execution"])
logger = logging.getLogger(__name__)

# [1] Proxy 실행 엔드포인트
# -> 외부 앱이나 도구(Postman 등)에서 이 시스템을 경유하여 실제 OpenAPI 호출 시 사용하는 관문
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

    # 2. 파라미터 수집 및 병합
    # - (1) [수정] DB에 저장된 기본 파라미터(params_schema)를 먼저 가져옴
    params = {}
    if config.get('params_schema'):
        try:
            db_params = json.loads(config['params_schema'])
            if isinstance(db_params, dict):
                params.update(db_params)
        except Exception as e:
            logger.error(f"Failed to parse params_schema for {tool_id}: {e}")

    # - (2) 요청에서 온 파라미터로 덮어쓰기 (우선순위: Request > DB Default)
    request_params = dict(request.query_params)
    params.update(request_params)

    # 3. token 파라미터는 프록시 내부용이므로 외부 API에 전달하지 않음
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
            from src.db import log_openapi_usage
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
            from src.db import log_openapi_usage
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
