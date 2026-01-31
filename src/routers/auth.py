from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import timedelta
import logging

try:
    from src.db import get_user, verify_password, log_login_attempt, get_login_history
    from src.utils.auth import create_access_token as create_jwt_token
except ImportError:
    from db import get_user, verify_password, log_login_attempt, get_login_history
    from utils.auth import create_access_token as create_jwt_token


"""
    로그인, 로그 관련
"""

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

class LoginRequest(BaseModel):
    user_id: str
    password: str

# 유저 로그인
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), request: Request = None):
    """
    OAuth2 Password Flow Login.
    Returns JWT Access Token.
    """
    # 사용자 조회
    user = get_user(form_data.username)
    ip_addr = request.client.host if request else "unknown"
    
    if user and verify_password(form_data.password, user['password']):
        if dict(user).get('is_enable', 'Y') == 'N':
            log_login_attempt(user['uid'], ip_addr, False, "Account Disabled")
            raise HTTPException(status_code=403, detail="Account is disabled")
            
        # JWT 생성
        access_token_expires = timedelta(hours=12)
        access_token = create_jwt_token(
            data={"sub": user['user_id'], "role": user['role']},
            expires_delta=access_token_expires
        )
        
        # 로그인 이력 기록
        log_login_attempt(user['uid'], ip_addr, True, "Login Successful (JWT)")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "uid": user['uid'], 
                "user_id": user['user_id'], 
                "user_nm": user['user_nm'], 
                "role": user['role']
            }
        }
    else:
        user_uid = user['uid'] if user else None
        log_login_attempt(user_uid, ip_addr, False, "Invalid Credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

# 로그인 이력 조회
@router.get("/history")
async def login_history(page: int = 1, size: int = 20):
    try:
        return get_login_history(page, size)
    except Exception as e:
        return {"error": str(e)}
