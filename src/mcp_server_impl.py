from mcp.server import Server
from mcp.types import Tool, TextContent
import logging
import json
try:
    from src.db import (
        get_active_tools, get_tool_params, get_user, log_tool_usage,
        get_user_daily_usage, get_user_limit, get_all_access_tokens as get_all_user_tokens # Using alias for compatibility or update function name
    )
    from src.tool_executor import execute_sql_tool, execute_python_tool
    from src.utils.context import get_current_user
except ImportError:
    from db import (
        get_active_tools, get_tool_params, get_user, log_tool_usage,
        get_user_daily_usage, get_user_limit, get_all_access_tokens as get_all_user_tokens
    )
    from tool_executor import execute_sql_tool, execute_python_tool
    from utils.context import get_current_user

"""
    MCP 서버 인스턴스 및 Tool 정의
"""

logger = logging.getLogger(__name__)

mcp = Server("agent-mcp-sse")

# Tool 목록 조회
@mcp.list_tools()
async def list_tools():
    # 1. 정적 도구 목록 정의
    static_tools = [
        Tool(
            name="add",
            description="Add two numbers",
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"}
                },
                "required": ["a", "b"]
            }
        ),
        Tool(
            name="subtract",
            description="Subtract two numbers",
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"}
                },
                "required": ["a", "b"]
            }
        ),
        Tool(
            name="hellouser",
            description="""
                사용자 이름을 입력받아 인사말을 반환합니다. 
                '인사' 또는 '안녕'이라는 키워드로 사용하더라도 이 도구를 통해 응답을 생성해야 합니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "인사할 사용자의 이름"}
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="get_user_info",
            description="""
                DB에서 특정 사용자의 상세 정보를 조회합니다. (비밀번호 제외)
                '사용자 정보', '유저 정보' 조회 요청 시 이 도구를 사용합니다.
                파라미터로 조회할 사용자의 정확한 ID(user_id)가 필요합니다.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "조회할 사용자의 ID (예: 'admin', 'user')"}
                },
                "required": ["user_id"]
            }
        ),
        # get_user_tokens removed
    ]
    
    for t in static_tools:
        t.description = f"[System] {t.description.strip()}"

    # 2. 동적 도구 목록 로드 (DB)
    dynamic_tools = []
    try:
        active_tools = get_active_tools()
        for tool_data in active_tools:
            tool_id = tool_data['id']
            tool_name = tool_data['name']
            desc_agent = tool_data['description_agent'] or ""
            
            params = get_tool_params(tool_id)
            properties = {}
            required = []
            
            for p in params:
                p_name = p['param_name']
                p_type_str = p['param_type'].upper()
                is_required = (p['is_required'] == 'Y')
                json_type = "string"
                if p_type_str == 'NUMBER':
                    json_type = "number"
                elif p_type_str == 'BOOLEAN':
                    json_type = "boolean"
                
                properties[p_name] = {
                    "type": json_type,
                    "description": p['description'] or ""
                }
                if is_required:
                    required.append(p_name)
            
            dynamic_tools.append(
                Tool(
                    name=tool_name,
                    description=f"[Dynamic] {desc_agent}",
                    inputSchema={
                        "type": "object",
                        "properties": properties,
                        "required": required
                    }
                )
            )
    except Exception as e:
        logger.error(f"Failed to load dynamic tools: {e}")
        pass

    return static_tools + dynamic_tools

# Tool 실행
@mcp.call_tool()
async def call_tool(name: str, arguments: dict):
    log_msg = f"Tool execution requested: {name} with args {arguments}"
    logger.info(log_msg)
    print(f"[DEBUG] {log_msg}")
    
    # [1] Context에서 사용자 정보 가져오기
    current_user = get_current_user()
    print(f"current_user:: {current_user}")
    if current_user:
        user_uid = current_user['uid']
        logger.info(f"Tool executed by authenticated user: {current_user['user_id']} ({current_user['role']})")
    else:
        logger.warning("Tool execution blocked: Unauthenticated")
        return [TextContent(type="text", text="Error: Authentication required to execute tools. Please refresh token.")]
        
    # [2] 사용량 제한 체크
    daily_usage = get_user_daily_usage(user_uid)
    daily_limit = get_user_limit(user_uid, current_user.get('role', 'ROLE_USER'))
    
    if daily_limit != -1 and daily_usage >= daily_limit:
        logger.warning(f"Tool execution blocked: Daily limit exceeded ({user_uid}, Usage: {daily_usage}/{daily_limit})")
        return [TextContent(type="text", text=f"Error: Daily usage limit exceeded ({daily_usage}/{daily_limit}). Please contact admin.")]

    # [3] 도구 실행 준비
    tool_args = arguments.copy()
    if "_user_uid" in tool_args:
            del tool_args["_user_uid"]

    # [4] 도구 실행
    try:
        result_val = ""
        is_success = False

        if "get_user_info" in name:
            if not current_user or current_user.get('role') != 'ROLE_ADMIN':
                result_val = "WARN: Admin privileges required for this tool"
            else:
                target_id = tool_args.get("user_id")
                if not target_id:
                    result_val = "Missing user_id parameter"
                else:
                    target_user = get_user(target_id)
                    if not target_user:
                        result_val = f"User not found with ID: {target_id}"
                    else:
                        user_dict = dict(target_user)
                        if 'password' in user_dict: del user_dict['password']
                        result_val = json.dumps(user_dict, default=str, ensure_ascii=False)
                        is_success = True
            
            if user_uid:
                log_tool_usage(user_uid, name, str(tool_args), is_success, result_val)
            return [TextContent(type="text", text=result_val)]

        # Custom logic for get_user_tokens (if needed, but it was removed from tool list) or other admin tools can go here

        if name == "add":
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a + b)
            if user_uid: log_tool_usage(user_uid, name, str(tool_args), True, result_val)
            return [TextContent(type="text", text=result_val)]
            
        elif name == "subtract":
            a = tool_args.get("a", 0)
            b = tool_args.get("b", 0)
            result_val = str(a - b)
            if user_uid: log_tool_usage(user_uid, name, str(tool_args), True, result_val)
            return [TextContent(type="text", text=result_val)]
            
        elif name == "hellouser":
            user_name = tool_args.get("name", "User")
            result_val = f"Hello {user_name}"
            if user_uid: log_tool_usage(user_uid, name, str(tool_args), True, result_val)
            return [TextContent(type="text", text=result_val)]

        # Dynamic Tools
        try:
            active_tools = get_active_tools()
            target_tool = next((t for t in active_tools if t['name'] == name), None)
            
            if target_tool:
                tool_type = target_tool['tool_type']
                definition = target_tool['definition']
                
                if tool_type == 'SQL':
                    result_raw = await execute_sql_tool(definition, tool_args)
                    result_val = str(result_raw)
                elif tool_type == 'PYTHON':
                    result_raw = await execute_python_tool(definition, tool_args)
                    result_val = str(result_raw)
                else:
                    return [TextContent(type="text", text=f"Error: Unknown tool type '{tool_type}'")]
                
                is_success = True
                if result_val.startswith("Error"):
                    is_success = False
                
                if user_uid:
                    log_tool_usage(user_uid, name, str(tool_args), is_success, result_val)
                return [TextContent(type="text", text=result_val)]
        except Exception as e:
            logger.error(f"Dynamic tool execution error: {e}")
            
        return [TextContent(type="text", text=f"DEBUG FAIL: Unknown tool '{name}'")]
    
    except Exception as e:
        error_msg = f"Tool execution failed: {name} - {str(e)}"
        logger.error(error_msg)
        if user_uid:
            try:
                log_tool_usage(user_uid, name, str(tool_args), False, str(e))
            except: pass
        return [TextContent(type="text", text=f"Error: {str(e)}")]
