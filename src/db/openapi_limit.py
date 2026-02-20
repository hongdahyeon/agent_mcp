from .connection import get_db_connection

"""
    h_openapi_limit 테이블 관리
    - [1] get_openapi_limit: 유저/토큰에 적용될 한도 조회
    - [2] get_openapi_limit_list: 전체 제한 정책 목록 조회
    - [3] upsert_openapi_limit: 정책 추가/수정
    - [4] delete_openapi_limit: 정책 삭제
"""

# [1] get_openapi_limit: 적용될 한도 조회 (우선순위: TOKEN > USER > ROLE)
def get_openapi_limit(user_uid: int = None, user_id: str = None, token_id: int = None, role: str = None):
    conn = get_db_connection()
    try:
        # 1. TOKEN 제한 체크
        if token_id:
            row = conn.execute('''
                SELECT max_count FROM h_openapi_limit 
                WHERE target_type = 'TOKEN' AND target_id = ?
            ''', (str(token_id),)).fetchone()
            if row: return row[0]

        # 2. USER 제한 체크
        if user_id:
            row = conn.execute('''
                SELECT max_count FROM h_openapi_limit 
                WHERE target_type = 'USER' AND target_id = ?
            ''', (user_id,)).fetchone()
            if row: return row[0]

        # 3. ROLE 제한 체크
        if role:
            row = conn.execute('''
                SELECT max_count FROM h_openapi_limit 
                WHERE target_type = 'ROLE' AND target_id = ?
            ''', (role,)).fetchone()
            if row: return row[0]

        # 기본값 (정책이 없는 경우 -1: 무제한으로 간주하거나 ROLE_USER 기본값 적용 가능)
        return -1 
    finally:
        conn.close()

# [2] get_openapi_limit_list: 전체 제한 정책 목록 조회
def get_openapi_limit_list(page: int = 1, size: int = 10):
    conn = get_db_connection()
    offset = (page - 1) * size
    try:
        total = conn.execute("SELECT COUNT(*) FROM h_openapi_limit").fetchone()[0]
        rows = conn.execute('''
            SELECT 
                l.*,
                CASE 
                    WHEN l.target_type = 'USER' THEN u.user_nm
                    WHEN l.target_type = 'TOKEN' THEN t.name
                    ELSE NULL
                END as target_name
            FROM h_openapi_limit l
            LEFT JOIN h_user u ON l.target_type = 'USER' AND l.target_id = u.user_id
            LEFT JOIN h_access_token t ON l.target_type = 'TOKEN' AND CAST(l.target_id AS INTEGER) = t.id
            ORDER BY l.target_type DESC, l.target_id ASC
            LIMIT ? OFFSET ?
        ''', (size, offset)).fetchall()
        
        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "page": page,
            "size": size
        }
    finally:
        conn.close()

# [3] upsert_openapi_limit: 정책 추가/수정
def upsert_openapi_limit(data: dict):
    conn = get_db_connection()
    try:
        # target_type, target_id 조합으로 기존 레코드 확인
        existing = conn.execute('''
            SELECT id FROM h_openapi_limit 
            WHERE target_type = ? AND target_id = ?
        ''', (data['target_type'], data['target_id'])).fetchone()

        if existing:
            conn.execute('''
                UPDATE h_openapi_limit 
                SET max_count = ?, description = ?
                WHERE id = ?
            ''', (data['max_count'], data.get('description'), existing[0]))
        else:
            conn.execute('''
                INSERT INTO h_openapi_limit (target_type, target_id, max_count, description)
                VALUES (?, ?, ?, ?)
            ''', (data['target_type'], data['target_id'], data['max_count'], data.get('description')))
        
        conn.commit()
    finally:
        conn.close()

# [4] delete_openapi_limit: 정책 삭제
def delete_openapi_limit(limit_id: int):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM h_openapi_limit WHERE id = ?", (limit_id,))
        conn.commit()
    finally:
        conn.close()
