from fastapi import APIRouter, Depends, HTTPException, Request
import json
import logging
from typing import Any, Dict
from src.dependencies import get_current_active_user
from src.mcp_server_impl import call_tool
from src.utils.context import set_current_user

router = APIRouter(tags=["mcp_execution"])
logger = logging.getLogger(__name__)

@router.post("/api/mcp/proxy/{tool_name}")
async def api_proxy_mcp_tool(
    tool_name: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    MCP 도구(정적/동적)를 REST API로 직접 호출하는 프록시 엔드포인트입니다.
    SSE 연결 없이 일반 HTTP POST 요청으로 결과를 받을 수 있습니다.
    """
    try:
        # 1. 요청 바디에서 인자(arguments) 추출
        try:
            body = await request.json()
            arguments = body.get("arguments", {})
        except:
            arguments = {}

        # 2. 사용자 컨텍스트 설정 (call_tool 내부에서 인증 확인을 위해 사용)
        set_current_user(current_user)

        # 3. call_tool 직접 호출
        # mcp_server_impl.py의 call_tool은 [TextContent, ...] 형태를 반환함
        results = await call_tool(name=tool_name, arguments=arguments)

        # 4. 결과 파싱 및 반환
        if not results or not isinstance(results, list):
            raise HTTPException(status_code=500, detail="Unexpected tool result format")

        # 첫 번째 텍스트 콘텐츠의 텍스트를 반환
        content = results[0]
        if hasattr(content, 'text'):
            return {
                "tool": tool_name,
                "success": "Error" not in content.text and "WARN" not in content.text,
                "result": content.text
            }
        else:
            return {
                "tool": tool_name,
                "success": False,
                "result": str(content)
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"MCP Proxy Execution Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
