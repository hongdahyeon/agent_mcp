
from datetime import datetime
from .connection import get_db_connection

"""
    h_custom_tool 테이블 관련
    - [1] get_active_tools: 활성화된 모든 Tool 조회 (서버 시작/리로드용)
    - [2] get_all_tools: 모든 Tool 목록 조회 (관리자용)
    - [3] create_tool: 새로운 Tool 생성
    - [4] update_tool: Tool 정보 수정
    - [5] delete_tool: Tool 삭제
    - [6] get_tool_by_id: 특정 Tool 상세 조회
"""

# [1] get_active_tools: 활성화된 모든 tool 목록 조회
def get_active_tools() -> list[dict]:
    """활성화된 모든 Tool 조회."""
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM h_custom_tool WHERE is_active='Y'").fetchall()
    
    tools = []
    for row in rows:
        tools.append(dict(row))
        
    conn.close()
    return tools

# [2] get_all_tools: 모든 tool 목록 조회 (관리자용)
def get_all_tools() -> list[dict]:
    """모든 Tool 목록 조회 (관리자용)."""
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM h_custom_tool ORDER BY id DESC").fetchall()
    
    tools = []
    for row in rows:
        tools.append(dict(row))
        
    conn.close()
    return tools

# [3] get_tool_by_id: 특정 tool 상세 조회
def get_tool_by_id(tool_id: int) -> dict | None:
    """특정 Tool 상세 조회."""
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM h_custom_tool WHERE id=?", (tool_id,)).fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

# [4] create_tool: 새로운 tool 생성
def create_tool(name: str, tool_type: str, definition: str, 
               description_user: str = "", description_agent: str = "", 
               created_by: str = "admin") -> int:
    """새로운 Tool 생성."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO h_custom_tool (
                name, tool_type, definition, description_user, description_agent, 
                created_by, is_active, reg_dt
            ) VALUES (?, ?, ?, ?, ?, ?, 'Y', ?)
        """, (name, tool_type, definition, description_user, description_agent, 
              created_by, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        
        tool_id = cur.lastrowid
        conn.commit()
        return tool_id
    finally:
        conn.close()

# [5] update_tool: tool 정보 수정
def update_tool(tool_id: int, name: str, tool_type: str, definition: str,
               description_user: str = "", description_agent: str = "", 
               is_active: str = "Y"):
    """Tool 정보 수정."""
    conn = get_db_connection()
    
    conn.execute("""
        UPDATE h_custom_tool
        SET name=?, tool_type=?, definition=?, description_user=?, description_agent=?, is_active=?
        WHERE id=?
    """, (name, tool_type, definition, description_user, description_agent, is_active, tool_id))
    
    conn.commit()
    conn.close()

# [6] delete_tool: tool 삭제
def delete_tool(tool_id: int):
    """Tool 삭제 (Cascade 설정되어 있으면 파라미터도 자동 삭제되지만, 명시적으로 처리 권장)."""
    conn = get_db_connection()
    # 파라미터는 FOREIGN KEY CASCADE로 함께 삭제됨 (init_manager.py 참조)
    conn.execute("DELETE FROM h_custom_tool WHERE id=?", (tool_id,))
    conn.commit()
    conn.close()