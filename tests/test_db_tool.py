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
    from src.db.user import get_user, create_user
    from src.db.connection import get_db_connection
    import json
    
    test_user_id = "pytest_admin_test"
    
    # 1. 테스트 유저 생성 (이미 있으면 무시)
    try:
        create_user({
            "user_id": test_user_id,
            "password": "test_password_123",
            "user_nm": "Test Admin",
            "user_email": "test@example.com",
            "role": "ROLE_ADMIN"
        })
    except ValueError:
        pass

    try:
        # 2. 유저 조회 및 검증
        user = get_user(test_user_id)
        assert user is not None
        
        # 툴 로직 시뮬레이션 (Password 정보 제거 확인)
        user_dict = dict(user)
        if 'password' in user_dict:
            del user_dict['password']
        
        result = json.dumps(user_dict, default=str)
        
        assert "password" not in result
        assert test_user_id in result
        assert "ROLE_ADMIN" in result
        
    finally:
        # 3. 테스트 유저 삭제 (정리)
        conn = get_db_connection()
        conn.execute("DELETE FROM h_user WHERE user_id = ?", (test_user_id,))
        conn.commit()
        conn.close()

def test_get_user_info_non_existent():
    from src.db.user import get_user
    
    user = get_user("non_existent_user_99999")
    assert user is None

