from .connection import get_db_connection, DB_PATH, PROJECT_ROOT

"""
    패키지 초기화 및 공통 요소 Expose
    -> "src.db"라는 이름을 통해 통합적으로 접근 가능

    - connection: 데이터베이스 연결 관리
    - user: 사용자 관리
    - login_hist: 로그인 이력 관리
    - mcp_tool_usage: MCP Tool 사용 이력 관리
    - mcp_tool_limit: MCP Tool 사용 제한 관리
    - user_token: 사용자 토큰 관리
    - schema: 데이터베이스 스키마 관리
"""

from .user import (
    verify_password,
    get_user,
    get_all_users,
    check_user_id,
    create_user,
    update_user
)

from .login_hist import (
    log_login_attempt,
    get_login_history
)

from .mcp_tool_usage import (
    log_tool_usage,
    get_tool_usage_logs,
    get_tool_stats,
    get_user_daily_usage
)

from .mcp_tool_limit import (
    get_user_limit,
    get_admin_usage_stats,
    get_limit_list,
    upsert_limit,
    delete_limit
)

from .user_token import (
    create_user_token,
    get_user_token,
    get_user_by_active_token,
    get_all_user_tokens
)

from .schema import (
    get_all_tables,
    get_table_schema,
    get_table_data
)

from .init_manager import init_db

__all__ = [
    'get_db_connection',
    'DB_PATH',
    'PROJECT_ROOT',
    'verify_password',
    'get_user',
    'get_all_users',
    'check_user_id',
    'create_user',
    'update_user',
    'log_login_attempt',
    'get_login_history',
    'log_tool_usage',
    'get_tool_usage_logs',
    'get_tool_stats',
    'get_user_daily_usage',
    'get_user_limit',
    'get_admin_usage_stats',
    'get_limit_list',
    'upsert_limit',
    'delete_limit',
    'create_user_token',
    'get_user_token',
    'get_user_by_active_token',
    'get_all_user_tokens',
    'get_all_tables',
    'get_table_schema',
    'get_table_data',
    'init_db'
]
