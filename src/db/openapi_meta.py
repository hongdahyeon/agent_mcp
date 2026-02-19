import sqlite3
from datetime import datetime
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

"""
    h_openapi_category, h_openapi_tag, h_openapi_tag_map 테이블 CRUD
    - [1] get_openapi_categories: openapi 카테고리 목록 조회 
    - [2] upsert_openapi_category: openapi 카테고리 등록 및 수정 
    - [3] update_openapi_category: openapi 카테고리 수정
    - [4] delete_openapi_category: openapi 카테고리 삭제 
    - [5] search_openapi_tags: openapi 태그 검색 
    - [6] upsert_openapi_tag: openapi 태그 등록 및 수정 
    - [7] update_openapi_tags: openapi 태그 업데이트 
    - [8] delete_openapi_tag: openapi 태그 삭제 
    - [9] update_openapi_tags: openapi 태그 등록 및 수정
    - [10] get_openapi_tags: openapi 태그 조회 
    - [11] get_openapi_by_meta: 카테고리 또는 태그에 속한 OpenAPI 목록 조회 
    - [12] get_openapi_meta_stats: 카테고리 및 태그 통계 조회 
"""

# [1]  get_openapi_categories: openapi 카테고리 목록 조회
def get_openapi_categories():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT * FROM h_openapi_category ORDER BY name ASC").fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

# [2] upsert_openapi_category: openapi 카테고리 등록 및 수정
def upsert_openapi_category(name: str):
    conn = get_db_connection()
    try:
        # Check existing
        row = conn.execute("SELECT id FROM h_openapi_category WHERE name = ?", (name,)).fetchone()
        if row:
            return row[0]
        
        cursor = conn.cursor()
        cursor.execute("INSERT INTO h_openapi_category (name) VALUES (?)", (name,))
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

# [3] update_openapi_category: openapi 카테고리 수정
def update_openapi_category(category_id: int, new_name: str):
    conn = get_db_connection()
    try:
        conn.execute("UPDATE h_openapi_category SET name = ? WHERE id = ?", (new_name, category_id))
        conn.commit()
    finally:
        conn.close()

# [4] delete_openapi_category: openapi 카테고리 삭제
def delete_openapi_category(category_id: int):
    conn = get_db_connection()
    try:
        # Check if any OpenAPI is associated
        count = conn.execute("SELECT COUNT(*) FROM h_openapi WHERE category_id = ?", (category_id,)).fetchone()[0]
        if count > 0:
            raise Exception("이 카테고리를 사용하는 OpenAPI가 있어 삭제할 수 없습니다.")
            
        conn.execute("DELETE FROM h_openapi_category WHERE id = ?", (category_id,))
        conn.commit()
    finally:
        conn.close()

# [5] search_openapi_tags: openapi 태그 검색
def search_openapi_tags(keyword: str):
    conn = get_db_connection()
    try:
        # Like search for debounce
        rows = conn.execute("SELECT * FROM h_openapi_tag WHERE name LIKE ? LIMIT 10", (f"%{keyword}%",)).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

# [6] upsert_openapi_tag: openapi 태그 등록 및 수정
def upsert_openapi_tag(name: str, conn=None):
    _conn = conn or get_db_connection()
    try:
        row = _conn.execute("SELECT id FROM h_openapi_tag WHERE name = ?", (name,)).fetchone()
        if row:
            return row[0]
        
        cursor = _conn.cursor()
        cursor.execute("INSERT INTO h_openapi_tag (name) VALUES (?)", (name,))
        if not conn: _conn.commit()
        return cursor.lastrowid
    finally:
        if not conn: _conn.close()

# [7] update_openapi_tag: openapi 태그 수정
def update_openapi_tag(tag_id: int, new_name: str):
    conn = get_db_connection()
    try:
        conn.execute("UPDATE h_openapi_tag SET name = ? WHERE id = ?", (new_name, tag_id))
        conn.commit()
    finally:
        conn.close()

# [8] delete_openapi_tag: openapi 태그 삭제
def delete_openapi_tag(tag_id: int):
    conn = get_db_connection()
    try:
        # Check if any OpenAPI is associated
        count = conn.execute("SELECT COUNT(*) FROM h_openapi_tag_map WHERE tag_id = ?", (tag_id,)).fetchone()[0]
        if count > 0:
            raise Exception("이 태그를 사용하는 OpenAPI가 있어 삭제할 수 없습니다.")
            
        conn.execute("DELETE FROM h_openapi_tag WHERE id = ?", (tag_id,))
        conn.commit()
    finally:
        conn.close()

# [9] update_openapi_tags: openapi 태그 업데이트
def update_openapi_tags(openapi_id: int, tag_names: list[str], conn=None):
    _conn = conn or get_db_connection()
    try:
        # 1. Clear existing mappings
        _conn.execute("DELETE FROM h_openapi_tag_map WHERE openapi_id = ?", (openapi_id,))
        
        # 2. Upsert tags and create new mappings
        for tag_name in tag_names:
            if not tag_name.strip(): continue
            
            # Tag upsert
            tag_id = upsert_openapi_tag(tag_name, conn=_conn)
            _conn.execute("INSERT INTO h_openapi_tag_map (openapi_id, tag_id) VALUES (?, ?)", (openapi_id, tag_id))
        
        if not conn: _conn.commit()
    finally:
        if not conn: _conn.close()

# [10] get_openapi_tags: openapi 태그 조회
def get_openapi_tags(openapi_id: int):
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT t.name 
            FROM h_openapi_tag t
            JOIN h_openapi_tag_map m ON t.id = m.tag_id
            WHERE m.openapi_id = ?
        """, (openapi_id,)).fetchall()
        return [row[0] for row in rows]
    finally:
        conn.close()

# [11] get_openapi_by_meta: 카테고리 또는 태그에 속한 OpenAPI 목록 조회
def get_openapi_by_meta(meta_type: str, meta_id: int):
    """카테고리 또는 태그에 속한 OpenAPI 목록 조회"""
    conn = get_db_connection()
    try:
        if meta_type == 'category':
            rows = conn.execute("SELECT id, name_ko, tool_id FROM h_openapi WHERE category_id = ?", (meta_id,)).fetchall()
        elif meta_type == 'tag':
            rows = conn.execute("""
                SELECT o.id, o.name_ko, o.tool_id 
                FROM h_openapi o
                JOIN h_openapi_tag_map m ON o.id = m.openapi_id
                WHERE m.tag_id = ?
            """, (meta_id,)).fetchall()
        else:
            return []
        return [dict(row) for row in rows]
    finally:
        conn.close()

# [12] get_openapi_meta_stats: 카테고리 및 태그 통계 조회
def get_openapi_meta_stats():
    conn = get_db_connection()
    try:
        # Category stats
        cat_rows = conn.execute("""
            SELECT c.id, c.name, COUNT(o.id) as count
            FROM h_openapi_category c
            LEFT JOIN h_openapi o ON c.id = o.category_id
            GROUP BY c.id, c.name
            ORDER BY count DESC
        """).fetchall()
        
        # Tag stats
        tag_rows = conn.execute("""
            SELECT t.id, t.name, COUNT(m.openapi_id) as count
            FROM h_openapi_tag t
            LEFT JOIN h_openapi_tag_map m ON t.id = m.tag_id
            GROUP BY t.id, t.name
            ORDER BY count DESC
            LIMIT 20
        """).fetchall()
        
        return {
            "categories": [dict(r) for r in cat_rows],
            "tags": [dict(r) for r in tag_rows]
        }
    finally:
        conn.close()
