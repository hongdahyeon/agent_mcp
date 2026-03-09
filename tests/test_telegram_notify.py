import asyncio
import sys
import os

# 프로젝트 루트 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.notification_helper import send_system_notification
from src.db.init_manager import init_db

async def test_notification():
    # DB 초기화 (UID 1번이 있다고 가정)
    init_db()
    
    print("알림 전송 테스트 시작...")
    # UID 1번에게 테스트 알림 전송 (보통 관리자)
    notify_id = send_system_notification(
        receive_user_uid=1,
        title="[Backend Test] Telegram 연동 성공!",
        message="이제 백엔드 시스템 알림이 SSE와 텔레그램으로 동시에 발송됩니다. 🎉"
    )
    
    if notify_id:
        print(f"알림 전송 완료 (ID: {notify_id})")
    else:
        print("알림 전송 실패")

if __name__ == "__main__":
    asyncio.run(test_notification())
