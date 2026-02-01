from datetime import datetime
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

import json

"""
    h_system_config 테이블 관련 (Refactored to JSON schema)
    - [1] get_all_configs: 모든 시스템 설정 목록 조회 (Name, JSON Configuration) 
    - [2] get_config_value: 특정 설정 이름의 JSON 설정 조회.
    - [3] set_config: 설정 값 저장 (Insert od Update)
    - [4] delete_config: 설정 삭제
"""

# [1] get_all_configs: 모든 시스템 설정 목록 조회 
def get_all_configs():
    """모든 시스템 설정 목록 조회."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, configuration, description, reg_dt FROM h_system_config ORDER BY name")
    rows = cursor.fetchall()
    conn.close()
    
    # configuration이 JSON String이므로 그대로 반환 (프론트에서 파싱)
    return [dict(row) for row in rows]

# [2] get_config_value: 특정 설정 이름의 JSON 설정 조회.
def get_config_value(name: str) -> dict | None:
    """특정 설정 이름의 JSON 설정 조회."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT configuration FROM h_system_config WHERE name = ?", (name,))
    row = cursor.fetchone()
    conn.close()
    
    if row and row['configuration']:
        try:
            return json.loads(row['configuration'])
        except json.JSONDecodeError:
            return None
    return None

# [3] set_config: 설정 값 저장 (Insert od Update)
def set_config(name: str, configuration: str, description: str = None):
    """설정 값 저장 (Insert od Update). configuration must be VALID JSON string."""
    
    # Verify JSON format
    try:
        json.loads(configuration)
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format")

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check exist
    cursor.execute("SELECT name FROM h_system_config WHERE name = ?", (name,))
    exists = cursor.fetchone()
    
    if exists:
        if description is not None:
             cursor.execute("""
                UPDATE h_system_config 
                SET configuration = ?, description = ? 
                WHERE name = ?
            """, (configuration, description, name))
        else:
            cursor.execute("""
                UPDATE h_system_config 
                SET configuration = ?
                WHERE name = ?
            """, (configuration, name))
    else:
        cursor.execute("""
            INSERT INTO h_system_config (name, configuration, description, reg_dt)
            VALUES (?, ?, ?, ?)
        """, (name, configuration, description or "", datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        
    conn.commit()
    conn.close()
    return True

# [4] delete_config: 설정 삭제
def delete_config(name: str):
    """설정 삭제."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM h_system_config WHERE name = ?", (name,))
    conn.commit()
    conn.close()
    return True
