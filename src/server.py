import os
import sys
import asyncio

# 프로젝트 루트를 sys.path에 추가하여 어디서든 'src' 모듈을 찾을 수 있게 합니다.
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    from src.db.init_manager import init_db
    from src.mcp_server_impl import mcp
    from mcp.server.stdio import stdio_server
except ImportError:
    from db.init_manager import init_db
    from mcp_server_impl import mcp
    from mcp.server.stdio import stdio_server

async def main():
    # 1. DB 초기화
    init_db()
    
    # 2. 통합 MCP 서버 실행 (Stdio 방식)
    print("Starting Unified MCP Server (Stdio)...", file=sys.stderr)
    async with stdio_server() as (read_stream, write_stream):
        await mcp.run(
            read_stream,
            write_stream,
            mcp.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
