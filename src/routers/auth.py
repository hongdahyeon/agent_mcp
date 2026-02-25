from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import timedelta
import logging

try:
    from src.db import (
        get_user, verify_password, log_login_attempt, get_login_history,
        check_user_id, check_user_email, create_user, increment_login_fail_count,
        reset_login_fail_count, set_user_locked
    )
    from src.utils.auth import create_access_token as create_jwt_token
    from src.utils.otp_manager import send_management_otp, verify_management_otp
except ImportError:
    from db import (
        get_user, verify_password, log_login_attempt, get_login_history,
        check_user_id, check_user_email, create_user, increment_login_fail_count,
        reset_login_fail_count, set_user_locked
    )
    from utils.auth import create_access_token as create_jwt_token
    from utils.otp_manager import send_management_otp, verify_management_otp


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
    user_email: str # 이메일 필드 반영
    password: str
    otp_code: str # OTP 코드 추가

class OtpSendRequest(BaseModel):
    email: str
    otp_type: str = 'SIGNUP'

class OtpVerifyRequest(BaseModel):
    email: str
    otp_type: str = 'SIGNUP'
    otp_code: str

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
    
    if not user:
        # 사용자가 존재하지 않는 경우
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. 잠금 여부 확인 (403)
    # => 가장 먼저 유저의 잠금 여부 체크
    if dict(user).get('is_locked', 'N') == 'Y':
        log_login_attempt(user['uid'], ip_addr, False, "Account Locked")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked due to multiple failed attempts. Please contact admin.",
        )

    # 2. 비활성화 여부 확인 (403)
    if dict(user).get('is_enable', 'Y') == 'N':
        log_login_attempt(user['uid'], ip_addr, False, "Account Disabled")
        raise HTTPException(status_code=403, detail="Account is disabled")

    # 3. 비밀번호 검증
    if verify_password(form_data.password, user['password']):
        # 로그인 성공 시 실패 횟수 초기화
        reset_login_fail_count(user['user_id'])
        
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
        # 로그인 실패 시 횟수 증가
        fail_count = increment_login_fail_count(user['user_id'])
        
        # 5회 실패 시 잠금 처리
        if fail_count >= 5:
            set_user_locked(user['user_id'], 'Y')
            log_login_attempt(user['uid'], ip_addr, False, "Account Locked (Auto)")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is locked due to 5 consecutive failed attempts. Please contact admin.",
            )
            
        log_login_attempt(user['uid'], ip_addr, False, f"Invalid Credentials (Fail: {fail_count}/5)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect username or password. ({fail_count}/5 attempts)",
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

# 이메일 중복 체크
# -> 로그인 필요 여부 x (비인증)
@router.get("/check-email")
async def api_check_email(user_email: str = Query(...)):
    is_exists = check_user_email(user_email)
    return {"exists": is_exists}

# OTP 발송
@router.post("/otp/send")
async def api_send_otp(req: OtpSendRequest):
    success, error_msg = await send_management_otp(req.email, req.otp_type)
    if not success:
        raise HTTPException(status_code=500, detail=f"OTP 발송 실패: {error_msg}")
    return {"success": True, "message": "인증 번호가 발송되었습니다."}

# OTP 검증 (단독 검증이 필요한 경우)
@router.post("/otp/verify")
async def api_verify_otp(req: OtpVerifyRequest):
    success, status_code, message = verify_management_otp(req.email, req.otp_type, req.otp_code)
    if not success:
        raise HTTPException(status_code=400, detail={"status": status_code, "message": message})
    return {"success": True, "message": message}

# 회원가입
@router.post("/signup")
async def api_signup(req: SignupRequest):
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자리 이상이어야 합니다.")
    
    if check_user_id(req.user_id):
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    
    if check_user_email(req.user_email):
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")
    
    # OTP 검증 (회원가입시 필수 체크, user_id 대신 user_email로 검증)
    otp_success, status_code, otp_message = verify_management_otp(req.user_email, 'SIGNUP', req.otp_code)
    if not otp_success:
        raise HTTPException(status_code=400, detail=f"이메일 인증 실패: {otp_message}")
    
    try:
        user_data = {
            "user_id": req.user_id,
            "user_nm": req.user_nm,
            "user_email": req.user_email, # 이메일 추가
            "password": req.password,
            "role": "ROLE_USER",
            "is_enable": "N"
        }
        create_user(user_data)
        return {"success": True, "message": "회원가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다."}
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}")
