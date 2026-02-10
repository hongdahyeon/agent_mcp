from .connection import get_db_connection

"""
    schema.py
    - [1] get_all_tables: DB 스키마 및 데이터 관리 함수 (관리자용)
    - [2] get_table_schema: 특정 테이블의 스키마 정보 조회 (PRAGMA table_info)
    - [3] get_table_data: 특정 테이블의 데이터 조회 (단순 조회, Limit 지원)
"""

# [1] get_all_tables: DB 스키마 및 데이터 관리 함수 (관리자용)
def get_all_tables():
    """DB 내의 모든 테이블 목록 조회."""
    conn = get_db_connection()
    cursor = conn.cursor()
    # sqlite_sequence 등 시스템 테이블은 제외
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row['name'] for row in cursor.fetchall()]
    conn.close()
    return tables


# [2] get_table_schema: 특정 테이블의 스키마 정보 조회 (PRAGMA table_info)
def get_table_schema(table_name: str):
    """특정 테이블의 스키마 정보 조회 (PRAGMA table_info)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Table 존재 여부 확인 (SQL Injection 방지)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    if not cursor.fetchone():
        conn.close()
        raise ValueError(f"Table '{table_name}' not found")
        
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return columns

# [3] get_table_data: 특정 테이블의 데이터 조회 (단순 조회, Limit 지원)
def get_table_data(table_name: str, limit: int = 100, offset: int = 0):
    """특정 테이블의 데이터 조회 (단순 조회, Limit 지원)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Table 존재 여부 확인
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    if not cursor.fetchone():
        conn.close()
        raise ValueError(f"Table '{table_name}' not found")

    # 전체 개수 조회
    cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
    total_count = cursor.fetchone()['count']
    
    # 데이터 조회 (f-string 사용하되, table_name은 위에서 검증됨)
    query = f"SELECT * FROM {table_name} LIMIT ? OFFSET ?"
    cursor.execute(query, (limit, offset))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows, total_count
