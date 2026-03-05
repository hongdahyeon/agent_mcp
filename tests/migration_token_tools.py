import sqlite3
import sys
import os

# 프로젝트 루트 경로 추가 (src 임포트 가능하도록)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from src.db.connection import get_db_connection
    from src.db.init_manager import init_db
except ImportError:
    from connection import get_db_connection
    from init_manager import init_db

def migrate():
    """기존 액세스 토큰들에 대해 현재 등록된 모든 도구 권한을 부여합니다."""
    print("[Migration] Starting access token permission migration...")
    
    # 1. 테이블 생성 확인
    init_db()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 2. 모든 토큰 조회
        tokens = cursor.execute("SELECT id FROM h_access_token WHERE is_delete = 'N'").fetchall()
        # 3. 모든 커스텀 도구 조회
        custom_tools = cursor.execute("SELECT id FROM h_custom_tool").fetchall()
        # 4. 모든 OpenAPI 조회
        openapis = cursor.execute("SELECT id FROM h_openapi").fetchall()
        
        print(f"[Migration] Found {len(tokens)} tokens, {len(custom_tools)} custom tools, {len(openapis)} openapis.")
        
        # 5. 권한 부여 (INSERT OR IGNORE)
        for t_row in tokens:
            t_id = t_row[0]
            
            # Custom Tools 권한 부여
            for c_row in custom_tools:
                c_id = c_row[0]
                cursor.execute("INSERT OR IGNORE INTO h_access_token_tool_map (token_id, tool_id) VALUES (?, ?)", (t_id, c_id))
            
            # OpenAPI 권한 부여
            for o_row in openapis:
                o_id = o_row[0]
                cursor.execute("INSERT OR IGNORE INTO h_access_token_openapi_map (token_id, openapi_id) VALUES (?, ?)", (t_id, o_id))
        
        conn.commit()
        print("[Migration] Permission migration completed successfully.")
        
    except Exception as e:
        print(f"[Migration] Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
