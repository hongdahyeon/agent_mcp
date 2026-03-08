from fastapi import APIRouter, Depends, HTTPException, Request
import json
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from src.dependencies import get_current_active_user
from src.mcp_server_impl import call_tool, list_tools
from src.utils.context import set_current_user

router = APIRouter(tags=["MCP Execution Management"])
logger = logging.getLogger(__name__)

class ProxyRequest(BaseModel):
    arguments: Dict[str, Any] = Field(default_factory=dict, description="도구 호출에 필요한 인자들")

class ProxyResponse(BaseModel):
    tool: str = Field(..., description="호출된 도구 이름")
    success: bool = Field(..., description="실행 성공 여부")
    result: Any = Field(..., description="도구 실행 결과 (문자열 또는 JSON)")

@router.get("/api/mcp/proxy/tools", summary="사용 가능한 MCP 도구 목록 조회")
async def get_proxy_tools_list():
    """
    현재 REST API Proxy를 통해 호출 가능한 모든 MCP 도구(정적/동적) 목록을 반환합니다.
    """
    tools = await list_tools()
    return {"tools": [t.dict() for t in tools]}

@router.post(
    "/api/mcp/proxy/{tool_name}",
    summary="MCP 도구 REST API 호출",
    response_model=ProxyResponse
)
async def api_proxy_mcp_tool(
    tool_name: str,
    request_data: ProxyRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    MCP 도구(정적/동적)를 REST API로 직접 호출하는 프록시 엔드포인트입니다.
    SSE 연결 없이 일반 HTTP POST 요청으로 결과를 받을 수 있습니다.
    
    - **tool_name**: 호출할 도구의 이름 (예: 'add', 'get_user_info')
    - **arguments**: 도구에 전달할 파라미터 객체
    """
    try:
        arguments = request_data.arguments

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
