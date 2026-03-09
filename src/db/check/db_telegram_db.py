import sqlite3
import os
import sys
from dotenv import load_dotenv

# 프로젝트 루트 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.db.connection import get_db_connection

def migrate_telegram_column():
    """h_user 테이블에 telegram_chat_id 컬럼을 추가하고 기존 계정에 세팅합니다."""
    print("=" * 60)
    print("TELEGRAM CHAT ID MIGRATION TOOL")
    print("=" * 60)

    load_dotenv()
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not chat_id:
        print("[ERROR] .env 파일에 TELEGRAM_CHAT_ID가 설정되어 있지 않습니다.")
        return

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. 컬럼 존재 여부 확인
        cursor.execute("PRAGMA table_info(h_user)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'telegram_chat_id' not in columns:
            print("[1/2] Adding 'telegram_chat_id' column to 'h_user' table...")
            cursor.execute("ALTER TABLE h_user ADD COLUMN telegram_chat_id TEXT")
            print(" - Column added successfully.")
        else:
            print("[1/2] Column 'telegram_chat_id' already exists. Skipping add.")

        # 2. 기존 계정 업데이트 (admin, user)
        print(f"[2/2] Updating existing accounts with Chat ID: {chat_id}...")
        cursor.execute('''
            UPDATE h_user
            SET telegram_chat_id = ?
            WHERE telegram_chat_id IS NULL OR telegram_chat_id = ''
        ''', (chat_id,))
        
        updated_count = cursor.rowcount
        print(f" - {updated_count} accounts updated.")

        conn.commit()
        conn.close()
        print("\n[SUCCESS] Migration completed successfully.")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")

if __name__ == "__main__":
    migrate_telegram_column()
