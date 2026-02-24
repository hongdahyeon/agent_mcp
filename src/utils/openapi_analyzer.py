
import json
import httpx
import logging
from typing import Dict, Any, Optional
from urllib.parse import unquote

try:
    from src.db.openapi import get_openapi_by_tool_id
except ImportError:
    from db.openapi import get_openapi_by_tool_id

logger = logging.getLogger(__name__)

# [1] analyze_openapi_tool: OpenAPI 도구를 분석하여 도구 정보와 실행 결과를 반환합니다.
async def analyze_openapi_tool(tool_id: str, sample_args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    OpenAPI 도구의 설정을 조회하고 선택적으로 샘플 호출을 수행하여 도구를 분석합니다.
    도구 정보와 실행 결과가 포함된 표준화된 딕셔너리를 반환합니다.

    인자:
        tool_id (str): 분석할 도구의 ID.
        sample_args (Optional[Dict[str, Any]]): 도구 호출에 사용할 선택적 샘플 인자.

    반환:
        Dict[str, Any]: 분석 보고서가 포함된 딕셔너리.
    """
    # 1. Fetch tool configuration
    config = get_openapi_by_tool_id(tool_id)
    if not config:
        return {
            "status": "error",
            "message": f"OpenAPI configuration for '{tool_id}' not found",
            "tool_id": tool_id
        }

    # 2. Extract and format info
    analysis_report = {
        "status": "success",
        "tool_id": config['tool_id'],
        "name_ko": config['name_ko'],
        "description": config.get('description_agent') or config.get('description_info'),
        "api_info": {
            "url": config['api_url'],
            "method": config['method'],
            "auth_type": config['auth_type'],
            "auth_param": config.get('auth_param_nm') or "serviceKey"
        },
        "parameters": {}
    }

    # Parse params_schema if exists
    if config.get('params_schema'):
        try:
            analysis_report["parameters"] = json.loads(config['params_schema'])
        except Exception as e:
            logger.error(f"Failed to parse params_schema for {tool_id}: {e}")
            analysis_report["parameters_error"] = str(e)

    # 3. Perform sample call
    # If sample_args is provided, use them. Otherwise, try to use defaults from params_schema.
    execution_params = {}
    if isinstance(analysis_report["parameters"], dict):
        # Fill default values from schema if possible (assuming simple key-value for now)
        execution_params.update(analysis_report["parameters"])
        
    if sample_args:
        execution_params.update(sample_args)

    # Prepare for the call
    target_url = config['api_url']
    method = config['method'].upper()
    headers = {}
    
    # Handle Auth
    auth_type = config['auth_type']
    auth_param = config.get('auth_param_nm') or "serviceKey"
    auth_key = config.get('auth_key_val')

    if auth_type == "SERVICE_KEY" and auth_key:
        execution_params[auth_param] = unquote(auth_key)
    elif auth_type == "BEARER" and auth_key:
        headers["Authorization"] = f"Bearer {auth_key}"

    sample_result = {
        "called": False,
        "status_code": None,
        "response_sample": None,
        "error": None
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = None
            if method == "GET":
                response = await client.get(target_url, params=execution_params, headers=headers)
            elif method in ["POST", "POST_JSON"]:
                # For analysis, we might not have a full body, so we try empty or params as json
                response = await client.post(target_url, json=execution_params, headers=headers)
            elif method == "POST_FORM":
                response = await client.post(target_url, data=execution_params, headers=headers)
            
            if response:
                sample_result["called"] = True
                sample_result["status_code"] = response.status_code
                
                content_type = response.headers.get("Content-Type", "").lower()
                if "xml" in content_type:
                    try:
                        import xmltodict
                        sample_result["response_sample"] = json.loads(json.dumps(xmltodict.parse(response.text)))
                    except Exception as xml_err:
                        sample_result["response_sample"] = response.text[:1000] # Truncate if raw
                        sample_result["warning"] = f"XML conversion failed: {str(xml_err)}"
                else:
                    try:
                        sample_result["response_sample"] = response.json()
                    except:
                        sample_result["response_sample"] = response.text[:1000]

    except Exception as e:
        sample_result["error"] = str(e)
        logger.error(f"Sample call failed for {tool_id}: {e}")

    analysis_report["sample_call"] = sample_result
    
    # AI Summary Recommendation
    analysis_report["ai_summary"] = _generate_ai_summary(analysis_report)

    return analysis_report

# [2] _generate_ai_summary: AI 에이전트가 도구를 이해할 수 있도록 도구 정보를 요약하여 반환합니다.
def _generate_ai_summary(report: Dict[str, Any]) -> str:
    """ Generates a brief summary for the AI agent to understand the tool better. """
    if report["status"] != "success":
        return "도구 정보를 찾을 수 없습니다."
    
    summary = f"도구 '{report['name_ko']}'({report['tool_id']}) 분석 결과:\n"
    summary += f"- 용도: {report['description']}\n"
    summary += f"- 엔드포인트: {report['api_info']['method']} {report['api_info']['url']}\n"
    
    params = report.get('parameters', {})
    if params:
        summary += f"- 주요 파라미터: {', '.join(params.keys())}\n"
    else:
        summary += "- 파라미터 정보가 없습니다.\n"

    sample = report.get('sample_call', {})
    if sample.get('called'):
        status = sample.get('status_code')
        summary += f"- 최근 샘플 호출 결과: HTTP {status}\n"
        if status == 200:
            summary += "- 호출성공: 응답 규격이 정상적으로 확인되었습니다."
        else:
            summary += f"- 호출주의: {sample.get('error') or '응답 코드가 200이 아닙니다.'}"
    else:
        summary += "- 샘플 호출이 수행되지 않았거나 실패했습니다."

    return summary

if __name__ == "__main__":
    import asyncio
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python openapi_analyzer.py [tool_id]")
        sys.exit(1)
        
    tool_id = sys.argv[1]
    async def test():
        res = await analyze_openapi_tool(tool_id)
        print(json.dumps(res, indent=2, ensure_ascii=False))
        
    asyncio.run(test())