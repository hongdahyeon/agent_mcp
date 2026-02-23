from datetime import datetime
import sqlite3
import sys
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

def init_db():
    """데이터베이스 테이블 구조(Schema)를 최신 상태로 생성합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. 사용자 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_user (
        uid INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        user_nm TEXT NOT NULL,
        role TEXT DEFAULT 'ROLE_USER',
        last_cnn_dt TEXT,
        is_enable TEXT DEFAULT 'Y',
        is_locked TEXT DEFAULT 'N',
        login_fail_count INTEGER DEFAULT 0
    )
    ''')
    
    # 2. 로그인 이력 테이블
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
    
    # 3. MCP Tool 사용 이력 테이블
    # - (26.02.24) token_id 컬럼 추가
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_mcp_tool_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER,
        token_id INTEGER,
        tool_nm TEXT NOT NULL,
        tool_params TEXT,
        tool_success TEXT,
        tool_result TEXT,
        reg_dt TEXT NOT NULL,
        FOREIGN KEY (user_uid) REFERENCES h_user (uid),
        FOREIGN KEY (token_id) REFERENCES h_access_token (id)
    )
    ''')
    
    # 4. 외부 접속용 액세스 토큰
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_access_token (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        can_use TEXT DEFAULT 'Y',
        is_delete TEXT DEFAULT 'N',
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
    ''')

    # 5. MCP Tool 제한 테이블 (Agent 전용)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_mcp_tool_limit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        limit_type TEXT NOT NULL,
        max_count INTEGER NOT NULL,
        description TEXT
    )
    ''')
    
    # 6. 동적 Tool 정의 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_custom_tool (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description_agent TEXT,
        description_user TEXT,
        tool_type TEXT NOT NULL,
        definition TEXT NOT NULL,
        is_active TEXT DEFAULT 'Y',
        reg_dt TEXT NOT NULL,
        created_by TEXT
    )
    ''')
    
    # 7. 동적 Tool 파라미터 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_custom_tool_param (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id INTEGER NOT NULL,
        param_name TEXT NOT NULL,
        param_type TEXT NOT NULL,
        is_required TEXT DEFAULT 'Y',
        description TEXT,
        FOREIGN KEY (tool_id) REFERENCES h_custom_tool (id) ON DELETE CASCADE
    )
    ''')
    
    # 8. 파일 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_file (
        file_uid INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id VARCHAR(1000) NOT NULL UNIQUE,
        file_nm VARCHAR(1000),
        org_file_nm VARCHAR(1000) NOT NULL,
        file_path VARCHAR(2000) NOT NULL,
        file_url VARCHAR(2000) NOT NULL,
        file_size BIGINT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        extension VARCHAR(20) NOT NULL,
        down_cnt INT DEFAULT 0,
        storage_tp VARCHAR(32) NOT NULL,
        use_at CHAR(1) DEFAULT 'Y' NOT NULL,
        delete_at CHAR(1) DEFAULT 'N' NOT NULL,
        reg_dt TIMESTAMP NOT NULL,
        reg_uid VARCHAR(100) NOT NULL,
        batch_id VARCHAR(100)
    )
    ''')
    
    # 9. 파일 로그 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_file_log (
        uid INTEGER PRIMARY KEY AUTOINCREMENT,
        file_uid INTEGER NOT NULL,
        file_id VARCHAR(1000) NOT NULL,
        reg_uid VARCHAR(100) NOT NULL,
        reg_dt TIMESTAMP NOT NULL,
        FOREIGN KEY (file_uid) REFERENCES h_file (file_uid)
    )
    ''')

    # 10. 시스템 설정 테이블 (JSON 기반)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_system_config (
        name TEXT PRIMARY KEY,
        configuration TEXT,
        description TEXT,
        reg_dt TEXT DEFAULT (datetime('now', 'localtime'))
    )
    ''')
    
    # 11. 메일 발송 이력 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_email_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER,
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
    
    # 12. OpenAPI Proxy 관리 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_openapi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id TEXT UNIQUE NOT NULL,
        name_ko TEXT NOT NULL,
        org_name TEXT,
        method TEXT NOT NULL,
        api_url TEXT NOT NULL,
        auth_type TEXT NOT NULL,
        auth_param_nm TEXT,
        auth_key_val TEXT,
        params_schema TEXT,
        description_agent TEXT,
        description_info TEXT,
        category_id INTEGER,
        batch_id TEXT,
        reg_dt TEXT DEFAULT (datetime('now', 'localtime'))
    )
    ''')

    # 13. OpenAPI 사용 이력 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_openapi_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER,
        token_id INTEGER,
        tool_id TEXT NOT NULL,
        method TEXT,
        url TEXT,
        status_code INTEGER,
        success TEXT,
        error_msg TEXT,
        reg_dt TEXT DEFAULT (datetime('now', 'localtime')),
        ip_addr TEXT,
        FOREIGN KEY (user_uid) REFERENCES h_user (uid),
        FOREIGN KEY (token_id) REFERENCES h_access_token (id)
    )
    ''')

    # 14. OpenAPI 사용 제한 정책 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_openapi_limit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        max_count INTEGER NOT NULL,
        description TEXT,
        reg_dt TEXT DEFAULT (datetime('now', 'localtime'))
    )
    ''')

    # 15. OpenAPI 카테고리 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_openapi_category (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        reg_dt TEXT DEFAULT (datetime('now', 'localtime'))
    )
    ''')

    # 16. OpenAPI 태그 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_openapi_tag (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        reg_dt TEXT DEFAULT (datetime('now', 'localtime'))
    )
    ''')

    # 17. OpenAPI 태그 매핑 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_openapi_tag_map (
        openapi_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (openapi_id, tag_id),
        FOREIGN KEY (openapi_id) REFERENCES h_openapi (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES h_openapi_tag (id) ON DELETE CASCADE
    )
    ''')

    conn.commit()
    conn.close()
    print("[DB] Schema initialization completed.", file=sys.stderr)
