import pytest
import asyncio
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.notification_helper import send_system_notification
from src.db.init_manager import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()

@pytest.mark.asyncio
async def test_notification():
    # UID 1번에게 테스트 알림 전송 (보통 관리자)
    # 실제 텔레그램 토큰이 없으면 내부적으로는 실패하겠지만, notify_id(DB PK)는 생성되어야 함
    notify_id = send_system_notification(
        receive_user_uid=1,
        title="[Backend Test] Pytest Integration",
        message="Pytest 연동 테스트 알림입니다."
    )
    
    assert notify_id is not None
    assert notify_id > 0

