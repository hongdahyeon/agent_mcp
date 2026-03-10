import os
import sys
import json
import asyncio

# 프로젝트 루트를 sys.path에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from src.db.connection import get_db_connection
    from src.mcp_server_impl import list_tools
    
    async def main():
        # [1] DB 직접 조회 카운트
        conn = get_db_connection()
        custom_count = conn.execute("SELECT COUNT(*) FROM h_custom_tool WHERE is_active='Y'").fetchone()[0]
        openapi_count = conn.execute("SELECT COUNT(*) FROM h_openapi").fetchone()[0]
        custom_names = [r[0] for r in conn.execute("SELECT name FROM h_custom_tool WHERE is_active='Y'").fetchall()]
        openapi_names = [r[0] for r in conn.execute("SELECT tool_id FROM h_openapi").fetchall()]
        conn.close()
        
        print(f"--- Database Status ---")
        print(f"Dynamic (Custom): {custom_count}")
        print(f"Names: {custom_names}")
        print(f"OpenAPI: {openapi_count}")
        print(f"IDs: {openapi_names}")
        
        # [2] mcp_server_impl.list_tools() 결과 확인
        tools = await list_tools()
        print(f"\n--- MCP list_tools() Result ---")
        print(f"Total returned: {len(tools)}")
        print(f"Tool names: {[t.name for t in tools]}")

    if __name__ == "__main__":
        asyncio.run(main())

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
