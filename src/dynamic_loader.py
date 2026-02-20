
import sys
from mcp.server.fastmcp import FastMCP
from pydantic import create_model
from typing import Any, Callable
try:
    from src.db import get_active_tools, get_tool_params
    from src.tool_executor import execute_sql_tool, execute_python_tool
    from src.utils.server_audit import audit_log
except ImportError:
    from db import get_active_tools, get_tool_params
    from tool_executor import execute_sql_tool, execute_python_tool
    from utils.server_audit import audit_log

"""
    해당 파일은 python server 시작 시점에 사용자가 동적으로 생성한 tool 목록을 로딩하기 위한 def
    - register_dynamic_tools: DB에 정의된 동적 tool들을 FastMCP 서버에 등록합니다.
    - _register_single_tool: 각각의 tool을 등록
"""


# server.py: 서버 시작 시점에 동적 툴 로딩을 위한 def
def register_dynamic_tools(mcp: FastMCP):
    """
    DB에 정의된 동적 Tool들을 FastMCP 서버에 등록합니다.
    """
    try:
        active_tools = get_active_tools()
        print(f"[DynamicLoader] Found {len(active_tools)} active custom tools.", file=sys.stderr)
        
        for tool in active_tools:
            try:
                _register_single_tool(mcp, tool) # 각각의 tool을 등록
            except Exception as e:
                print(f"[DynamicLoader] Failed to register tool '{tool['name']}': {e}", file=sys.stderr)
                
    except Exception as e:
        print(f"[DynamicLoader] Error loading tools: {e}", file=sys.stderr)

# dynamic_loader.py: 동적 툴 로딩을 위한 def
def _register_single_tool(mcp: FastMCP, tool: dict):
    tool_id = tool['id']
    tool_name = tool['name']
    tool_type = tool['tool_type']
    definition = tool['definition']
    desc_agent = tool['description_agent'] or ""
    
    # 1. 파라미터 정보 로드
    params = get_tool_params(tool_id)
    
    # 2. Pydantic 모델 동적 생성
    field_definitions = {}
    for p in params:
        p_name = p['param_name']
        p_type_str = p['param_type'].upper()
        is_required = (p['is_required'] == 'Y')
        p_desc = p['description'] or ""
        
        # 타입 매핑
        if p_type_str == 'NUMBER':
            py_type = float # or int, but float is safer for general number
        elif p_type_str == 'BOOLEAN':
            py_type = bool
        else: # STRING or Default
            py_type = str
            
        # Optional 처리
        if not is_required:
            field_definitions[p_name] = (py_type | None, None) # Default None
        else:
            field_definitions[p_name] = (py_type, ...) # Required
            
    # 모델명은 Unique하게 (Tool 이름 활용)
    # create_model(name, **fields)
    DynamicModel = create_model(f"DynamicArgs_{tool_name}", **field_definitions)
    
    # 3. 실행 핸들러 생성 (Closure 활용)
    @audit_log
    async def dynamic_handler(**kwargs) -> str:
        # 인자 검증 (Pydantic이 이미 수행했으나, 값 추출)
        # kwargs에는 모델의 필드들이 들어옴
        
        if tool_type == 'SQL':
            return await execute_sql_tool(definition, kwargs)
        elif tool_type == 'PYTHON':
            return await execute_python_tool(definition, kwargs)
        else:
            return f"Error: Unknown tool type '{tool_type}'"

    # 4. 함수의 메타데이터 설정 (FastMCP가 이를 읽어 Tool Description으로 사용)
    dynamic_handler.__name__ = tool_name
    dynamic_handler.__doc__ = desc_agent
    
    # 중요: Type Hinting을 동적으로 설정해야 FastMCP가 Schema를 추출함
    # 하지만 FastMCP(mcp) 데코레이터가 Pydantic 모델을 인자로 받는 방식이 아니라,
    # 함수 시그니처를 분석하는 방식이라면 inspect 조작이 필요할 수 있음.
    # FastMCP는 Type Hint를 분석함.
    
    # Hack: FastMCP가 지원하는 방식에 따라 다름.
    # 만약 FastMCP가 Pydantic Model을 통째로 받는 것을 지원하지 않는다면,
    # **kwargs 대신 명시적 시그니처를 만들어야 하는데 Python에서 동적으로 만들기 까다로움.
    # 다행히 FastMCP는 내부적으로 Pydantic V2를 쓰고, 기본적인 함수 시그니처 분석을 함.
    
    # 대안: Context(ctx)를 사용하지 않는 간단한 방식으로 등록.
    # FastMCP의 tool() 데코레이터는 함수를 감싸서 등록함.
    
    # 여기서 핵심문제: **kwargs를 쓰면 인자 정보가 사라짐.
    # inspect.signature를 덮어씌워야 함.
    
    import inspect
    
    # 동적 시그니처 생성
    parameters = []
    for p_name, (p_type, p_default) in field_definitions.items():
        kind = inspect.Parameter.KEYWORD_ONLY
        default = inspect.Parameter.empty if p_default is ... else p_default
        parameters.append(
            inspect.Parameter(
                name=p_name,
                kind=kind,
                default=default,
                annotation=p_type
            )
        )
        
    sig = inspect.Signature(parameters, return_annotation=str)
    dynamic_handler.__signature__ = sig
    
    # 5. 등록
    # mcp.tool()(dynamic_handler) 형태로 호출
    mcp.tool(name=tool_name, description=desc_agent)(dynamic_handler)
    print(f"[DynamicLoader] Registered tool '{tool_name}' ({tool_type})", file=sys.stderr)
