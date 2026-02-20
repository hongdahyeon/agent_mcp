from datetime import datetime
from .connection import get_db_connection

"""
    h_login_hist 테이블 관련
    - [1] log_login_attempt: 유저들의 로그인 시도를 이력 테이블에 저장
    - [2] get_login_history: 유저들의 로그인 이력 조회 (페이징 포함)
"""

# [1] log_login_attempt: 유저들의 로그인 시도를 이력 테이블에 저장
def log_login_attempt(user_uid: int, ip_address: str, success: bool, msg: str = ""):
    """로그인 시도를 이력 테이블에 기록."""
    conn = get_db_connection()
    status = 'SUCCESS' if success else 'FAIL'
    
    conn.execute('''
    INSERT INTO h_login_hist (user_uid, login_dt, login_ip, login_success, login_msg)
    VALUES (?, ?, ?, ?, ?)
    ''', (user_uid, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), ip_address, status, msg))
    
    # 로그인 성공 시 마지막 접속 시간 업데이트
    if success and user_uid:
        conn.execute('UPDATE h_user SET last_cnn_dt = ? WHERE uid = ?', 
                     (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), user_uid))
        
    conn.commit()
    conn.close()


# [2] get_login_history: 유저들의 로그인 이력 조회 
# => 페이징 포함 (26.01.23)
def get_login_history(page: int = 1, size: int = 20):
    """로그인 이력 조회 (페이징 포함)."""
    conn = get_db_connection()
    offset = (page - 1) * size
    
    # 전체 개수 조회
    cursor = conn.execute('SELECT COUNT(*) FROM h_login_hist')
    total = cursor.fetchone()[0]

    query = '''
    SELECT h.uid, u.user_id, u.user_nm, h.login_dt, h.login_ip, h.login_success, h.login_msg
    FROM h_login_hist h
    LEFT JOIN h_user u ON h.user_uid = u.uid
    ORDER BY h.login_dt DESC
    LIMIT ? OFFSET ?
    '''
    rows = conn.execute(query, (size, offset)).fetchall()
    conn.close()
    
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [dict(row) for row in rows]
    }
