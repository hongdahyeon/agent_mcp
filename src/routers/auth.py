from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import timedelta
import logging

try:
    from src.db import get_user, verify_password, log_login_attempt, get_login_history, check_user_id, create_user
    from src.utils.auth import create_access_token as create_jwt_token
except ImportError:
    from db import get_user, verify_password, log_login_attempt, get_login_history, check_user_id, create_user
    from utils.auth import create_access_token as create_jwt_token


"""
    로그인, 로그 관련
"""

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

class LoginRequest(BaseModel):
    user_id: str
    password: str

class SignupRequest(BaseModel):
    user_id: str
    user_nm: str
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

# 아이디 중복 체크
@router.get("/check-id")
async def api_check_id(user_id: str = Query(...)):
    is_exists = check_user_id(user_id)
    return {"exists": is_exists}

# 회원가입
@router.post("/signup")
async def api_signup(req: SignupRequest):
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자리 이상이어야 합니다.")
    
    if check_user_id(req.user_id):
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    
    try:
        user_data = {
            "user_id": req.user_id,
            "user_nm": req.user_nm,
            "password": req.password,
            "role": "ROLE_USER",
            "is_enable": "N"
        }
        create_user(user_data)
        return {"success": True, "message": "회원가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다."}
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}")
