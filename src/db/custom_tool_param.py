
from .connection import get_db_connection

"""
    h_custom_tool_param 테이블 관련
    - [1] get_tool_params: 특정 Tool의 파라미터 목록 조회
    - [2] add_tool_param: 파라미터 추가
    - [3] clear_tool_params: 특정 Tool의 모든 파라미터 삭제 (Update 시 전제 삭제 후 재생성 패턴 사용 시)
"""
# [1] get_tool_params: 특정 tool에 대해 파라미터 목록 조회 
def get_tool_params(tool_id: int) -> list[dict]:
    """특정 Tool의 파라미터 목록 조회."""
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM h_custom_tool_param WHERE tool_id=?", (tool_id,)).fetchall()
    
    params = []
    for row in rows:
        params.append(dict(row))
        
    conn.close()
    return params

# [2] add_tool_param: tool 하위 파라미터 추가
def add_tool_param(tool_id: int, param_name: str, param_type: str, 
                  is_required: str = "Y", description: str = ""):
    """파라미터 추가."""
    conn = get_db_connection()
    
    conn.execute("""
        INSERT INTO h_custom_tool_param (
            tool_id, param_name, param_type, is_required, description
        ) VALUES (?, ?, ?, ?, ?)
    """, (tool_id, param_name, param_type, is_required, description))
    
    conn.commit()
    conn.close()

# [3] clear_tool_params: tool 하위 모든 파라미터 삭제
# -> Update 시 전제 삭제 후 재생성 패턴 사용 시
# -> tool 삭제 시 자동으로 파라미터도 삭제됨 (init_manager.py 참조)
def clear_tool_params(tool_id: int):
    """특정 Tool의 모든 파라미터 삭제."""
    conn = get_db_connection()
    conn.execute("DELETE FROM h_custom_tool_param WHERE tool_id=?", (tool_id,))
    conn.commit()
    conn.close()