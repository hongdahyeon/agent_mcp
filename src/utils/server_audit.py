import os
import functools
import traceback

"""
    외부에서 mcp.tool()을 사용한 경우,
    해당 사용 기록에 대한 로그 저장
"""

# DB 관련 함수 임포트 (경로에 따라 조정 필요할 수 있음)
try:
    from src import db_manager
except ImportError:
    try:
        import db_manager
    except ImportError:
        # 실행 위치에 따라 상대 경로가 다를 수 있음
        from .. import db_manager

def audit_log(func):
    """
    Stdio 방식(Claude Desktop) 사용 이력을 DB에 남기기 위한 래퍼.
    환경변수 'token'을 통해 사용자를 식별합니다.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        tool_name = func.__name__
        # 모든 인자를 문자열로 변환하여 저장
        params = {**kwargs}
        if args:
            params['args'] = args
            
        token = os.environ.get('token')
        user_uid = None
        
        # 사용자 식별
        if token:
            try:
                user = db_manager.get_user_by_active_token(token)
                if user:
                    user_uid = user['uid']
            except:
                pass
        
        is_success = False
        result_val = ""
        
        try:
            # 실제 함수 실행
            result = func(*args, **kwargs)
            result_val = str(result)
            is_success = True
            
            # 논리적 에러 체크
            if isinstance(result, str) and (result.startswith("Error:") or result.startswith("User not found")):
                is_success = False
                
            return result
        except Exception as e:
            result_val = f"Exception: {str(e)}"
            is_success = False
            raise e
        finally:
            # DB 기록에 실패해도 메인 로직은 수행되어야 함
            if user_uid:
                try:
                    db_manager.log_tool_usage(user_uid, tool_name, str(params), is_success, result_val)
                except Exception:
                    pass
                    
    return wrapper
