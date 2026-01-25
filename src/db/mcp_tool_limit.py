from datetime import datetime
from .connection import get_db_connection
from .mcp_tool_usage import get_user_daily_usage

"""
    h_mcp_tool_limit 테이블 관련
    - [1] get_user_limit: 사용자에게 적용될 일일 제한 횟수 조회 (User 설정 > Role 설정 > 기본값)
    - [2] get_admin_usage_stats: 관리자용: 모든 사용자의 금일 사용량 및 제한 정보 통계
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
