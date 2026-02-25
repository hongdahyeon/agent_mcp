from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
try:
    from src.db import get_all_users, create_user, update_user, check_user_id, check_user_email
    from src.dependencies import get_current_user_jwt
except ImportError:
    from db import get_all_users, create_user, update_user, check_user_id, check_user_email
    from dependencies import get_current_user_jwt

"""
    사용자 관리 관련
"""

router = APIRouter(prefix="/api/users", tags=["users"])

class UserCreateRequest(BaseModel):
    user_id: str
    password: str
    user_nm: str
    user_email: str # 추가
    role: str = "ROLE_USER"
    is_enable: str = "Y"
    is_locked: str = "N"
    login_fail_count: int = 0

class UserUpdateRequest(BaseModel):
    user_nm: str | None = None
    user_email: str | None = None # 추가
    role: str | None = None
    is_enable: str | None = None
    is_locked: str | None = None
    login_fail_count: int | None = None

# 모든 사용자 조회
@router.get("")
async def api_get_users(request: Request, page: int = 1, size: int = 20, current_user: dict = Depends(get_current_user_jwt)):
    """모든 사용자 조회 (프론트엔드에서 관리자 체크 필요, 페이징 포함)."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    return get_all_users(page, size)

# 사용자 생성
# - id, email 중복 체크
@router.post("")
async def api_create_user(req: UserCreateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """새 사용자 생성."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    if check_user_id(req.user_id):
        raise HTTPException(status_code=400, detail="User ID already exists")
    if check_user_email(req.user_email):
        raise HTTPException(status_code=400, detail="Email already exists")
    create_user(req.dict())
    return {"success": True}

# 사용자 수정
@router.put("/{user_id}")
async def api_update_user(user_id: str, req: UserUpdateRequest, current_user: dict = Depends(get_current_user_jwt)):
    """사용자 정보 수정."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    update_user(user_id, req.dict(exclude_unset=True))
    return {"success": True}

# 사용자 ID 존재 여부 체크
@router.get("/check/{user_id}")
async def api_check_user_id(user_id: str, current_user: dict = Depends(get_current_user_jwt)):
    """사용자 ID 존재 여부 확인."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"exists": check_user_id(user_id)}

# 사용자 이메일 존재 여부 체크
# -> 로그인 필요 여부 o (인증 필수)
@router.get("/check-email")
async def api_check_email_exists(user_email: str, current_user: dict = Depends(get_current_user_jwt)):
    """사용자 이메일 존재 여부 확인."""
    if current_user['role'] != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"exists": check_user_email(user_email)}
