from datetime import datetime
from .connection import get_db_connection
from .mcp_tool_usage import get_user_daily_usage

"""
    h_mcp_tool_limit 테이블 관련
    - [1] get_user_limit: 사용자에게 적용될 일일 제한 횟수 조회 (User 설정 > Role 설정 > 기본값)
    - [2] get_admin_usage_stats: 관리자용: 모든 사용자의 금일 사용량 및 제한 정보 통계
    - [3] get_limit_list: 제한 정책 전체 목록 조회
    - [4] upsert_limit: 제한 정책 생성/수정
    - [5] delete_limit: 제한 정책 삭제
"""

# [1] get_user_limit: 사용자에게 적용될 일일 제한 횟수 조회 (User 설정 > Role 설정 > 기본값)
def get_user_limit(user_uid: int, role: str) -> int:
    """사용자에게 적용될 일일 제한 횟수 조회 (User 설정 > Role 설정 > 기본값)."""
    conn = get_db_connection()
    
    # 1. 사용자 개별 설정 확인
    limit_row = conn.execute(
        "SELECT max_count FROM h_mcp_tool_limit WHERE target_type='USER' AND target_id=?", 
        (str(user_uid),)
    ).fetchone()
    
    if limit_row:
        conn.close()
        return limit_row[0]
        
    # 2. 역할(Role) 설정 확인
    limit_row = conn.execute(
        "SELECT max_count FROM h_mcp_tool_limit WHERE target_type='ROLE' AND target_id=?", 
        (role,)
    ).fetchone()
    
    conn.close()
    
    if limit_row:
        return limit_row[0]
        
    # 3. 설정이 없으면 기본적으로 0 (사용 불가) 또는 안전한 기본값 반환
    return 0 


# [2] get_admin_usage_stats: 관리자용: 모든 사용자의 금일 사용량 및 제한 정보 통계
def get_admin_usage_stats() -> list[dict]:
    """관리자용: 모든 사용자의 금일 사용량 및 제한 정보 통계."""
    conn = get_db_connection()
    
    # 1. 전체 활성 유저 조회
    users = conn.execute("SELECT uid, user_id, user_nm, role FROM h_user WHERE is_enable='Y'").fetchall()
    
    stats = []
    for user in users:
        uid = user['uid']
        role = user['role']
        
        # 사용량 (재사용)
        usage_count = get_user_daily_usage(uid)
        
        # 제한량 (재사용)
        limit = get_user_limit(uid, role)
        
        remaining = -1 if limit == -1 else (limit - usage_count)
        if remaining < 0 and limit != -1: remaining = 0
        
        stats.append({
            "user_id": user['user_id'],
            "user_nm": user['user_nm'],
            "role": role,
            "usage": usage_count,
            "limit": limit,
            "remaining": remaining
        })
        
    conn.close()
    return stats


# [3] get_limit_list: 제한 정책 전체 목록 조회
def get_limit_list() -> list[dict]:
    """제한 정책 전체 목록 조회."""
    conn = get_db_connection()
    
    rows = conn.execute("SELECT id, target_type, target_id, limit_type, max_count, description FROM h_mcp_tool_limit ORDER BY target_type DESC, target_id ASC").fetchall()
    
    limits = []
    for row in rows:
        limits.append({
            "id": row['id'],
            "target_type": row['target_type'],
            "target_id": row['target_id'],
            "limit_type": row['limit_type'],
            "max_count": row['max_count'],
            "description": row['description']
        })
        
    conn.close()
    return limits


# [4] upsert_limit: 제한 정책 생성/수정
# -> {target_type} and {target_id}로 중복체크 후 덮어쓰기 진행
# (ex) {ROLE} and {USER_ROLE}로 이미 있다면, 덮어쓰기
def upsert_limit(target_type: str, target_id: str, max_count: int, description: str = ""):
    """제한 정책 생성/수정 (이미 존재하면 Update, 없으면 Insert)."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 존재 여부 확인
    cur.execute("SELECT id FROM h_mcp_tool_limit WHERE target_type=? AND target_id=?", (target_type, target_id))
    row = cur.fetchone()
    
    if row:
        # Update
        cur.execute("""
            UPDATE h_mcp_tool_limit 
            SET max_count=?, description=?, limit_type='DAILY' 
            WHERE id=?
        """, (max_count, description, row['id']))
    else:
        # Insert
        cur.execute("""
            INSERT INTO h_mcp_tool_limit (target_type, target_id, limit_type, max_count, description)
            VALUES (?, ?, 'DAILY', ?, ?)
        """, (target_type, target_id, max_count, description))
        
    conn.commit()
    conn.close()


# [5] delete_limit: 제한 정책 삭제
def delete_limit(limit_id: int):
    """제한 정책 삭제."""
    conn = get_db_connection()
    conn.execute("DELETE FROM h_mcp_tool_limit WHERE id=?", (limit_id,))
    conn.commit()
    conn.close()
