from .connection import get_db_connection
from datetime import datetime, timedelta

"""
    h_email_otp 테이블 관련 DB 작업
    - [1] create_otp: OTP 기록 생성
    - [2] get_latest_otp: 특정 이메일/유형의 최신 유효 OTP 조회
    - [3] verify_otp_record: OTP 확인 상태 업데이트
    - [4] get_otp_history: (Admin용) OTP 이력 조회
"""

# [1] create_otp: OTP 기록 생성
def create_otp(email: str, otp_type: str, otp_code: str, valid_minutes: int = 5):
    """새로운 OTP 기록을 생성합니다."""
    conn = get_db_connection()
    expires_at = (datetime.now() + timedelta(minutes=valid_minutes)).strftime('%Y-%m-%d %H:%M:%S')
    
    try:
        conn.execute('''
            INSERT INTO h_email_otp (email, otp_type, otp_code, expires_at)
            VALUES (?, ?, ?, ?)
        ''', (email, otp_type, otp_code, expires_at))
        conn.commit()
    finally:
        conn.close()

# [2] get_latest_otp: 특정 이메일/유형의 최신 유효 OTP 조회
def get_latest_otp(email: str, otp_type: str):
    """특정 이메일과 유형에 대한 가장 최근의 OTP 정보를 가져옵니다."""
    conn = get_db_connection()
    try:
        row = conn.execute('''
            SELECT * FROM h_email_otp
            WHERE email = ? AND otp_type = ?
            ORDER BY id DESC LIMIT 1
        ''', (email, otp_type)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

# [3] verify_otp_record: OTP 확인 상태 업데이트
def verify_otp_record(otp_id: int):
    """OTP 확인이 성공했음을 마킹합니다."""
    conn = get_db_connection()
    try:
        conn.execute('''
            UPDATE h_email_otp
            SET is_verified = 'Y'
            WHERE id = ?
        ''', (otp_id,))
        conn.commit()
    finally:
        conn.close()

# [4] get_otp_history: (Admin용) OTP 이력 조회
def get_otp_history(page: int = 1, size: int = 20):
    """OTP 발송 이력을 조회합니다 (Admin용)."""
    conn = get_db_connection()
    offset = (page - 1) * size
    try:
        total = conn.execute("SELECT COUNT(*) FROM h_email_otp").fetchone()[0]
        rows = conn.execute('''
            SELECT * FROM h_email_otp
            ORDER BY id DESC
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
