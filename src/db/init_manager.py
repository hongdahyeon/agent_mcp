import hashlib
from datetime import datetime, timedelta
import sys
import json
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

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
    
    
    # 사용자 토큰 테이블 (User Token Table) - 제거됨 (26.01.30)
    cursor.execute("DROP TABLE IF EXISTS h_user_token")

    # 외부 접속용 액세스 토큰 (Access Token Table) - New (26.01.30)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_access_token (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,         -- 토큰 별칭/용도
        token TEXT UNIQUE NOT NULL, -- 실제 토큰 값 (sk_...)
        can_use TEXT DEFAULT 'Y',   -- 사용 가능 여부 (Y/N)
        is_delete TEXT DEFAULT 'N', -- 삭제 여부 (Y/N, Soft Delete)
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
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
    
    # 동적 Tool 정의 테이블 (Dynamic Tool Definition Table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_custom_tool (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description_agent TEXT,
        description_user TEXT,
        tool_type TEXT NOT NULL, -- 'SQL' or 'PYTHON'
        definition TEXT NOT NULL, -- SQL Query or Python Script
        is_active TEXT DEFAULT 'Y',
        reg_dt TEXT NOT NULL,
        created_by TEXT
    )
    ''')
    
    # 동적 Tool 파라미터 테이블 (Dynamic Tool Parameters Table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_custom_tool_param (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id INTEGER NOT NULL,
        param_name TEXT NOT NULL,
        param_type TEXT NOT NULL, -- 'STRING', 'NUMBER', 'BOOLEAN'
        is_required TEXT DEFAULT 'Y', -- 'Y' or 'N'
        description TEXT,
        FOREIGN KEY (tool_id) REFERENCES h_custom_tool (id) ON DELETE CASCADE
    )
    ''')
    
    
    # 시스템 설정 테이블 (System Config Table) - Refactored to JSON based
    # 기존 테이블이 Key-Value 구조라면 Drop하고 재생성 (Migration logic simplified for dev)
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='h_system_config'")
    row = cursor.fetchone()
    if row:
        # Check if 'conf_key' exists in definition, if so, it's old schema
        if 'conf_key' in row[0]:
            print("[DB] 기존 h_system_config 테이블 삭제 후 재생성 (Schema Change)", file=sys.stderr)
            cursor.execute("DROP TABLE h_system_config")

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_system_config (
        name TEXT PRIMARY KEY,
        configuration TEXT,
        description TEXT,
        reg_dt TEXT DEFAULT (datetime('now', 'localtime'))
    )
    ''')
    
    # 메일 발송 이력 테이블 (Email History Table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_email_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER, -- Sender User UID (NULL for AI)
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        is_scheduled INTEGER DEFAULT 0, -- 0: Immediate, 1: Scheduled
        scheduled_dt TEXT, -- YYYY-MM-DD HH:MM
        reg_dt TEXT DEFAULT (datetime('now', 'localtime')),
        sent_dt TEXT,
        status TEXT DEFAULT 'PENDING', -- PENDING, SENT, FAILED, CANCELLED
        error_msg TEXT,
        FOREIGN KEY (user_uid) REFERENCES h_user (uid)
    )
    ''')
    
    # 기본 시스템 설정 시딩 (완료 후 주석 처리됨)
    """
    gmail_config = {
        "mail.host": "smtp.gmail.com",
        "mail.port": 587,
        "mail.username": "",
        "mail.password": ""
    }
    
    default_configs = [
        ('gmail_config', json.dumps(gmail_config, ensure_ascii=False), 'Gmail SMTP Settings'),
    ]
    
    for name, config_json, desc in default_configs:
        cursor.execute("SELECT name FROM h_system_config WHERE name = ?", (name,))
        if not cursor.fetchone():
            cursor.execute('''
            INSERT INTO h_system_config (name, configuration, description, reg_dt)
            VALUES (?, ?, ?, ?)
            ''', (name, config_json, desc, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
            print(f"[DB] 시스템 설정 생성됨: {name}", file=sys.stderr)

    # 기본 제한 정책 시딩
    cursor.execute("SELECT * FROM h_mcp_tool_limit WHERE target_type='ROLE' AND target_id='ROLE_USER'")
    if not cursor.fetchone():
        cursor.execute('''
            INSERT INTO h_mcp_tool_limit (target_type, target_id, limit_type, max_count, description)
            VALUES (?, ?, ?, ?, ?)
        ''', ('ROLE', 'ROLE_USER', 'DAILY', 50, '일반 사용자 일일 제한'))
        print("[DB] 기본 제한 정책 생성됨 (ROLE_USER: 50/Daily)", file=sys.stderr)
    
    cursor.execute("SELECT * FROM h_mcp_tool_limit WHERE target_type='ROLE' AND target_id='ROLE_ADMIN'")
    if not cursor.fetchone():
        cursor.execute('''
            INSERT INTO h_mcp_tool_limit (target_type, target_id, limit_type, max_count, description)
            VALUES (?, ?, ?, ?, ?)
        ''', ('ROLE', 'ROLE_ADMIN', 'DAILY', -1, '관리자 일일 무제한'))
        print("[DB] 기본 제한 정책 생성됨 (ROLE_ADMIN: Unlimited)", file=sys.stderr)
    """
    
    # - 4. h_user 테이블 테이블 마이그레이션 (is_enable 컬럼)
    cursor.execute("PRAGMA table_info(h_user)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'is_enable' not in columns:
        cursor.execute("ALTER TABLE h_user ADD COLUMN is_enable TEXT DEFAULT 'Y'")

    # - 5. h_email_log 테이블 마이그레이션 (user_uid를 Nullable로 변경)
    # SQLite는 ALTER COLUMN을 지원하지 않으므로 테이블 재성성이 필요합니다.
    cursor.execute("PRAGMA table_info(h_email_log)")
    email_log_cols = cursor.fetchall()
    user_uid_info = next((info for info in email_log_cols if info[1] == 'user_uid'), None)
    
    if user_uid_info and user_uid_info[3] == 1: # 1이면 NOT NULL
        print("[DB] 마이그레이션: h_email_log의 user_uid 필드를 Nullable로 변경합니다.", file=sys.stderr)
        cursor.execute("PRAGMA foreign_keys=OFF")
        # 새 구조의 임시 테이블 생성
        cursor.execute('''
        CREATE TABLE h_email_log_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_uid INTEGER, -- NULL 허용으로 변경
            recipient TEXT NOT NULL,
            subject TEXT NOT NULL,
            content TEXT NOT NULL,
            is_scheduled INTEGER DEFAULT 0,
            scheduled_dt TEXT,
            reg_dt TEXT DEFAULT (datetime('now', 'localtime')),
            sent_dt TEXT,
            status TEXT DEFAULT 'PENDING',
            error_msg TEXT,
            FOREIGN KEY (user_uid) REFERENCES h_user (uid)
        )
        ''')
        # 데이터 복사
        cursor.execute("INSERT INTO h_email_log_new SELECT * FROM h_email_log")
        # 기존 테이블 삭제 및 교체
        cursor.execute("DROP TABLE h_email_log")
        cursor.execute("ALTER TABLE h_email_log_new RENAME TO h_email_log")
        cursor.execute("PRAGMA foreign_keys=ON")
        print("[DB] 마이그레이션 완료: h_email_log 테이블 구조 변경됨", file=sys.stderr)

    # 사용자 계정 재설정 (Bcrypt 적용 - 초기 시딩 완료 후 주석 처리됨)
    """
    try:
        try:
            from src.utils.auth import get_password_hash
        except ImportError:
            from utils.auth import get_password_hash
            
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
        # 1. Admin (비번: 1234)
        cursor.execute("SELECT * FROM h_user WHERE user_id = 'admin'")
        if not cursor.fetchone():
            admin_pw = get_password_hash("1234")
            cursor.execute('''
            INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt, is_enable)
            VALUES (?, ?, ?, ?, ?, 'Y')
            ''', ('admin', admin_pw, '관리자', 'ROLE_ADMIN', timestamp))
            print("[DB] 관리자 계정 생성됨 (ID: admin / PW: 1234)", file=sys.stderr)
    
        # 2. User (비번: 1234, 사용 승인됨)
        cursor.execute("SELECT * FROM h_user WHERE user_id = 'user'")
        if not cursor.fetchone():
            user_pw = get_password_hash("1234")
            cursor.execute('''
            INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt, is_enable)
            VALUES (?, ?, ?, ?, ?, 'Y')
            ''', ('user', user_pw, '사용자', 'ROLE_USER', timestamp))
            print("[DB] 테스트 유저 생성됨 (ID: user / PW: 1234)", file=sys.stderr)
    
        # 3. External (비번: external_pass_1234)
        cursor.execute("SELECT * FROM h_user WHERE user_id = 'external'")
        if not cursor.fetchone():
            ext_pw = get_password_hash("external_pass_1234")
            cursor.execute('''
            INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt, is_enable)
            VALUES (?, ?, ?, ?, ?, 'Y')
            ''', ('external', ext_pw, 'External System', 'ROLE_ADMIN', timestamp))
            print("[DB] 외부 연동용 유저 생성됨 (ID: external)", file=sys.stderr)
        
    except Exception as e:
        print(f"[DB] 사용자 시딩 중 오류 발생: {e}", file=sys.stderr)
    """
    conn.commit()

    # - 8. ROLE_ADMIN 제한 무제한(-1)으로 업데이트 (마이그레이션) - 주석 처리됨
    # cursor.execute("UPDATE h_mcp_tool_limit SET max_count = -1 WHERE target_type='ROLE' AND target_id='ROLE_ADMIN' AND max_count = 50")
    # if cursor.rowcount > 0:
    #     print("[DB] 마이그레이션: ROLE_ADMIN 일일 제한을 무제한(-1)으로 변경", file=sys.stderr)

    conn.commit()
    conn.close()
