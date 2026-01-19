import sqlite3
import sys
import os

# 현재 디렉토리를 path에 추가하여 src 모듈을 찾을 수 있게 함
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from db_manager import get_db_connection
except ImportError:
    # 실행 위치에 따라 import 경로가 다를 수 있음
    from src.db_manager import get_db_connection

def view_tool_usage_logs():
    """MCP Tool 사용 이력을 조회하여 출력합니다."""
    print("=" * 100)
    print(f"{'Time':<20} | {'User (ID)':<15} | {'Tool':<12} | {'Success':<7} | {'Params'}")
    print("=" * 100)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = '''
            SELECT 
                t.reg_dt,
                u.user_nm,
                u.user_id,
                t.tool_nm,
                t.tool_success,
                t.tool_params,
                t.tool_result
            FROM h_mcp_tool_usage t
            LEFT JOIN h_user u ON t.user_uid = u.uid
            ORDER BY t.reg_dt DESC
        '''
        cursor.execute(query)
        rows = cursor.fetchall()
        
        if not rows:
            print("  No usage history found.")
            return

        for row in rows:
            reg_dt = row['reg_dt']
            user_info = f"{row['user_nm']} ({row['user_id']})"
            tool_nm = row['tool_nm']
            success = row['tool_success']
            params = row['tool_params']
            
            # 너무 긴 파라미터는 자르기
            if len(params) > 40:
                params = params[:37] + "..."
                
            print(f"{reg_dt:<20} | {user_info:<15} | {tool_nm:<12} | {success:<7} | {params}")
            
    except sqlite3.OperationalError as e:
        print(f"Error accessing database: {e}")
        print("Maybe the table 'h_mcp_tool_usage' does not exist yet.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()
    
    print("=" * 100)

if __name__ == "__main__":
    view_tool_usage_logs()
