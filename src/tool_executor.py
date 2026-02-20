
import sys
import json
try:
    from src.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

""" 
    해당 파일은 사용자가 동적으로 등록한 tool에 대해 SQL/PYTHON 타입에 따라 구분하여 실행하는 def
"""

# [tool_type == 'SQL']의 경우에 실행
async def execute_sql_tool(query_template: str, params: dict) -> str:
    """
    SQL 쿼리를 실행하고 JSON 결과를 반환합니다.
    """
    conn = get_db_connection()
    try:
        # 파라미터 바인딩 방식 결정
        # SQLite는 ?, :name, @name 등을 지원합니다.
        # 사용자가 :param_name 형태로 쿼리를 짰다고 가정합니다.
        
        # cursor.execute는 딕셔너리를 파라미터로 받을 수 있음 (Named Style)
        # 예: execute("SELECT * FROM table WHERE id=:id", {"id": 1})
        
        cursor = conn.cursor()
        cursor.execute(query_template, params)
        
        rows = cursor.fetchall()
        result_list = [dict(row) for row in rows]
        
        return json.dumps(result_list, ensure_ascii=False, default=str)
        
    except Exception as e:
        print(f"[SQLExecutor] Error: {e}", file=sys.stderr)
        return json.dumps({"error": str(e)}, ensure_ascii=False)
    finally:
        conn.close()

# [tool_type == 'PYTHON']의 경우에 실행
async def execute_python_tool(script: str, params: dict) -> str:
    """
    Python 표현식(Expression)을 실행하고 결과를 반환합니다.
    보안을 위해 simpleeval 등의 사용이 권장되지만, 
    현재는 Phase 2 단계이므로 기본 eval()을 사용하되 최소한의 제약을 둡니다.
    (추후 simpleeval 적용 예정)
    """
    try:
        # 1. 사용할 수 있는 전역/지역 변수 제한
        # params를 지역 변수로 주입
        local_scope = params.copy()
        
        # 2. 내장 함수 사용 제한 (보안)
        # __builtins__를 비워두면 import나 open 등을 막을 수 있음
        global_scope = {"__builtins__": {}}
        
        # 필요한 안전한 함수들만 화이트리스팅
        global_scope["__builtins__"]["abs"] = abs
        global_scope["__builtins__"]["min"] = min
        global_scope["__builtins__"]["max"] = max
        global_scope["__builtins__"]["len"] = len
        global_scope["__builtins__"]["sum"] = sum
        global_scope["__builtins__"]["int"] = int
        global_scope["__builtins__"]["float"] = float
        global_scope["__builtins__"]["str"] = str
        
        # 3. 실행 (여기서는 식 평가 expression 만 허용)
        # exec() 대신 eval() 사용 -> 문(Statement) 사용 불가, 식(Expression)만 가능
        result = eval(script, global_scope, local_scope)
        
        return str(result)
        
    except Exception as e:
        print(f"[PythonExecutor] Error: {e}", file=sys.stderr)
        return f"Error: {str(e)}"
