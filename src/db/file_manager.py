from datetime import datetime
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

"""
    file_manager.py
    - [1] save_file_metadata: 파일 메타데이터 저장 (h_file)
    - [2] log_file_action: 파일 관련 로그 저장 (h_file_log)
    - [3] get_file: 파일 정보 조회
    - [4] get_file_logs: 파일 이력 조회
    - [5] get_all_files: 전체 파일 목록 조회
    - [6] increase_download_count: 다운로드 횟수 증가
"""


# [1] save_file_metadata: 파일 메타데이터 저장
def save_file_metadata(file_info: dict):
    """
    파일 메타데이터를 h_file 테이블에 저장합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO h_file (
                file_id, file_nm, org_file_nm, file_path, file_url, 
                file_size, file_type, extension, storage_tp, 
                reg_dt, reg_uid, use_at, delete_at, down_cnt, batch_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Y', 'N', 0, ?)
        ''', (
            file_info['file_id'],
            file_info['file_nm'],
            file_info['org_file_nm'],
            file_info['file_path'],
            file_info['file_url'],
            file_info['file_size'],
            file_info['file_type'],
            file_info['extension'],
            file_info['storage_tp'],
            datetime.now(),
            file_info['reg_uid'],
            file_info.get('batch_id')
        ))
        
        file_uid = cursor.lastrowid
        conn.commit()
        return file_uid
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# [2] log_file_action: 파일 이력 저장
def log_file_action(file_uid: int, file_id: str, reg_uid: str):
    """
    파일 관련 액션(업로드 등)을 h_file_log 테이블에 기록합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO h_file_log (
                file_uid, file_id, reg_uid, reg_dt
            ) VALUES (?, ?, ?, ?)
        ''', (
            file_uid,
            file_id,
            reg_uid,
            datetime.now()
        ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        # 로그 저장은 실패하더라도 메인 로직에 영향을 주지 않도록 로깅만 하거나 무시
        print(f"Failed to log file action: {e}")
    finally:
        conn.close()

# [3] get_file: 파일 정보 조회
def get_file(file_uid: int):
    """
    file_uid로 파일 정보를 조회합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM h_file WHERE file_uid = ? AND use_at = 'Y'", (file_uid,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

def get_file_by_id(file_id: str):
    """
    file_id로 파일 정보를 조회합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM h_file WHERE file_id = ? AND use_at = 'Y'", (file_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

# [4] get_file_logs: 파일 이력 조회
def get_file_logs(file_uid: int):
    """
    특정 파일의 이력 정보를 조회합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # h_file_log와 h_user를 조인하여 사용자 이름도 함께 조회 (Optional)
    # 여기서는 간단히 h_file_log만 조회하거나, reg_uid가 user_id이므로 그대로 사용
    cursor.execute('''
        SELECT 
            uid, file_uid, file_id, reg_uid, reg_dt 
        FROM h_file_log 
        WHERE file_uid = ? 
        ORDER BY reg_dt DESC
    ''', (file_uid,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

# [5] get_all_files: 전체 파일 목록 조회
def get_all_files(limit: int = 100):
    """
    전체 파일 목록을 최신순으로 조회합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM h_file 
        WHERE use_at = 'Y' 
        ORDER BY reg_dt DESC 
        LIMIT ?
    ''', (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

# [6] increase_download_count: 다운로드 횟수 증가
def increase_download_count(file_uid: int):
    """
    파일의 다운로드 횟수를 1 증가시킵니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("UPDATE h_file SET down_cnt = down_cnt + 1 WHERE file_uid = ?", (file_uid,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Failed to increase download count: {e}")
    finally:
        conn.close()
