from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
try:
    from src.db import get_user
    from src.utils.auth import verify_token
except ImportError:
    from db import get_user
    from utils.auth import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# 현재 유저의 JWT 토큰 가져오기
async def get_current_user_jwt(token: str = Depends(oauth2_scheme)):
    """
    Validate JWT token and return user info.
    Replacing X-User-Id header validation.
    """
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
