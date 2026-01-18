## 파일 설명
## >> DB 변경 사항이 정상 적용됐는지 테스트를 위한 스크립트
## 1. h_user 테이블에 user/1234 사용자가 추가됐는지 확인
## 2. 해당 유저가 is_enable='N'인지 확인

import sqlite3
import os
import sys

# Add src to path to import db_manager
sys.path.append(os.path.join(os.getcwd(), 'src'))

try:
    from db_manager import init_db, get_db_connection
except ImportError:
    # Fallback if src is not in path or running from different dir
    sys.path.append('src')
    from db_manager import init_db, get_db_connection

def verify_seeding():
    print("1. Running init_db() to trigger seeding...")
    init_db()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("\n2. Checking 'user' account...")
    cursor.execute("SELECT user_id, is_enable, role FROM h_user WHERE user_id='user'")
    user = cursor.fetchone()
    if user:
        print(f"   User Found: {user['user_id']}")
        print(f"   Role: {user['role']}")
        print(f"   is_enable: {user['is_enable']}")
        
        if user['is_enable'] == 'N':
             print("   [OK] User is correctly disabled.")
        else:
             print("   [FAIL] User is NOT disabled.")
    else:
        print("   [FAIL] 'user' account not found.")

    conn.close()

if __name__ == "__main__":
    verify_seeding()
