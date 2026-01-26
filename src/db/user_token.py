from datetime import datetime, timedelta
import secrets
from .connection import get_db_connection

"""
    h_user_token 테이블 관련
    - [1] create_user_token: 사용자 토큰 생성 (1년짜리)
    - [2] get_user_token: 현재 사용자({user_uid})의 유효한 토큰 조회
    - [3] get_user_by_active_token: 활성 토큰({token})으로 사용자 정보 조회 (만료일 체크 포함)
    - [4] get_all_user_tokens: 특정 사용자({user_uid})의 모든 토큰 이력 조회 (관리자용)
"""

# [1] create_user_token: 사용자 토큰 관리 함수
def create_user_token(user_uid: int, days_valid: int = 365) -> str:
    """사용자 API 토큰 생성 및 저장 (기존 토큰 만료 처리)."""
    conn = get_db_connection()
    
    # 안전한 랜덤 토큰 생성 (43 chars)
    token_value = f"sk_mcp_{secrets.token_urlsafe(32)}"
    
    # 만료일 계산
    expired_at = (datetime.now() + timedelta(days=days_valid)).strftime("%Y-%m-%d %H:%M:%S")
    
    # 기존 활성 토큰 만료 처리 (단일 토큰 정책 유지를 위해)
    conn.execute("UPDATE h_user_token SET is_active = 'N' WHERE user_uid = ?", (user_uid,))
    
    # 새 토큰 저장
    reg_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute('''
        INSERT INTO h_user_token (user_uid, token_value, expired_at, is_active, reg_dt)
        VALUES (?, ?, ?, 'Y', ?)
    ''', (user_uid, token_value, expired_at, reg_dt))
    
    conn.commit()
    conn.close()
    
    return token_value

# [2] get_user_token: 현재 사용자의 유효한 토큰 조회
def get_user_token(user_uid: int) -> dict | None:
    """사용자의 현재 유효한 토큰 조회."""
    conn = get_db_connection()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    token = conn.execute('''
        SELECT token_value, expired_at 
        FROM h_user_token 
        WHERE user_uid = ? 
          AND is_active = 'Y' 
          AND expired_at > ?
        ORDER BY id DESC LIMIT 1
    ''', (user_uid, now_str)).fetchone()
    
    conn.close()
    
    if token:
        return dict(token)
    return None


# [3] get_user_by_active_token: 활성 토큰으로 사용자 정보 조회 (만료일 체크 포함)
def get_user_by_active_token(token: str) -> dict | None:
    """활성 토큰으로 사용자 정보 조회 (만료일 체크 포함)."""
    conn = get_db_connection()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    query = '''
        SELECT u.uid, u.user_id, u.user_nm, u.role, u.is_enable, t.expired_at
        FROM h_user_token t
        JOIN h_user u ON t.user_uid = u.uid
        WHERE t.token_value = ?
          AND t.is_active = 'Y'
          AND t.expired_at > ?
    '''
    
    user = conn.execute(query, (token, now_str)).fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None


# [4] get_all_user_tokens: 특정 사용자({user_uid})의 모든 토큰 이력 조회 (관리자용)
def get_all_user_tokens(user_uid: int) -> list[dict]:
    """특정 사용자의 모든 토큰 이력 조회 (관리자용)."""
    conn = get_db_connection()
    tokens = conn.execute(
        "SELECT token_value, expired_at, is_active, reg_dt FROM h_user_token WHERE user_uid = ? ORDER BY reg_dt DESC", 
        (user_uid,)
    ).fetchall()
    conn.close()
    return [dict(t) for t in tokens]
