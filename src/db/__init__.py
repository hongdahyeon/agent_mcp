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
    update_user,
    increment_login_fail_count,
    reset_login_fail_count,
    set_user_locked
)

from .login_hist import (
    log_login_attempt,
    get_login_history
)

from .mcp_tool_usage import (
    log_tool_usage,
    get_tool_usage_logs,
    get_tool_stats,
    get_user_daily_usage,
    get_user_tool_stats
)

from .mcp_tool_limit import (
    get_user_limit,
    get_admin_usage_stats,
    get_limit_list,
    upsert_limit,
    delete_limit,
)

from .custom_tool import (
    get_active_tools,
    get_all_tools,
    get_tool_by_id,
    create_tool,
    update_tool,
    delete_tool
)

from .custom_tool_param import (
    get_tool_params,
    add_tool_param,
    clear_tool_params
)

from .access_token import (
    create_access_token,
    get_access_token,
    get_all_access_tokens,
    delete_access_token,
    get_user_by_active_token
)
from .openapi import (
    get_openapi_list,
    get_openapi_by_tool_id,
    upsert_openapi,
    delete_openapi
)

from .openapi_usage import (
    log_openapi_usage,
    get_openapi_usage_logs,
    get_openapi_stats,
    get_user_openapi_daily_usage,
    get_user_openapi_tool_usage
)

from .openapi_limit import (
    get_openapi_limit,
    get_openapi_limit_list,
    upsert_openapi_limit,
    delete_openapi_limit
)



from .schema import (
    get_all_tables,
    get_table_schema,
    get_table_data
)

from .system_config import (
    get_all_configs,
    get_config_value,
    set_config,
    delete_config
)

from .email_manager import (
    log_email,
    update_email_status,
    get_email_logs,
    cancel_email_log
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
    'increment_login_fail_count',
    'reset_login_fail_count',
    'set_user_locked',
    'log_login_attempt',
    'get_login_history',
    'log_tool_usage',
    'get_tool_usage_logs',
    'get_tool_stats',
    'get_user_daily_usage',
    'get_user_tool_stats',
    'get_user_limit',
    'get_admin_usage_stats',
    'get_limit_list',
    'upsert_limit',
    'delete_limit',
    'get_active_tools',
    'get_all_tools',
    'get_tool_by_id',
    'create_tool',
    'update_tool',
    'delete_tool',
    'get_tool_params',
    'add_tool_param',
    'clear_tool_params',

    'get_all_tables',
    'get_table_schema',
    'get_table_data',
    'get_all_configs',
    'get_config_value',
    'set_config',
    'delete_config',
    'log_email',
    'update_email_status',
    'get_email_logs',
    'cancel_email_log',
    'init_db',
    'create_access_token',
    'get_access_token',
    'get_all_access_tokens',
    'delete_access_token',
    'get_user_by_active_token',
    'get_openapi_list',
    'get_openapi_by_tool_id',
    'upsert_openapi',
    'delete_openapi',
    'log_openapi_usage',
    'get_openapi_usage_logs',
    'get_openapi_stats',
    'get_user_openapi_daily_usage',
    'get_user_openapi_tool_usage',
    'get_openapi_limit',
    'get_openapi_limit_list',
    'upsert_openapi_limit',
    'delete_openapi_limit'
]
