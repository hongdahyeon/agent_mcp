from datetime import datetime
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

"""
    h_email_log
    - [1] log_email: 이메일 발송 이력을 DB에 기록합니다.
    - [2] update_email_status: 이메일 발송 상태를 업데이트합니다.
    - [3] get_email_logs: 이메일 발송 이력을 조회합니다.
    - [4] cancel_email_log: 예약된 이메일 발송을 취소합니다.
    - [5] get_pending_scheduled_emails: 발송 대기 중인 예약 이메일을 조회합니다.
"""

# [1] log_email: 이메일 발송 이력을 DB에 기록합니다.
def log_email(user_uid: int, recipient: str, subject: str, content: str, is_scheduled: bool = False, scheduled_dt: str = None) -> int:
    """
    이메일 발송 이력을 DB에 기록합니다.
    Returns: 생성된 로그의 ID
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # is_scheduled가 True이면 1, False이면 0으로 저장
    scheduled_val = 1 if is_scheduled else 0
    
    cursor.execute("""
        INSERT INTO h_email_log (user_uid, recipient, subject, content, is_scheduled, scheduled_dt, status, reg_dt)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    """, (user_uid, recipient, subject, content, scheduled_val, scheduled_dt, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id

# [2] update_email_status: 이메일 발송 상태를 업데이트합니다.
def update_email_status(log_id: int, status: str, error_msg: str = None):
    """
    이메일 발송 상태를 업데이트합니다.
    status: 'SENT', 'FAILED', 'CANCELLED'
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sent_dt = None
    if status == 'SENT':
        sent_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
    cursor.execute("""
        UPDATE h_email_log
        SET status = ?, sent_dt = ?, error_msg = ?
        WHERE id = ?
    """, (status, sent_dt, error_msg, log_id))
    
    conn.commit()
    conn.close()

# [3] get_email_logs: 이메일 발송 이력을 조회합니다.
def get_email_logs(limit: int = 100, user_uid: int = None):
    """
    이메일 발송 이력을 조회합니다.
    user_uid가 제공되면 해당 사용자의 이력만 조회합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT l.*, u.user_id, u.user_nm
        FROM h_email_log l
        LEFT JOIN h_user u ON l.user_uid = u.uid
    """
    params = []
    
    if user_uid:
        query += " WHERE l.user_uid = ?"
        params.append(user_uid)
        
    query += " ORDER BY l.id DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

# [4] cancel_email_log: 예약된 이메일 발송을 취소합니다.
def cancel_email_log(log_id: int, user_uid: int, is_admin: bool = False) -> tuple[bool, str]:
    """
    예약된 이메일 발송을 취소합니다.
    Returns: (success, message)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. 해당 로그 조회
    cursor.execute("SELECT user_uid, status FROM h_email_log WHERE id = ?", (log_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return False, "Email log not found."
        
    owner_uid = row['user_uid']
    status = row['status']
    
    # 2. 권한 체크
    if not is_admin and owner_uid != user_uid:
        conn.close()
        return False, "Permission denied."
        
    # 3. 상태 체크 (PENDING 상태만 취소 가능)
    if status != 'PENDING':
        conn.close()
        return False, "Only PENDING emails can be cancelled."
        
    # 4. 취소 처리
    cursor.execute("UPDATE h_email_log SET status = 'CANCELLED' WHERE id = ?", (log_id,))
    conn.commit()
    conn.close()
    
    return True, "Email cancelled successfully."

# [5] get_pending_scheduled_emails: 발송 대기 중인 예약 이메일을 조회합니다.
def get_pending_scheduled_emails():
    """
    발송 대기 중인 예약 이메일을 조회합니다.
    조건: status='PENDING' AND is_scheduled=1 AND scheduled_dt <= NOW
    """
    conn = get_db_connection()
    conn.row_factory = None  # 딕셔너리가 아닌 튜플로 받기 위해 (또는 dict_factory 사용 시 주의)
    # 여기서는 dict factory를 사용하는 connection.py의 설정을 따르므로, 
    # connection.py가 row_factory를 sqlite3.Row로 설정한다면 dict처럼 접근 가능.
    
    cursor = conn.cursor()
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    query = """
        SELECT *
        FROM h_email_log
        WHERE status = 'PENDING' 
          AND is_scheduled = 1 
          AND scheduled_dt <= ?
    """
    
    cursor.execute(query, (now_str,))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]