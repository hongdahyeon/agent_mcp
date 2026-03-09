import logging
import asyncio
try:
    from src.db.notification import create_notification, get_unread_count
    from src.routers.notification import notification_manager
    from src.utils.telegram_bot import send_telegram_message
except ImportError:
    from db.notification import create_notification, get_unread_count
    from routers.notification import notification_manager
    from utils.telegram_bot import send_telegram_message

logger = logging.getLogger(__name__)

def send_system_notification(receive_user_uid: int, title: str, message: str):
    """
    시스템에서 발생하는 주요 이벤트를 사용자에게 실시간 알림으로 전송합니다.
    (DB 저장 + SSE 브로드캐스팅 + Telegram 전송)
    """
    if not receive_user_uid:
        return None
        
    try:
        # 1. DB 저장
        notify_id = create_notification(
            receive_user_uid=receive_user_uid,
            title=title,
            message=message,
            send_user_uid=None # 시스템 발신 (NULL)
        )
        
        # 2. 실시간 SSE 전송
        notification_manager.notify(receive_user_uid, {
            "type": "new_notification",
            "id": notify_id,
            "title": title,
            "message": message,
            "unread_count": get_unread_count(receive_user_uid)
        })
        
        # 3. Telegram 전송 (비동기 실행)
        # (중요) 메인 로직에 지장을 주지 않도록 백그라운드 태스크로 실행하거나 별도 루프 활용
        telegram_text = f"🔔 {title}\n\n{message}"
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # 이미 루프가 실행 중인 경우 (FastAPI 환경), 백그라운드 태스크로 등록
                asyncio.create_task(send_telegram_message(telegram_text))
            else:
                # 루프가 없는 경우 (스크립트 등) 직접 실행
                asyncio.run(send_telegram_message(telegram_text))
        except Exception as te:
            logger.error(f"Telegram background task error: {te}")

        logger.info(f"System notification sent to UID {receive_user_uid}: {title}")
        return notify_id
    except Exception as e:
        logger.error(f"Failed to send system notification: {e}")
        return None