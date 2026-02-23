import sqlite3
import sys
import os

# 프로젝트 루트 (agent_mcp)를 path에 추가
# src/db/check/db_inspect.py -> check -> db -> src -> agent_mcp (4 levels)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from src.db.connection import get_db_connection
except ImportError as e:
    # 폴백: 개별 디렉토리를 path에 추가 (개발 환경 및 직접 실행 대응)
    DB_DIR = os.path.join(ROOT_DIR, "src", "db")
    if DB_DIR not in sys.path:
        sys.path.append(DB_DIR)
    try:
        from connection import get_db_connection
    except ImportError:
        print(f"[FATAL] Import failed: {e}")
        sys.exit(1)

def inspect_db():
    """데이터베이스의 테이블 및 컬럼 구조를 출력합니다."""
    print("=" * 60)
    print("Database Inspection Tool")
    print("=" * 60)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. 모든 테이블 목록 조회
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row[0] for row in cursor.fetchall()]
        
        if not tables:
            print("[INFO] No tables found in the database.")
            return

        print(f"[INFO] Found {len(tables)} tables: {', '.join(tables)}\n")
        
        for table in tables:
            print(f"--- Table: {table} ---")
            cursor.execute(f"PRAGMA table_info({table});")
            columns = cursor.fetchall()
            
            # Header
            print(f"{'CID':<4} | {'Name':<20} | {'Type':<12} | {'NotNull':<7} | {'PK':<2}")
            print("-" * 55)
            
            for col in columns:
                cid, name, col_type, notnull, dflt_value, pk = col
                print(f"{cid:<4} | {name:<20} | {col_type:<12} | {notnull:<7} | {pk:<2}")
            print()
            
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to inspect database: {e}")

if __name__ == "__main__":
    inspect_db()
