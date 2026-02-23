from datetime import datetime
from .connection import get_db_connection

"""
    h_mcp_tool_usage 테이블 관련
    - [1] log_tool_usage: MCP Tool 사용 이력을 기록
    - [2] get_tool_usage_logs: MCP Tool 사용 이력을 조회 (페이징 + 필터링)
    - [3] get_tool_stats: 도구별 사용 통계 집계 (Total, Success, Failure)
    - [4] get_user_daily_usage: 사용자의 금일 도구 사용 횟수 조회
    - [5] get_user_tool_stats: 사용자별 도구 사용 횟수 집계
    - [6] get_user_tool_stats: 사용자별 도구 사용 횟수 집계
    - [7] get_mcp_hourly_daily_stats: 시간대별/요일별 사용 통계 (Heatmap)
    - [8] get_mcp_user_tool_detail: 특정 유저의 전체 기간 도구별 사용량 (Top 5)
"""

# [1] log_tool_usage: MCP Tool 사용 이력 관리 함수 (관리자용)
def log_tool_usage(
    user_uid: int = None,
    tool_nm: str = "",
    tool_params: str = "",
    success: bool = True,
    result: str = "",
    token_id: int = None
):
    """MCP Tool 사용 이력을 기록."""
    conn = get_db_connection()
    status = 'SUCCESS' if success else 'FAIL'
    
    conn.execute('''
    INSERT INTO h_mcp_tool_usage (user_uid, token_id, tool_nm, tool_params, tool_success, tool_result, reg_dt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (user_uid, token_id, tool_nm, tool_params, status, result, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    
    conn.commit()
    conn.close()

# [2] get_tool_usage_logs: MCP Tool 사용 이력 조회
# => 페이징 포함 (26.01.23)
def get_tool_usage_logs(page: int = 1, size: int = 20, 
                        search_user_id: str = None, search_tool_nm: str = None, search_success: str = None):
    """MCP Tool 사용 이력을 조회 (페이징 + 필터링)."""
    conn = get_db_connection()
    offset = (page - 1) * size
    
    # 기본 쿼리 및 파라미터 구성
    base_where = " FROM h_mcp_tool_usage t LEFT JOIN h_user u ON t.user_uid = u.uid WHERE 1=1"
    params = []
    
    # 조회 조건에 따라 -> where 쿼리 추가
    if search_user_id:
        base_where += " AND u.user_id LIKE ?"
        params.append(f"%{search_user_id}%")
        
    if search_tool_nm:
        base_where += " AND t.tool_nm LIKE ?"
        params.append(f"%{search_tool_nm}%")
        
    if search_success and search_success != 'ALL':
        base_where += " AND t.tool_success = ?"
        params.append(search_success)
    
    # 전체 개수 조회
    count_query = "SELECT COUNT(*)" + base_where
    cursor = conn.execute(count_query, tuple(params))
    total = cursor.fetchone()[0]
    
    # 이력 조회
    query = f'''
        SELECT 
            t.id,
            t.tool_nm,
            t.tool_params,
            t.tool_success,
            t.tool_result,
            t.reg_dt,
            u.user_id,
            u.user_nm,
            tk.name as token_name
        FROM h_mcp_tool_usage t
        LEFT JOIN h_user u ON t.user_uid = u.uid
        LEFT JOIN h_access_token tk ON t.token_id = tk.id
        WHERE 1=1
    '''
    
    # [새로고침] where 조건 추가
    where_sql = ""
    if search_user_id:
        where_sql += " AND (u.user_id LIKE ? OR tk.name LIKE ?)"
        params.extend([f"%{search_user_id}%", f"%{search_user_id}%"])
        
    if search_tool_nm:
        where_sql += " AND t.tool_nm LIKE ?"
        params.append(f"%{search_tool_nm}%")
        
    if search_success and search_success != 'ALL':
        where_sql += " AND t.tool_success = ?"
        params.append(search_success)

    query += where_sql
    query += " ORDER BY t.reg_dt DESC LIMIT ? OFFSET ?"
    # LIMIT, OFFSET 파라미터 추가
    params.extend([size, offset])
    
    cursor = conn.execute(query, tuple(params))
    rows = cursor.fetchall()
    
    conn.close()
    
    # dict 형태로 변환
    items = []
    for row in rows:
        items.append({
            "id": row['id'],
            "tool_nm": row['tool_nm'],
            "tool_params": row['tool_params'],
            "tool_success": row['tool_success'],
            "tool_result": row['tool_result'],
            "reg_dt": row['reg_dt'],
            "user_id": row['user_id'] or (f"token:{row['token_name']}" if row['token_name'] else "Unknown"),
            "user_nm": row['user_nm'] or row['token_name'] or "Unknown"
        })
        
    return {
        "total": total,
        "page": page,
        "items": items
    }

# [3] get_tool_stats: 도구별 사용 통계 집계 데이터 반환
# => 대시보드에서 사용
def get_tool_stats() -> dict:
    """도구별 사용 통계 집계 (Total, Success, Failure)."""
    conn = get_db_connection()
    
    # 도구별/성공여부별 카운트
    query = '''
        SELECT tool_nm, tool_success, COUNT(*) as cnt
        FROM h_mcp_tool_usage
        GROUP BY tool_nm, tool_success
    '''
    cursor = conn.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    stats = {}
    for row in rows:
        tool_nm = row['tool_nm']
        success_flag = row['tool_success'] # 'SUCCESS' or 'FAIL'
        count = row['cnt']
        
        if tool_nm not in stats:
            stats[tool_nm] = {'count': 0, 'success': 0, 'failure': 0}
            
        stats[tool_nm]['count'] += count
        
        # 성공 조건 체크 ('SUCCESS', 'True', 1 등)
        if str(success_flag).upper() in ['SUCCESS', 'TRUE', '1']:
            stats[tool_nm]['success'] += count
        else:
            stats[tool_nm]['failure'] += count
            
    return stats


# [4] get_user_daily_usage: 사용자의 금일 도구 사용 횟수 조회
def get_user_daily_usage(user_uid: int) -> int:
    """사용자의 금일 도구 사용 횟수 조회."""
    conn = get_db_connection()
    today_start = datetime.now().strftime("%Y-%m-%d 00:00:00")
    today_end = datetime.now().strftime("%Y-%m-%d 23:59:59")
    
    # 성공/실패 여부와 관계없이 실행 시도 횟수를 카운트함 (정책에 따라 변경 가능)
    query = '''
        SELECT COUNT(*)
        FROM h_mcp_tool_usage
        WHERE user_uid = ?
        AND reg_dt BETWEEN ? AND ?
    '''
    count = conn.execute(query, (user_uid, today_start, today_end)).fetchone()[0]
    conn.close()
    return count

# [5] get_user_tool_stats: 사용자별 도구 사용 횟수 집계 (New for Dashboard)
def get_user_tool_stats() -> dict:
    """사용자별 도구 사용 횟수 집계."""
    conn = get_db_connection()
    query = '''
        SELECT
            COALESCE(u.user_id, 'token:' || t.name, 'Unknown') as user_id, 
            COUNT(*) as cnt
        FROM h_mcp_tool_usage m
        LEFT JOIN h_user u ON m.user_uid = u.uid
        LEFT JOIN h_access_token t ON m.token_id = t.id
        GROUP BY user_id
    '''
    cursor = conn.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    stats = {}
    for row in rows:
        user_id = row['user_id']
        if not user_id:
            user_id = "Unknown"
        stats[user_id] = row['cnt']
            
    return stats


# [6] get_specific_user_tool_usage: 특정 사용자의 금일 도구별 사용 현황 상세 조회
def get_specific_user_tool_usage(user_uid: int):
    """특정 사용자의 금일 도구별 사용 현황 상세 조회."""
    conn = get_db_connection()
    today_start = datetime.now().strftime("%Y-%m-%d 00:00:00")
    today_end = datetime.now().strftime("%Y-%m-%d 23:59:59")
    
    query = '''
        SELECT tool_nm, COUNT(*) as cnt
        FROM h_mcp_tool_usage
        WHERE user_uid = ?
        AND reg_dt BETWEEN ? AND ?
        GROUP BY tool_nm
        ORDER BY cnt DESC
    '''
    rows = conn.execute(query, (user_uid, today_start, today_end)).fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

# [7] get_mcp_hourly_daily_stats: 시간대별/요일별 사용 통계 (Heatmap)
def get_mcp_hourly_daily_stats():
    """시간대별/요일별 사용 통계 (Heatmap용 데이터)"""
    conn = get_db_connection()
    # strftime('%w', ...) -> 요일 (0:일요일, 1:월요일, ..., 6:토요일)
    # strftime('%H', ...) -> 시간 (00-23)
    query = '''
        SELECT 
            strftime('%w', reg_dt) as dow, 
            strftime('%H', reg_dt) as hour, 
            COUNT(*) as cnt
        FROM h_mcp_tool_usage
        GROUP BY dow, hour
    '''
    rows = conn.execute(query).fetchall()
    conn.close()
    return [dict(row) for row in rows]

# [8] get_mcp_user_tool_detail: 특정 유저의 전체 기간 도구별 사용량 (Top 5)
def get_mcp_user_tool_detail(user_id: str):
    """특정 유저의 전체 기간 도구별 사용량 (Top 5)"""
    conn = get_db_connection()
    
    # (1) token으로 조회
    if user_id.startswith("token:"):
        token_name = user_id.replace("token:", "")
        query = '''
            SELECT tool_nm, COUNT(*) as cnt
            FROM h_mcp_tool_usage m
            JOIN h_access_token t ON m.token_id = t.id
            WHERE t.name = ?
            GROUP BY tool_nm
            ORDER BY cnt DESC
            LIMIT 5
        '''
        rows = conn.execute(query, (token_name,)).fetchall()
    else: # (2) 유저 정보로 조회
        query = '''
            SELECT tool_nm, COUNT(*) as cnt
            FROM h_mcp_tool_usage m
            JOIN h_user u ON m.user_uid = u.uid
            WHERE u.user_id = ?
            GROUP BY tool_nm
            ORDER BY cnt DESC
            LIMIT 5
        '''
        rows = conn.execute(query, (user_id,)).fetchall()
        
    conn.close()
    return [dict(row) for row in rows]
