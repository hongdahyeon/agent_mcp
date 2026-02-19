import sqlite3
import json
from datetime import datetime
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

"""
    h_openapi 테이블 CRUD
    - [1] get_openapi_list: openapi 목록 조회 (검색 지원)
    - [2] get_openapi_by_tool_id: tool_id로 openapi 조회 
    - [3] upsert_openapi: openapi 등록 및 수정 
    - [4] delete_openapi: openapi 삭제 
"""

# [1] get_openapi_list: openapi 목록 조회 (검색 지원)
def get_openapi_list(page: int = 1, size: int = 10, q: str = None, category_id: int = None, tag: str = None):
    conn = get_db_connection()
    offset = (page - 1) * size
    
    where_clauses = []
    params = []
    
    if q:
        where_clauses.append("(name_ko LIKE ? OR tool_id LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    
    if category_id:
        where_clauses.append("category_id = ?")
        params.append(category_id)
        
    if tag:
        # 태그명으로 필터링 (JOIN 필요)
        where_clauses.append("""
            id IN (
                SELECT m.openapi_id 
                FROM h_openapi_tag_map m 
                JOIN h_openapi_tag t ON m.tag_id = t.id 
                WHERE t.name = ?
            )
        """)
        params.append(tag)
        
    where_sql = ""
    if where_clauses:
        where_sql = " WHERE " + " AND ".join(where_clauses)
        
    try:
        # Total count with filters
        total_sql = f"SELECT COUNT(*) FROM h_openapi{where_sql}"
        total = conn.execute(total_sql, params).fetchone()[0]
        
        # Rows with filters and pagination
        rows_sql = f"SELECT * FROM h_openapi{where_sql} ORDER BY id DESC LIMIT ? OFFSET ?"
        rows_params = params + [size, offset]
        rows = conn.execute(rows_sql, rows_params).fetchall()
        
        items = []
        for row in rows:
            item = dict(row)
            # 카테고리명 보완
            if item.get('category_id'):
                cat = conn.execute("SELECT name FROM h_openapi_category WHERE id = ?", (item['category_id'],)).fetchone()
                item['category_name'] = cat[0] if cat else None
            else:
                item['category_name'] = None
                
            # 태그 정보 추가
            from .openapi_meta import get_openapi_tags
            item['tags'] = get_openapi_tags(item['id'])
            items.append(item)

        return {
            "items": items,
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
        row = conn.execute("""
            SELECT o.*, c.name as category_name
            FROM h_openapi o
            LEFT JOIN h_openapi_category c ON o.category_id = c.id
            WHERE o.tool_id = ?
        """, (tool_id,)).fetchone()
        
        if row:
            item = dict(row)
            # 태그 정보 추가
            from .openapi_meta import get_openapi_tags
            item['tags'] = get_openapi_tags(item['id'])
            return item
        return None
    finally:
        conn.close()

# [3] upsert_openapi: openapi 등록 및 수정 
def upsert_openapi(data: dict):
    # 실제 db 컬럼만 추출
    allowed_columns = [
        'tool_id', 'name_ko', 'org_name', 'method', 'api_url', 
        'auth_type', 'auth_param_nm', 'auth_key_val', 'params_schema', 
        'description_agent', 'description_info', 'batch_id', 'category_id'
    ]
    
    # 태그 정보 따로 보관
    tags = data.pop('tags', None)
    
    # DB에 저장할 데이터 필터링
    db_data = {k: v for k, v in data.items() if k in allowed_columns}
    
    conn = get_db_connection()
    try:
        openapi_id = data.get('id')
        if openapi_id:
            # Update
            fields = []
            values = []
            for k, v in db_data.items():
                fields.append(f"{k} = ?")
                values.append(v)
            values.append(openapi_id)
            sql = f"UPDATE h_openapi SET {', '.join(fields)} WHERE id = ?"
            conn.execute(sql, values)
        else:
            # Insert
            fields = []
            placeholders = []
            values = []
            for k, v in db_data.items():
                fields.append(k)
                placeholders.append('?')
                values.append(v)
            sql = f"INSERT INTO h_openapi ({', '.join(fields)}) VALUES ({', '.join(placeholders)})"
            cursor = conn.cursor()
            cursor.execute(sql, values)
            openapi_id = cursor.lastrowid
        
        # 태그 매핑 업데이트
        if tags is not None:
            from .openapi_meta import update_openapi_tags
            update_openapi_tags(openapi_id, tags, conn=conn)
            
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
