from datetime import datetime
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

"""
    h_notification 관련 def
    - [1] create_notification: 알림 생성
    - [2] get_notification_list_admin: 관리자용 전체 알림 목록 조회
    - [3] get_user_notifications: 특정 사용자의 알림 목록 조회
    - [4] mark_notification_as_read: 알림 읽음 처리
    - [5] delete_notification: 알림 삭제 (소프트 삭제)
    - [6] get_unread_count: 읽지 않은 알림 개수 조회
"""

# [1] create_notification: 알림 생성
def create_notification(receive_user_uid: int, title: str, message: str, send_user_uid: int = None):
    """새로운 알림을 생성합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO h_notification (receive_user_uid, title, message, send_user_uid, reg_dt)
        VALUES (?, ?, ?, ?, ?)
    ''', (receive_user_uid, title, message, send_user_uid, timestamp))
    
    notify_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return notify_id

# [2] get_notification_list_admin: 관리자용 전체 알림 목록 조회
def get_notification_list_admin(page: int = 1, size: int = 20, include_deleted: bool = True):
    """관리자용 전체 알림 목록을 조회합니다 (페이징 지원)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    offset = (page - 1) * size
    
    # 관리자는 삭제된 내역도 볼 수 있어야 하므로 분기 처리
    delete_filter = "" if include_deleted else "WHERE n.delete_at IS NULL"
    
    query = f'''
        SELECT 
            n.*,
            ru.user_id as receive_user_id,
            ru.user_nm as receive_user_nm,
            su.user_id as send_user_id,
            su.user_nm as send_user_nm
        FROM h_notification n
        LEFT JOIN h_user ru ON n.receive_user_uid = ru.uid
        LEFT JOIN h_user su ON n.send_user_uid = su.uid
        {delete_filter}
        ORDER BY n.reg_dt DESC
        LIMIT ? OFFSET ?
    '''
    
    cursor.execute(query, (size, offset))
    items = [dict(row) for row in cursor.fetchall()]
    
    # 전체 개수 조회
    count_query = f"SELECT COUNT(*) FROM h_notification n {delete_filter}"
    cursor.execute(count_query)
    total = cursor.fetchone()[0]
    
    conn.close()
    return {"total": total, "items": items}

# [3] get_user_notifications: 특정 사용자의 알림 목록 조회
def get_user_notifications(user_uid: int, page: int = 1, size: int = 20):
    """특정 사용자의 알림 목록을 조회합니다 (삭제되지 않은 것만)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    offset = (page - 1) * size
    
    cursor.execute('''
        SELECT n.*, su.user_nm as send_user_nm
        FROM h_notification n
        LEFT JOIN h_user su ON n.send_user_uid = su.uid
        WHERE n.receive_user_uid = ? AND n.delete_at IS NULL
        ORDER BY n.reg_dt DESC
        LIMIT ? OFFSET ?
    ''', (user_uid, size, offset))
    
    items = [dict(row) for row in cursor.fetchall()]
    
    cursor.execute("SELECT COUNT(*) FROM h_notification WHERE receive_user_uid = ? AND delete_at IS NULL", (user_uid,))
    total = cursor.fetchone()[0]
    
    conn.close()
    return {"total": total, "items": items}

# [4] mark_notification_as_read: 알림 읽음 처리
def mark_notification_as_read(notify_id: int):
    """알림을 읽음 처리합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        UPDATE h_notification
        SET is_read = 'Y', read_dt = ?
        WHERE id = ? AND is_read = 'N'
    ''', (timestamp, notify_id))
    
    conn.commit()
    conn.close()

# [5] delete_notification: 알림 삭제 (소프트 삭제)
def delete_notification(notify_id: int):
    """알림을 소프트 삭제합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        UPDATE h_notification
        SET delete_at = ?
        WHERE id = ?
    ''', (timestamp, notify_id))
    
    conn.commit()
    conn.close()

# [6] get_unread_count: 읽지 않은 알림 개수 조회
def get_unread_count(user_uid: int):
    """읽지 않은 알림 개수를 조회합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COUNT(*) FROM h_notification
        WHERE receive_user_uid = ? AND is_read = 'N' AND delete_at IS NULL
    ''', (user_uid,))
    
    count = cursor.fetchone()[0]
    conn.close()
    return count
