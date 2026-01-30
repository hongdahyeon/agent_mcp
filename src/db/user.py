# import hashlib  <-- Removed
from .connection import get_db_connection
try:
    from src.utils.auth import verify_password, get_password_hash
except ImportError:
    from utils.auth import verify_password, get_password_hash

"""
    h_user 테이블 관련
    - [1] verify_password: 비밀번호 검증 (Delegated to auth.py)
    - [2] get_user: {user_id} 값으로 사용자 정보 조회
    - [3] get_all_users: 모든 사용자 조회 (비밀번호 제외, 페이징 포함)
    - [4] check_user_id: 사용자 ID 중복 확인
    - [5] create_user: 새 사용자 생성
    - [6] update_user: 사용자 정보 수정
"""

# [1] verify_password: 비밀번호 검증
# auth.py에서 import하여 사용하므로 별도 정의 불필요하나,
# 기존 인터페이스 유지를 위해 그대로 두거나 재export 됨.
# (verify_password는 위에서 import 되었음)


# [2] get_user: 유저 ID 값으로 조회
def get_user(user_id: str):
    """ID로 사용자 조회."""
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM h_user WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    return user


# [3] get_all_users: 모든 사용자 조회 (비밀번호 제외, 페이징 포함)
def get_all_users(page: int = 1, size: int = 20):
    """모든 사용자 조회 (비밀번호 제외, 페이징 포함)."""
    conn = get_db_connection()
    offset = (page - 1) * size
    
    # 전체 개수 조회
    cursor = conn.execute('SELECT COUNT(*) FROM h_user')
    total = cursor.fetchone()[0]

    # 보안을 위해 비밀번호 제외
    query = 'SELECT uid, user_id, user_nm, role, is_enable, last_cnn_dt FROM h_user ORDER BY uid ASC LIMIT ? OFFSET ?'
    users = conn.execute(query, (size, offset)).fetchall()
    conn.close()
    
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [dict(row) for row in users]
    }

# [4] check_user_id: 사용자 ID 중복 확인
def check_user_id(user_id: str) -> bool:
    """사용자 ID 중복 확인. 이미 존재하면 True 반환."""
    conn = get_db_connection()
    user = conn.execute('SELECT 1 FROM h_user WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    return user is not None


# [5] create_user: 새 사용자 생성
def create_user(user_data: dict):
    """새 사용자 생성."""
    conn = get_db_connection()
    
    # 비밀번호 해시
    if 'password' in user_data and user_data['password']:
         password_hash = get_password_hash(user_data['password'])
    else:
         raise ValueError("비밀번호는 필수입니다")

    try:
        conn.execute('''
            INSERT INTO h_user (user_id, password, user_nm, role, is_enable, last_cnn_dt)
            VALUES (?, ?, ?, ?, ?, NULL)
        ''', (
            user_data['user_id'], 
            password_hash, 
            user_data['user_nm'], 
            user_data.get('role', 'ROLE_USER'), 
            user_data.get('is_enable', 'Y')
        ))
        conn.commit()
    except Exception: # sqlite3.IntegrityError might not be directly imported unless we import sqlite3
        conn.close()
        raise ValueError("이미 존재하는 사용자 ID입니다")
        
    conn.close()


# [6] update_user: 사용자 정보 수정
def update_user(user_id: str, update_data: dict):
    """사용자 정보 수정 (이름, 권한, 상태). 비밀번호 수정은 별도 처리."""
    conn = get_db_connection()
    
    # 동적 업데이트 쿼리 생성
    fields = []
    values = []
    
    if 'user_nm' in update_data:
        fields.append("user_nm = ?")
        values.append(update_data['user_nm'])
    
    if 'role' in update_data:
        fields.append("role = ?")
        values.append(update_data['role'])
        
    if 'is_enable' in update_data:
        fields.append("is_enable = ?")
        values.append(update_data['is_enable'])
    
    if not fields:
        conn.close()
        return # 업데이트할 내용 없음
        
    values.append(user_id) # WHERE 절을 위해 ID 추가
    
    query = f"UPDATE h_user SET {', '.join(fields)} WHERE user_id = ?"
    
    conn.execute(query, tuple(values))
    conn.commit()
    conn.close()
