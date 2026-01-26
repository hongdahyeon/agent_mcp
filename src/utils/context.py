
from contextvars import ContextVar
from typing import Dict, Any, Optional

""" 
    요청(Request) 단위로 사용자 정보를 안전하게 공유하기 위한 저장소
    'ContextVar' 기술 사용을 통해 A,B 사용자 간의 요청이 섞이지 않도록 분리해 저장
    -> 현재 실행 중인 요청(Thread/Task) 내에서만 유효한 값을 갖게 된다
"""

# 현재 요청의 사용자 정보를 저장하는 ContextVar
# Dict 구조: {"uid": int, "user_id": str, "user_nm": str, "role": str, ...}
_user_context: ContextVar[Optional[Dict[str, Any]]] = ContextVar("user_context", default=None)

# 검증된 사용자 정보를 저장
def set_current_user(user: Dict[str, Any]):
    """현재 컨텍스트에 사용자 정보를 설정합니다."""
    _user_context.set(user)

# 저장된 사용자 정보를 반환
def get_current_user() -> Optional[Dict[str, Any]]:
    """현재 컨텍스트의 사용자 정보를 반환합니다."""
    return _user_context.get()

def clear_current_user():
    """현재 컨텍스트의 사용자 정보를 초기화합니다."""
    _user_context.set(None)
