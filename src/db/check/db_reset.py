import sqlite3
import sys
import os
import json
from datetime import datetime

# 프로젝트 루트 (agent_mcp)를 path에 추가
# src/db/check/db_reset.py -> check -> db -> src -> agent_mcp (4 levels)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from src.db.connection import get_db_connection
    from src.db.init_manager import init_db
    from src.utils.auth import get_password_hash
except ImportError as e:
    # 폴백: 개별 디렉토리를 path에 추가 (개발 환경 및 직접 실행 대응)
    try:
        SRC_DIR = os.path.join(ROOT_DIR, "src")
        DB_DIR = os.path.join(SRC_DIR, "db")
        UTILS_DIR = os.path.join(SRC_DIR, "utils")
        
        for d in [SRC_DIR, DB_DIR, UTILS_DIR]:
            if d not in sys.path:
                sys.path.append(d)
        
        from connection import get_db_connection
        from init_manager import init_db
        from auth import get_password_hash
    except ImportError as second_e:
        print(f"[FATAL] Import failed: {e}")
        print(f"[DEBUG] ROOT_DIR: {ROOT_DIR}")
        print(f"[DEBUG] sys.path: {sys.path}")
        sys.exit(1)

def reset_and_seed():
    """데이터베이스의 모든 테이블을 삭제(DROP)하고, 초기화 후 기본 데이터를 삽입(SEED)합니다."""
    print("=" * 60)
    print("DATABASE RESET & SEEDING TOOL")
    print("=" * 60)
    
    confirm = input("Are you sure you want to proceed? This will DELETE EVERYTHING. (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("[CANCEL] Reset cancelled.")
        return

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. 모든 테이블 삭제
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row[0] for row in cursor.fetchall()]
        
        if tables:
            print(f"[1/3] Dropping {len(tables)} tables...")
            cursor.execute("PRAGMA foreign_keys = OFF;")
            for table in tables:
                cursor.execute(f"DROP TABLE IF EXISTS {table};")
                print(f" - Dropped: {table}")
            cursor.execute("PRAGMA foreign_keys = ON;")
            conn.commit()
        
        # 2. 스키마 초기화 (init_manager 호출)
        print("[2/3] Recreating schema...")
        conn.close() # init_db 내부에서 새로 연결할 수 있으므로 닫음
        init_db()
        
        # 3. 데이터 시딩 (Seeding)
        print("[3/3] Seeding initial data...")
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 3.1. 시스템 설정 (gmail_config)
        gmail_config = {
            "mail.host": "smtp.gmail.com",
            "mail.port": 587,
            "mail.username": "",
            "mail.password": ""
        }
        cursor.execute('''
            INSERT INTO h_system_config (name, configuration, description, reg_dt)
            VALUES (?, ?, ?, ?)
        ''', ('gmail_config', json.dumps(gmail_config, ensure_ascii=False), 'Gmail SMTP Settings', timestamp))
        print(" - Seeded: System config (gmail_config)")

        # 3.2. 기본 제한 정책
        cursor.execute('''
            INSERT INTO h_mcp_tool_limit (target_type, target_id, limit_type, max_count, description)
            VALUES (?, ?, ?, ?, ?)
        ''', ('ROLE', 'ROLE_USER', 'DAILY', 50, '일반 사용자 일일 제한'))
        cursor.execute('''
            INSERT INTO h_mcp_tool_limit (target_type, target_id, limit_type, max_count, description)
            VALUES (?, ?, ?, ?, ?)
        ''', ('ROLE', 'ROLE_ADMIN', 'DAILY', -1, '관리자 일일 무제한'))
        print(" - Seeded: MCP Tool limits (User/Admin)")

        # 3.3. 유저 계정 (admin/user)
        hashed_pw = get_password_hash("1234")
        cursor.execute('''
            INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt, is_enable)
            VALUES (?, ?, ?, ?, ?, 'Y')
        ''', ('admin', hashed_pw, '관리자', 'ROLE_ADMIN', timestamp))
        cursor.execute('''
            INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt, is_enable)
            VALUES (?, ?, ?, ?, ?, 'Y')
        ''', ('user', hashed_pw, '사용자', 'ROLE_USER', timestamp))
        print(" - Seeded: Default users (admin, user / password: 1234)")

        conn.commit()
        conn.close()
        print("\n[SUCCESS] Database reset and seeding completed successfully.")
        
    except Exception as e:
        print(f"\n[ERROR] Fail: {e}")

if __name__ == "__main__":
    reset_and_seed()
