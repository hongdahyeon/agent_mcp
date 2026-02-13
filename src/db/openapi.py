import sqlite3
import json
from datetime import datetime
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

"""
    h_openapi 테이블 CRUD
    - [1] get_openapi_list: openapi 목록 조회 
    - [2] get_openapi_by_tool_id: tool_id로 openapi 조회 
    - [3] upsert_openapi: openapi 등록 및 수정 
    - [4] delete_openapi: openapi 삭제 
"""

# [1] get_openapi_list: openapi 목록 조회 
def get_openapi_list(page: int = 1, size: int = 10):
    conn = get_db_connection()
    offset = (page - 1) * size
    try:
        total = conn.execute("SELECT COUNT(*) FROM h_openapi").fetchone()[0]
        rows = conn.execute("SELECT * FROM h_openapi ORDER BY id DESC LIMIT ? OFFSET ?", (size, offset)).fetchall()
        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "page": page,
            "size": size
        }
    finally:
        conn.close()

# [2] get_openapi_by_tool_id: tool_id로 openapi 조회 
def get_openapi_by_tool_id(tool_id: str):
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT * FROM h_openapi WHERE tool_id = ?", (tool_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

# [3] upsert_openapi: openapi 등록 및 수정 
def upsert_openapi(data: dict):
    conn = get_db_connection()
    try:
        if data.get('id'):
            # Update
            fields = []
            values = []
            for k, v in data.items():
                if k != 'id' and k != 'reg_dt':
                    fields.append(f"{k} = ?")
                    values.append(v)
            values.append(data['id'])
            sql = f"UPDATE h_openapi SET {', '.join(fields)} WHERE id = ?"
            conn.execute(sql, values)
        else:
            # Insert
            fields = []
            placeholders = []
            values = []
            for k, v in data.items():
                if k != 'id':
                    fields.append(k)
                    placeholders.append('?')
                    values.append(v)
            sql = f"INSERT INTO h_openapi ({', '.join(fields)}) VALUES ({', '.join(placeholders)})"
            conn.execute(sql, values)
        conn.commit()
    finally:
        conn.close()

# [4] delete_openapi: openapi 삭제 
def delete_openapi(openapi_id: int):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM h_openapi WHERE id = ?", (openapi_id,))
        conn.commit()
    finally:
        conn.close()
