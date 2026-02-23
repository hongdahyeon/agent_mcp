import sqlite3
import sys
import os
import json
from datetime import datetime

# 프로젝트 루트 (agent_mcp)를 path에 추가하여 src 패키지를 찾을 수 있게 함
# d:/hong/9. project/agent_mcp/src/db/check/db_reset.py
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

if project_root not in sys.path:
    sys.path.insert(0, project_root)

# src 패키지 자체를 path에 추가하여 내부 모듈을 직접 import 할 수 있게 함
src_dir = os.path.join(project_root, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

try:
    from db.connection import get_db_connection
    from db.init_manager import init_db
    from utils.auth import get_password_hash
except ImportError as e:
    print(f"[FATAL] Import failed: {e}")
    print(f"[DEBUG] project_root: {project_root}")
    print(f"[DEBUG] sys.path: {sys.path}")
    sys.exit(1)

"""
    1. 데이터베이스의 모든 테이블 drop
    2. 스키마 초기화 (init_manager 호출)
    3. 데이터 시딩 (Seeding)
"""

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
