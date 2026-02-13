from fastapi import Depends, HTTPException, status, Request, Header, Query
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
try:
    from src.db import get_user
    from src.utils.auth import verify_token
except ImportError:
    from db import get_user
    from utils.auth import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

"""
    유저의 JWT 토큰 가져오기
    및
    외부 토큰(Header/Query) 지원

"""


"""
    # 현재 유저의 JWT 토큰 가져오기
    # 사용 방법: current_user: dict = Depends(get_current_user_jwt)
    => 해당 API 실행 전에 토큰 검사(JWT 검사)를 강제화

"""
async def get_current_user_jwt(token: str = Depends(oauth2_scheme)):
    """
    Validate JWT token and return user info.
    Replacing X-User-Id header validation.
    """
    #  JWT 검증 : 토큰이 우리가 발행한 JWT가 맞는지, 유효기간이 자니지 않았는지 체크
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    user = get_user(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    return dict(user)

# 통합 인증 의존성: JWT(Header) 및 외부 토큰(Header/Query) 지원
async def get_current_active_user(
    request: Request,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    """
    1. Authorization 헤더 (Bearer <token>)
    2. token 쿼리 파라미터
    순서로 토큰을 찾아 검증합니다.
    """
    final_token = None
    
    # 1. 헤더 확인
    if authorization and authorization.startswith("Bearer "):
        final_token = authorization.split(" ")[1]
    
    # 2. 쿼리 파라미터 확인 (헤더가 없을 경우)
    if not final_token:
        final_token = token
        
    if not final_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # DB 통합 검증 함수 사용 (JWT 및 sk_... 토큰 지원)
    try:
        from src.db import get_user_by_active_token
    except ImportError:
        from db import get_user_by_active_token
        
    user = get_user_by_active_token(final_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user
