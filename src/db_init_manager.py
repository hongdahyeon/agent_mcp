import hashlib
from datetime import datetime
try:
    from .db_manager import get_db_connection
except ImportError:
    from db_manager import get_db_connection

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
        last_cnn_dt TEXT,
        is_enable TEXT DEFAULT 'Y'
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
    
    # 사용자 토큰 테이블 (User Token Table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_user_token (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER NOT NULL,
        token_value TEXT UNIQUE NOT NULL,
        expired_at TEXT,
        is_active TEXT DEFAULT 'Y',
        FOREIGN KEY (user_uid) REFERENCES h_user (uid)
    )
    ''')

    # MCP Tool 제한 테이블 (MCP Tool Limit Table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_mcp_tool_limit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_type TEXT NOT NULL, -- 'ROLE' or 'USER'
        target_id TEXT NOT NULL, -- 'ROLE_USER' or 'hong123'
        limit_type TEXT NOT NULL, -- 'DAILY' or 'MONTHLY'
        max_count INTEGER NOT NULL,
        description TEXT
    )
    ''')
    
    
    # 기본 제한 정책 시딩
    # 1. ROLE_USER: 일일 50회
    cursor.execute("SELECT * FROM h_mcp_tool_limit WHERE target_type='ROLE' AND target_id='ROLE_USER'")
    if not cursor.fetchone():
        cursor.execute('''
        INSERT INTO h_mcp_tool_limit (target_type, target_id, limit_type, max_count, description)
        VALUES (?, ?, ?, ?, ?)
        ''', ('ROLE', 'ROLE_USER', 'DAILY', 50, 'General User Daily Limit'))
        print("[DB] 기본 제한 정책 생성됨 (ROLE_USER: 50/Daily)")

    # 2. ROLE_ADMIN: 일일 50회 (사실상 무제한)
    cursor.execute("SELECT * FROM h_mcp_tool_limit WHERE target_type='ROLE' AND target_id='ROLE_ADMIN'")
    if not cursor.fetchone():
        cursor.execute('''
        INSERT INTO h_mcp_tool_limit (target_type, target_id, limit_type, max_count, description)
        VALUES (?, ?, ?, ?, ?)
        ''', ('ROLE', 'ROLE_ADMIN', 'DAILY', 50, 'Admin User Daily Limit'))
        print("[DB] 기본 제한 정책 생성됨 (ROLE_ADMIN: 50/Daily)")
    
    # 3. 관리자 계정이 없으면 시딩 (Seed Admin User if not exists)
    cursor.execute('SELECT * FROM h_user WHERE user_id = ?', ('admin',))
    if not cursor.fetchone():
        # 데모용 간단 해시 (실제 운영 시에는 bcrypt/argon2 사용 권장)
        password_hash = hashlib.sha256("1234".encode()).hexdigest()
        cursor.execute('''
        INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt, is_enable)
        VALUES (?, ?, ?, ?, ?, 'Y')
        ''', ('admin', password_hash, '관리자', 'ROLE_ADMIN', datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        print("[DB] 관리자 계정 생성됨 (ID: admin / PW: 1234)")
    
    # 4. h_user 테이블 테이블 마이그레이션 (is_enable 컬럼)
    # 위 CREATE TABLE에 이미 is_enable이 있지만, 기존 DB를 위해 체크
    cursor.execute("PRAGMA table_info(h_user)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'is_enable' not in columns:
        print("[DB] 마이그레이션: h_user 테이블에 is_enable 컬럼 추가")
        cursor.execute("ALTER TABLE h_user ADD COLUMN is_enable TEXT DEFAULT 'Y'")

    # 5. 비활성 유저 시딩 (테스트용)
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
