import sqlite3
import os

"""
    DB 연결 모듈
"""

# DB 경로 설정 (절대 경로)
# src/db/connection.py 위치 기준 -> src/db -> src -> project_root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
DB_PATH = os.path.join(PROJECT_ROOT, "agent_mcp.db")

# db 연결
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
