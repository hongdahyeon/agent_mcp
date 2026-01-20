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

# db 초기화
def init_db():
    """데이터베이스 테이블 초기화 및 관리자 계정 시딩."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 사용자 테이블 (User Table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_user (
        uid INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        user_nm TEXT NOT NULL,
        role TEXT DEFAULT 'ROLE_USER',
        last_cnn_dt TEXT
    )
    ''')
    
    # 로그인 이력 테이블 (Login History Table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_login_hist (
        uid INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER,
        login_dt TEXT NOT NULL,
        login_ip TEXT,
        login_success TEXT,
        login_msg TEXT,
        FOREIGN KEY (user_uid) REFERENCES h_user (uid)
    )
    ''')
    
    # MCP Tool 사용 이력 테이블 (MCP Tool Usage Table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_mcp_tool_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER,
        tool_nm TEXT NOT NULL,
        tool_params TEXT,
        tool_success TEXT,
        tool_result TEXT,
        reg_dt TEXT NOT NULL,
        FOREIGN KEY (user_uid) REFERENCES h_user (uid)
    )
    ''')
    
    # ... existing code ...
    # 관리자 계정이 없으면 시딩 (Seed Admin User if not exists)
    cursor.execute('SELECT * FROM h_user WHERE user_id = ?', ('admin',))
    if not cursor.fetchone():
        # 데모용 간단 해시 (실제 운영 시에는 bcrypt/argon2 사용 권장)
        password_hash = hashlib.sha256("1234".encode()).hexdigest()
        cursor.execute('''
        INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt, is_enable)
        VALUES (?, ?, ?, ?, ?, 'Y')
        ''', ('admin', password_hash, '관리자', 'ROLE_ADMIN', datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        print("[DB] 관리자 계정 생성됨 (ID: admin / PW: 1234)")
    
    # ... existing code ...
    # is_enable 컬럼 존재 여부 확인 (마이그레이션)
    cursor.execute("PRAGMA table_info(h_user)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'is_enable' not in columns:
        print("[DB] 마이그레이션: h_user 테이블에 is_enable 컬럼 추가")
        cursor.execute("ALTER TABLE h_user ADD COLUMN is_enable TEXT DEFAULT 'Y'")

    # 비활성 유저 시딩 (테스트용)
    cursor.execute('SELECT * FROM h_user WHERE user_id = ?', ('user',))
    if not cursor.fetchone():
        password_hash = hashlib.sha256("1234".encode()).hexdigest()
        cursor.execute('''
        INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt, is_enable)
        VALUES (?, ?, ?, ?, ?, 'N')
        ''', ('user', password_hash, '사용자(미승인)', 'ROLE_USER', datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        print("[DB] 비활성 테스트 유저 생성됨 (ID: user / PW: 1234 / Enabled: N)")
        
    conn.commit()
    conn.close()

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
def get_login_history(limit: int = 100):
    """로그인 이력 조회 (사용자 정보 포함)."""
    conn = get_db_connection()
    query = '''
    SELECT h.uid, u.user_id, u.user_nm, h.login_dt, h.login_ip, h.login_success, h.login_msg
    FROM h_login_hist h
    LEFT JOIN h_user u ON h.user_uid = u.uid
    ORDER BY h.login_dt DESC
    LIMIT ?
    '''
    rows = conn.execute(query, (limit,)).fetchall()
    conn.close()
    
    # Row 객체를 dict로 변환
    return [dict(row) for row in rows]


# ==========================================
# >> 사용자 관리 함수 (관리자용)
# ==========================================
def get_all_users():
    """모든 사용자 조회 (비밀번호 제외, 관리자 목록용)."""
    conn = get_db_connection()
    # 보안을 위해 비밀번호 제외
    users = conn.execute('SELECT uid, user_id, user_nm, role, is_enable, last_cnn_dt FROM h_user ORDER BY uid ASC').fetchall()
    conn.close()
    return [dict(row) for row in users]

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

def get_tool_usage_logs(page: int = 1, size: int = 20):
    """MCP Tool 사용 이력을 조회 (페이징 포함)."""
    conn = get_db_connection()
    offset = (page - 1) * size
    
    # 전체 개수 조회
    cursor = conn.execute('SELECT COUNT(*) FROM h_mcp_tool_usage')
    total = cursor.fetchone()[0]
    
    # 이력 조회 (사용자 정보 조인)
    query = '''
        SELECT 
            t.id,
            t.tool_nm,
            t.tool_params,
            t.tool_success,
            t.tool_result,
            t.reg_dt,
            u.user_id,
            u.user_nm
        FROM h_mcp_tool_usage t
        LEFT JOIN h_user u ON t.user_uid = u.uid
        ORDER BY t.reg_dt DESC
        LIMIT ? OFFSET ?
    '''
    cursor = conn.execute(query, (size, offset))
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
