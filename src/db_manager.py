import sqlite3
import hashlib
from datetime import datetime
import os

DB_PATH = "agent_mcp.db"

# db 연결
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn



# 비밀번호 검증
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증 (SHA256) 및 길이 체크."""
    if len(plain_password) < 4:
        return False
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


# 유저 ID 값으로 조회
def get_user(user_id: str):
    """ID로 사용자 조회."""
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM h_user WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    return user


# 유저들의 로그인 시도를 이력 테이블에 저장
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



# 유저들의 로그인 이력 조회 
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



# ==========================================
# >> 사용자 관리 함수 (관리자용)
# ==========================================
# 모든 사용자 조회 (비밀번호 제외, 페이징 포함)
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

def check_user_id(user_id: str) -> bool:
    """사용자 ID 중복 확인. 이미 존재하면 True 반환."""
    conn = get_db_connection()
    user = conn.execute('SELECT 1 FROM h_user WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    return user is not None

def create_user(user_data: dict):
    """새 사용자 생성."""
    conn = get_db_connection()
    
    # 비밀번호 해시
    if 'password' in user_data and user_data['password']:
         password_hash = hashlib.sha256(user_data['password'].encode()).hexdigest()
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
    except sqlite3.IntegrityError:
        conn.close()
        raise ValueError("이미 존재하는 사용자 ID입니다")
    finally:
        conn.close()

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




# ==========================================
# >> MCP Tool 사용 이력 관리 함수 (관리자용)
# ==========================================
def log_tool_usage(user_uid: int, tool_nm: str, tool_params: str, success: bool, result: str):
    """MCP Tool 사용 이력을 기록."""
    conn = get_db_connection()
    status = 'SUCCESS' if success else 'FAIL'
    
    conn.execute('''
    INSERT INTO h_mcp_tool_usage (user_uid, tool_nm, tool_params, tool_success, tool_result, reg_dt)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_uid, tool_nm, tool_params, status, result, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    
    conn.commit()
    conn.close()

# MCP Tool 사용 이력 조회 
## => 페이징 포함 (26.01.23)
def get_tool_usage_logs(page: int = 1, size: int = 20, 
                        search_user_id: str = None, search_tool_nm: str = None, search_success: str = None):
    """MCP Tool 사용 이력을 조회 (페이징 + 필터링)."""
    conn = get_db_connection()
    offset = (page - 1) * size
    
    # 기본 쿼리 및 파라미터 구성
    base_where = " FROM h_mcp_tool_usage t LEFT JOIN h_user u ON t.user_uid = u.uid WHERE 1=1"
    params = []
    
    if search_user_id:
        base_where += " AND u.user_id LIKE ?"
        params.append(f"%{search_user_id}%")
        
    if search_tool_nm:
        base_where += " AND t.tool_nm LIKE ?"
        params.append(f"%{search_tool_nm}%")
        
    if search_success and search_success != 'ALL':
        base_where += " AND t.tool_success = ?"
        params.append(search_success)
    
    # 전체 개수 조회
    count_query = "SELECT COUNT(*)" + base_where
    cursor = conn.execute(count_query, tuple(params))
    total = cursor.fetchone()[0]
    
    # 이력 조회
    query = f'''
        SELECT 
            t.id,
            t.tool_nm,
            t.tool_params,
            t.tool_success,
            t.tool_result,
            t.reg_dt,
            u.user_id,
            u.user_nm
        {base_where}
        ORDER BY t.reg_dt DESC
        LIMIT ? OFFSET ?
    '''
    # LIMIT, OFFSET 파라미터 추가
    params.extend([size, offset])
    
    cursor = conn.execute(query, tuple(params))
    rows = cursor.fetchall()
    
    conn.close()
    
    # dict 형태로 변환
    items = []
    for row in rows:
        items.append({
            "id": row['id'],
            "tool_nm": row['tool_nm'],
            "tool_params": row['tool_params'],
            "tool_success": row['tool_success'],
            "tool_result": row['tool_result'],
            "reg_dt": row['reg_dt'],
            "user_id": row['user_id'],
            "user_nm": row['user_nm']
        })
        
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": items
    }


# ==========================================
# >> DB 스키마 및 데이터 관리 함수 (관리자용)
# ==========================================

def get_all_tables():
    """DB 내의 모든 테이블 목록 조회."""
    conn = get_db_connection()
    cursor = conn.cursor()
    # sqlite_sequence 등 시스템 테이블은 제외
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row['name'] for row in cursor.fetchall()]
    conn.close()
    return tables

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

def get_table_data(table_name: str, limit: int = 100):
    """특정 테이블의 데이터 조회 (단순 조회, Limit 지원)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Table 존재 여부 확인
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    if not cursor.fetchone():
        conn.close()
        raise ValueError(f"Table '{table_name}' not found")
    
    # 데이터 조회 (f-string 사용하되, table_name은 위에서 검증됨)
    # limit는 int로 강제되므로 안전
    query = f"SELECT * FROM {table_name} LIMIT ?"
    cursor.execute(query, (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows
