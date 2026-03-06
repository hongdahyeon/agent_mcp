from .connection import get_db_connection
import secrets

"""
    h_access_token 테이블
    - [1] create_access_token: 토큰 생성
    - [2] get_access_token: 토큰 조회
    - [3] get_all_access_tokens: 모든 토큰 목록 조회 (페이징 적용)
    - [4] delete_access_token: 토큰 삭제
    - [5] get_user_by_active_token: 토큰으로 사용자 조회 (SSE/Stdio 통합용)
    - [6] check_access_token_permission: 토큰별 도구 권한 검증
"""

# [1] create_access_token: 토큰 생성
def create_access_token(name: str) -> str:
    """새로운 액세스 토큰을 생성합니다."""
    # sk_ 접두사가 붙은 랜덤 토큰 생성
    token = f"sk_{secrets.token_urlsafe(32)}"
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # 1. 토큰 생성
        cursor.execute('''
            INSERT INTO h_access_token (name, token)
            VALUES (?, ?)
        ''', (name, token))
        
        token_id = cursor.lastrowid
        
        # 2. 모든 커스텀 도구 권한 자동 부여
        custom_tools = cursor.execute("SELECT id FROM h_custom_tool").fetchall()
        for tool in custom_tools:
            cursor.execute('''
                INSERT INTO h_access_token_tool_map (token_id, tool_id)
                VALUES (?, ?)
            ''', (token_id, tool[0]))
            
        # 3. 모든 OpenAPI 도구 권한 자동 부여
        openapis = cursor.execute("SELECT id FROM h_openapi").fetchall()
        for api in openapis:
            cursor.execute('''
                INSERT INTO h_access_token_openapi_map (token_id, openapi_id)
                VALUES (?, ?)
            ''', (token_id, api[0]))
            
        conn.commit()
        return token
    finally:
        conn.close()

# [2] get_access_token: 토큰 조회
def get_access_token(token: str):
    """토큰 값으로 유효한 토큰 정보를 조회합니다."""
    conn = get_db_connection()
    try:
        # 삭제되지 않고(is_delete='N'), 사용 가능한(can_use='Y') 토큰만 조회
        row = conn.execute('''
            SELECT * FROM h_access_token 
            WHERE token = ? AND is_delete = 'N' AND can_use = 'Y'
        ''', (token,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

# [3] get_all_access_tokens: 모든 토큰 목록 조회 (페이징 적용)
def get_all_access_tokens(page: int = 1, size: int = 10) -> dict:
    """모든 토큰 목록을 조회합니다 (삭제된 것 제외, 페이징 적용)."""
    conn = get_db_connection()
    offset = (page - 1) * size
    
    try:
        total = conn.execute("SELECT COUNT(*) FROM h_access_token WHERE is_delete = 'N'").fetchone()[0]
        
        rows = conn.execute('''
            SELECT * FROM h_access_token 
            WHERE is_delete = 'N'
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        ''', (size, offset)).fetchall()
        
        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "page": page,
            "size": size
        }
    finally:
        conn.close()

# [4] delete_access_token: 토큰 삭제
def delete_access_token(token_id: int):
    """토큰을 삭제 처리합니다 (Soft Delete)."""
    conn = get_db_connection()
    try:
        conn.execute('''
            UPDATE h_access_token
            SET is_delete = 'Y'
            WHERE id = ?
        ''', (token_id,))
        conn.commit()
    finally:
        conn.close()
        
# [5] get_user_by_active_token: 토큰으로 사용자 조회 (SSE/Stdio 통합용)
# - SSE 방식: 웹 브라우저에서 접속시 사용 (jwt 사용해 사용자 인증)
# - Stdio 방식: Claude Desktop에서 접속시 사용 (외부 액세스 토큰 사용)
def get_user_by_active_token(token: str):
    """
    토큰(JWT 또는 sk_...)을 확인하여 유효한 사용자 정보를 반환합니다.
    """
    if not token:
        return None

    # Step 1: JWT 토큰 시도
    try:
        from src.utils.auth import verify_token
    except ImportError:
        from utils.auth import verify_token
        
    payload = verify_token(token)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            from .user import get_user
            user = get_user(user_id)
            return dict(user) if user else None

    # Step 2: 외부 액세스 토큰 (sk_...) 확인
    conn = get_db_connection()
    try:
        # 삭제되지 않고(is_delete='N'), 사용 가능한(can_use='Y') 토큰만 조회
        row = conn.execute('''
            SELECT * FROM h_access_token 
            WHERE token = ? AND is_delete = 'N' AND can_use = 'Y'
        ''', (token,)).fetchone()
        
        if row:
            # 외부 연동용은 토큰 정보만 반환 (사용자 uid는 None)
            token_info = dict(row)
            return {
                "uid": None,
                "user_id": f"token:{token_info['name']}",
                "user_nm": token_info['name'],
                "role": "ROLE_USER",
                "_token_id": token_info['id'],
                "_token_nm": token_info['name']
            }
            
        return None
    finally:
        conn.close()

# [6] check_access_token_permission: 토큰별 도구 권한 검증
def check_access_token_permission(
    token_id: int,
    tool_id: str | int,
    tool_type: str = "CUSTOM"
) -> bool:
    """
    특정 토큰이 특정 도구(CUSTOM 또는 OPENAPI)를 사용할 권한이 있는지 확인합니다.
    """
    if not token_id:
        return False
        
    conn = get_db_connection()
    try:
        if tool_type == "CUSTOM":
            # 커스텀 도구의 경우 name(str) 또는 id(int)로 조회 가능하도록 처리
            if isinstance(tool_id, str):
                row = conn.execute('''
                    SELECT 1 FROM h_access_token_tool_map m
                    JOIN h_custom_tool ct ON m.tool_id = ct.id
                    WHERE m.token_id = ? AND ct.name = ?
                ''', (token_id, tool_id)).fetchone()
            else:
                row = conn.execute('''
                    SELECT 1 FROM h_access_token_tool_map
                    WHERE token_id = ? AND tool_id = ?
                ''', (token_id, tool_id)).fetchone()
        else: # OPENAPI
            if isinstance(tool_id, str):
                row = conn.execute('''
                    SELECT 1 FROM h_access_token_openapi_map m
                    JOIN h_openapi o ON m.openapi_id = o.id
                    WHERE m.token_id = ? AND o.tool_id = ?
                ''', (token_id, tool_id)).fetchone()
            else:
                row = conn.execute('''
                    SELECT 1 FROM h_access_token_openapi_map
                    WHERE token_id = ? AND openapi_id = ?
                ''', (token_id, tool_id)).fetchone()
        
        return row is not None
    finally:
        conn.close()
