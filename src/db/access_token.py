from .connection import get_db_connection
import secrets

"""
    h_access_token 테이블
    - [1] create_access_token: 토큰 생성
    - [2] get_access_token: 토큰 조회
    - [3] get_all_access_tokens: 모든 토큰 목록 조회
    - [4] delete_access_token: 토큰 삭제
"""

# [1] create_access_token: 토큰 생성
def create_access_token(name: str) -> str:
    """새로운 액세스 토큰을 생성합니다."""
    # sk_ 접두사가 붙은 랜덤 토큰 생성
    token = f"sk_{secrets.token_urlsafe(32)}"
    
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO h_access_token (name, token)
            VALUES (?, ?)
        ''', (name, token))
        conn.commit()
        return token
    finally:
        conn.close()

# [2] get_access_token: 토큰 조회
def get_access_token(token: str):
    """토큰 값으로 유효한 토큰 정보를 조회합니다."""
    conn = get_db_connection()
    try:
        # 삭제되지 않고(is_delete='N'), 사용 가능한(can_use='Y') 토큰만 조회
        row = conn.execute('''
            SELECT * FROM h_access_token 
            WHERE token = ? AND is_delete = 'N' AND can_use = 'Y'
        ''', (token,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

# [3] get_all_access_tokens: 모든 토큰 목록 조회
def get_all_access_tokens():
    """모든 토큰 목록을 조회합니다 (삭제된 것 제외)."""
    conn = get_db_connection()
    try:
        rows = conn.execute('''
            SELECT * FROM h_access_token 
            WHERE is_delete = 'N'
            ORDER BY id DESC
        ''').fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

# [4] delete_access_token: 토큰 삭제
def delete_access_token(token_id: int):
    """토큰을 삭제 처리합니다 (Soft Delete)."""
    conn = get_db_connection()
    try:
        conn.execute('''
            UPDATE h_access_token
            SET is_delete = 'Y'
            WHERE id = ?
        ''', (token_id,))
        conn.commit()
    finally:
        conn.close()
