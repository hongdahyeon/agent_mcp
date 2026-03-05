import logging
try:
    from src.db.notification import create_notification, get_unread_count
    from src.routers.notification import notification_manager
except ImportError:
    from db.notification import create_notification, get_unread_count
    from routers.notification import notification_manager

logger = logging.getLogger(__name__)

def send_system_notification(receive_user_uid: int, title: str, message: str):
    """
    시스템에서 발생하는 주요 이벤트를 사용자에게 실시간 알림으로 전송합니다.
    (DB 저장 + SSE 브로드캐스팅)
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
        
        logger.info(f"System notification sent to UID {receive_user_uid}: {title}")
        return notify_id
    except Exception as e:
        logger.error(f"Failed to send system notification: {e}")
        return None