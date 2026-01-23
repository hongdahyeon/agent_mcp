## 파일 설명
## >> DB 변경 사항이 정상 적용됐는지 테스트를 위한 스크립트
## 1. h_user 테이블에 is_enable 컬럼이 추가됐는지 확인
## 2. admin user의 is_enable 값이 Y인지 확인

import sqlite3
import os
import sys

# Add src to path to import db_manager
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from src.db_init_manager import init_db
    from src.db_manager import get_db_connection
except ImportError:
    from db_init_manager import init_db
    from db_manager import get_db_connection

def verify_schema():
    print("1. Running init_db() to trigger migration...")
    init_db()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("\n2. Checking table info for h_user...")
    cursor.execute("PRAGMA table_info(h_user)")
    columns = cursor.fetchall()
    
    is_enable_found = False
    for col in columns:
        # col structure: (cid, name, type, notnull, dflt_value, pk)
        name = col[1]
        if name == 'is_enable':
            is_enable_found = True
            dflt = col[4]
            print(f"   [OK] Found column 'is_enable' with default value: {dflt}")
            break
            
    if not is_enable_found:
        print("   [FAIL] Column 'is_enable' NOT found!")
    
    print("\n3. Checking admin user status...")
    cursor.execute("SELECT user_id, is_enable FROM h_user WHERE user_id='admin'")
    admin = cursor.fetchone()
    if admin:
        print(f"   Admin User: {admin['user_id']}, is_enable: {admin['is_enable']}")
        if admin['is_enable'] == 'Y':
             print("   [OK] Admin user is enabled.")
        else:
             print("   [WARN] Admin user is NOT enabled (Unexpected default?).")
    else:
        print("   [FAIL] Admin user not found.")

    conn.close()

if __name__ == "__main__":
    verify_schema()
