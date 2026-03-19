## 파일 설명
## >> mcp_tool: get_user_info 사용이 잘 되는지 체크

import pytest
import sys
import os

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    from src.db.init_manager import init_db
    init_db()

def test_get_user_info_admin():
    from src.server import get_user_info
    
    result = get_user_info("admin")
    assert result is not None
    assert "password" not in result
    assert "admin" in result
    assert "ROLE_ADMIN" in result

def test_get_user_info_non_existent():
    from src.server import get_user_info
    
    result = get_user_info("non_existent_user_12345")
    assert "User not found" in result

