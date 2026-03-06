from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import pandas as pd
import io
import urllib.parse
from datetime import datetime
from src.db import get_all_tool_usage_logs, get_all_openapi_usage_logs
from src.dependencies import get_current_user_jwt

router = APIRouter(prefix="/api/export", tags=["export"])

"""
    MCP Tool 사용 이력 내보내기
"""

# MCP Tool 사용 이력 내보내기
@router.get("/mcp/usage")
async def export_mcp_usage(
    format: str = Query("excel", regex="^(csv|excel)$"),
    user_id: str | None = None,
    tool_nm: str | None = None,
    success: str | None = None,
    current_user: dict = Depends(get_current_user_jwt)
):
    """MCP 도구 사용 이력을 CSV 또는 Excel로 내보내기."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = get_all_tool_usage_logs(user_id, tool_nm, success)
    df = pd.DataFrame(logs)
    
    # 컬럼명 한글 변환 및 순서 조정
    column_map = {
        "reg_dt": "시간",
        "user_nm": "사용자명",
        "user_id": "사용자ID",
        "tool_nm": "도구명",
        "tool_success": "성공여부",
        "tool_params": "파라미터",
        "tool_result": "결과"
    }
    
    if not df.empty:
        df = df[list(column_map.keys())].rename(columns=column_map)
    else:
        df = pd.DataFrame(columns=list(column_map.values()))

    filename = f"mcp_usage_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # if format == "csv":
    #     stream = io.StringIO()
    #     df.to_csv(stream, index=False, encoding='utf-8-sig')
    #     response = StreamingResponse(
    #         iter([stream.getvalue()]),
    #         media_type="text/csv"
    #     )
    #     filename += ".csv"
    # else:
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='MCP Usage')
    response = StreamingResponse(
        io.BytesIO(stream.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    filename += ".xlsx"
    
    encoded_filename = urllib.parse.quote(filename)
    response.headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{encoded_filename}"
    return response

# OpenAPI 사용 이력 내보내기
@router.get("/openapi/usage")
async def export_openapi_usage(
    format: str = Query("excel", regex="^(csv|excel)$"),
    current_user: dict = Depends(get_current_user_jwt)
):
    """OpenAPI 사용 이력을 CSV 또는 Excel로 내보내기."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = get_all_openapi_usage_logs()
    df = pd.DataFrame(logs)
    
    # 컬럼명 한글 변환 및 순서 조정
    column_map = {
        "reg_dt": "시간",
        "user_nm": "사용자명",
        "user_id": "사용자ID",
        "token_name": "토큰명",
        "tool_id": "도구ID",
        "method": "메서드",
        "url": "URL",
        "status_code": "상태코드",
        "success": "성공여부",
        "error_msg": "에러메시지",
        "ip_addr": "IP주소"
    }
    
    if not df.empty:
        # 필터링 (필요한 컬럼만)
        available_cols = [c for c in column_map.keys() if c in df.columns]
        df = df[available_cols].rename(columns={c: column_map[c] for c in available_cols})
    else:
        df = pd.DataFrame(columns=list(column_map.values()))

    filename = f"openapi_usage_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # if format == "csv":
    #     stream = io.StringIO()
    #     df.to_csv(stream, index=False, encoding='utf-8-sig')
    #     response = StreamingResponse(
    #         iter([stream.getvalue()]),
    #         media_type="text/csv"
    #     )
    #     filename += ".csv"
    # else:
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='OpenAPI Usage')
    response = StreamingResponse(
        io.BytesIO(stream.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    filename += ".xlsx"
    
    encoded_filename = urllib.parse.quote(filename)
    response.headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{encoded_filename}"
    return response
