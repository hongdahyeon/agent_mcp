from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Union
from jose import JWTError, jwt

# 비밀번호 해싱 설정 (Password Hashing Configuration)
# bcrypt 알고리즘 사용, deprecated="auto"로 설정하여 구버전 호환성 확보
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 설정 (JWT Configuration)
SECRET_KEY = "your-secret-key"  # 실제 운영 환경에서는 환경 변수 등으로 안전하게 관리해야 함
ALGORITHM = "HS256"             # JWT 서명 알고리즘
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # 기본 토큰 만료 시간 (분)

def verify_password(plain_password, hashed_password):
    """
    평문 비밀번호와 해시된 비밀번호를 비교하여 '일치 여부'를 확인합니다.
    - :param plain_password: 사용자가 입력한 평문 비밀번호
    - :param hashed_password: DB에 저장된 해시 비밀번호
    -> :return: 일치하면 True, 아니면 False
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """
    평문 비밀번호를 해시화합니다.
    (사용자 생성 또는 비밀번호 변경 시 사용)
    :param password: 평문 비밀번호
    :return: 해시된 비밀번호 문자열
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    """
    JWT 액세스 토큰을 생성합니다.
    - :param data: 토큰 payload에 포함할 데이터 (dict)
    - :param expires_delta: 만료 시간 (timedelta, 생략 시 기본값 사용)
    -> :return: 생성된 JWT 문자열
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # payload에 만료 시간('exp') 추가
    to_encode.update({"exp": expire})
    
    # JWT 인코딩 및 반환
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """
    JWT 토큰의 유효성을 검증하고 payload를 반환합니다.
    - :param token: 검증할 JWT 문자열
    -> :return: 유효하면 payload(dict), 아니면 None
    """
    try:
        # JWT 디코딩 (서명 검증 포함)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        # 서명 불일치, 만료 등 검증 실패 시 None 반환
        return None
