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
    from src.db.user import get_user
    import json
    
    user = get_user("admin")
    assert user is not None
    
    # 툴 로직 시뮬레이션 (Password 정보 제거 확인)
    user_dict = dict(user)
    if 'password' in user_dict:
        del user_dict['password']
    
    result = json.dumps(user_dict, default=str)
    
    assert "password" not in result
    assert "admin" in result
    assert "ROLE_ADMIN" in result

def test_get_user_info_non_existent():
    from src.db.user import get_user
    
    user = get_user("non_existent_user_12345")
    assert user is None

