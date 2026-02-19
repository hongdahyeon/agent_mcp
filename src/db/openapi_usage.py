import sqlite3
import json
from datetime import datetime
try:
    from .connection import get_db_connection
except ImportError:
    from connection import get_db_connection

"""
    h_openapi_usage 테이블 관리
    - [1] log_openapi_usage: 사용 이력 저장
    - [2] get_openapi_usage_logs: 전체 사용 이력 조회 (페이징)
    - [3] get_openapi_stats: 대시보드용 통계 (성공/실패, 도구별 횟수)
    - [4] get_user_openapi_daily_usage: 특정 유저/토큰의 오늘 사용량
    - [5] get_user_openapi_tool_usage: 특정 유저/토큰의 오늘 도구별 사용량 상세 조회
"""

# [1] log_openapi_usage: 사용 이력 저장
def log_openapi_usage(data: dict):
    conn = get_db_connection()
    try:
        sql = '''
            INSERT INTO h_openapi_usage (
                user_uid, token_id, tool_id, method, url, status_code, success, error_msg, ip_addr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        conn.execute(sql, (
            data.get('user_uid'),
            data.get('token_id'),
            data.get('tool_id'),
            data.get('method'),
            data.get('url'),
            data.get('status_code'),
            data.get('success'),
            data.get('error_msg'),
            data.get('ip_addr')
        ))
        conn.commit()
    finally:
        conn.close()

# [2] get_openapi_usage_logs: 전체 사용 이력 조회 (페이징)
def get_openapi_usage_logs(page: int = 1, size: int = 10):
    conn = get_db_connection()
    offset = (page - 1) * size
    try:
        total = conn.execute("SELECT COUNT(*) FROM h_openapi_usage").fetchone()[0]
        
        # h_user 및 h_access_token 테이블 조인하여 이름 보강
        sql = '''
            SELECT
                log.*,
                u.user_id,
                u.user_nm,
                t.name as token_name
            FROM h_openapi_usage log
            LEFT JOIN h_user u ON log.user_uid = u.uid
            LEFT JOIN h_access_token t ON log.token_id = t.id
            ORDER BY log.id DESC
            LIMIT ? OFFSET ?
        '''
        rows = conn.execute(sql, (size, offset)).fetchall()
        
        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "page": page,
            "size": size
        }
    finally:
        conn.close()

# [3] get_openapi_stats: 대시보드용 통계
def get_openapi_stats():
    conn = get_db_connection()
    try:
        # 1. 성공/실패 통계
        res_success = conn.execute('''
            SELECT success, COUNT(*) as cnt 
            FROM h_openapi_usage 
            GROUP BY success
        ''').fetchall()
        
        # 2. 도구별 사용량 (Top 10)
        res_tools = conn.execute('''
            SELECT tool_id, COUNT(*) as cnt 
            FROM h_openapi_usage 
            GROUP BY tool_id 
            ORDER BY cnt DESC 
            LIMIT 10
        ''').fetchall()

        # 3. 사용자/토큰별 사용량
        res_users = conn.execute('''
            SELECT 
                COALESCE(u.user_nm, t.name, 'Unknown') as label,
                COUNT(*) as cnt
            FROM h_openapi_usage log
            LEFT JOIN h_user u ON log.user_uid = u.uid
            LEFT JOIN h_access_token t ON log.token_id = t.id
            GROUP BY label
            ORDER BY cnt DESC
            LIMIT 10
        ''').fetchall()
        
        return {
            "resultStats": [dict(row) for row in res_success],
            "toolStats": [dict(row) for row in res_tools],
            "userStats": [dict(row) for row in res_users]
        }
    finally:
        conn.close()

# [4] get_user_openapi_daily_usage: 오늘 사용량 조회
def get_user_openapi_daily_usage(user_uid: int = None, token_id: int = None):
    conn = get_db_connection()
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        sql = "SELECT COUNT(*) FROM h_openapi_usage WHERE substr(reg_dt, 1, 10) = ?"
        params = [today]
        
        if token_id:
            sql += " AND token_id = ?"
            params.append(token_id)
        elif user_uid:
            sql += " AND user_uid = ?"
            params.append(user_uid)
        else:
            return 0
            
        return conn.execute(sql, params).fetchone()[0]
    finally:
        conn.close()

# [5] get_user_openapi_tool_usage: 특정 유저/토큰의 오늘 도구별 사용량 상세 조회
def get_user_openapi_tool_usage(user_uid: int = None, token_id: int = None):
    conn = get_db_connection()
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        sql = '''
            SELECT tool_id, COUNT(*) as cnt 
            FROM h_openapi_usage 
            WHERE substr(reg_dt, 1, 10) = ?
        '''
        params = [today]
        
        if token_id:
            sql += " AND token_id = ?"
            params.append(token_id)
        elif user_uid:
            sql += " AND user_uid = ?"
            params.append(user_uid)
        else:
            return []
            
        sql += " GROUP BY tool_id ORDER BY cnt DESC"
        rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
