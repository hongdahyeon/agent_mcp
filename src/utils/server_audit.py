import os
import functools
import traceback

"""
    외부에서 mcp.tool()을 사용한 경우,
    해당 사용 기록에 대한 로그 저장
"""

# DB 관련 함수 임포트 (경로에 따라 조정 필요할 수 있음)
try:
    from src import db
except ImportError:
    try:
        import db
    except ImportError:
        # 실행 위치에 따라 상대 경로가 다를 수 있음
        from .. import db

import inspect
import asyncio

def audit_log(func):
    """
    Stdio 방식(Claude Desktop) 사용 이력을 DB에 남기기 위한 래퍼.
    환경변수 'token'을 통해 사용자를 식별합니다.
    비동기(async) 및 동기 함수를 모두 지원합니다.
    """
    # [1] 감싸려는 함수(func)가 비동기(async def)인지 확인합니다.
    # 동적 도구(dynamic_handler)는 비동기로 정의되므로 이 분기를 타게 됩니다.
    if asyncio.iscoroutinefunction(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            tool_name = func.__name__
            params = {**kwargs}
            if args: params['args'] = args
                
            token = os.environ.get('token')
            user_uid = None
            if token:
                try:
                    user = db.get_user_by_active_token(token)
                    if user: user_uid = user['uid']
                except: pass
            
            is_success = False
            result_val = ""
            try:
                # [2] 비동기 함수이므로 await를 사용하여 실제 도구 로직이 완료될 때까지 기다립니다.
                result = await func(*args, **kwargs)
                result_val = str(result)
                is_success = True
                if isinstance(result, str) and (result.startswith("Error:") or result.startswith("User not found")):
                    is_success = False
                return result
            except Exception as e:
                result_val = f"Exception: {str(e)}"
                is_success = False
                raise e
            finally:
                # [3] 도구 실행이 끝난 후(성공/실패 무관) DB에 이력을 저장합니다.
                if user_uid:
                    try:
                        db.log_tool_usage(user_uid, tool_name, str(params), is_success, result_val)
                    except: pass
        return async_wrapper
    else:
        # [4] 일반 동기 함수(def)인 경우 처리 (예: add, subtract 등)
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            tool_name = func.__name__
            params = {**kwargs}
            if args: params['args'] = args
                
            token = os.environ.get('token')
            user_uid = None
            if token:
                try:
                    user = db.get_user_by_active_token(token)
                    if user: user_uid = user['uid']
                except: pass
            
            is_success = False
            result_val = ""
            try:
                # [5] 동기 함수는 await 없이 즉시 실행합니다.
                result = func(*args, **kwargs)
                result_val = str(result)
                is_success = True
                if isinstance(result, str) and (result.startswith("Error:") or result.startswith("User not found")):
                    is_success = False
                return result
            except Exception as e:
                result_val = f"Exception: {str(e)}"
                is_success = False
                raise e
            finally:
                if user_uid:
                    try:
                        db.log_tool_usage(user_uid, tool_name, str(params), is_success, result_val)
                    except: pass
        return sync_wrapper
