import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Set

from src.dependencies import get_current_user_jwt, get_current_active_user
from src.db.notification import (
    get_notification_list_admin,
    create_notification,
    get_user_notifications,
    mark_notification_as_read,
    delete_notification,
    get_unread_count
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# 실시간 알림을 위한 SSE(Server-Sent Events) 매니저 클래스
# - 사용자별 SSE 연결(Queue) 관리 및 메시지 브로드캐스팅 담당
class NotificationManager:
    def __init__(self):
        # user_uid -> set of asyncio.Queue
        self.connections: Dict[int, Set[asyncio.Queue]] = {}

    async def subscribe(self, user_uid: int) -> asyncio.Queue:
        if user_uid not in self.connections:
            self.connections[user_uid] = set()
        
        queue = asyncio.Queue()
        self.connections[user_uid].add(queue)
        return queue

    def unsubscribe(self, user_uid: int, queue: asyncio.Queue):
        if user_uid in self.connections:
            self.connections[user_uid].discard(queue)
            if not self.connections[user_uid]:
                del self.connections[user_uid]

    def notify(self, user_uid: int, data: dict):
        if user_uid in self.connections:
            for queue in self.connections[user_uid]:
                queue.put_nowait(data)

notification_manager = NotificationManager()

class NotificationCreateRequest(BaseModel):
    receive_user_uid: int
    title: str
    message: str

class NotificationResponse(BaseModel):
    id: int
    receive_user_uid: int
    receive_user_id: Optional[str]
    receive_user_nm: Optional[str]
    title: str
    message: str
    reg_dt: str
    is_read: str
    read_dt: Optional[str]
    delete_at: Optional[str]
    send_user_uid: Optional[int]
    send_user_id: Optional[str]
    send_user_nm: Optional[str]

# 실시간 알림 스트림
@router.get("/stream")
async def notification_stream(
    request: Request,
    current_user: dict = Depends(get_current_active_user)
):
    """실시간 알림 SSE 스트림"""
    user_uid = current_user.get('uid')
    if not user_uid:
        raise HTTPException(status_code=401, detail="User not authenticated")

    async def event_generator():
        queue = await notification_manager.subscribe(user_uid)
        try:
            # 초기 연결 시 현재 알림 상태 전송 (선택 사항)
            # await queue.put({"type": "init", "unread_count": get_unread_count(user_uid)})
            
            while True:
                if await request.is_disconnected():
                    break
                
                data = await queue.get()
                yield {
                    "event": "notification",
                    "data": json.dumps(data, ensure_ascii=False)
                }
        finally:
            notification_manager.unsubscribe(user_uid, queue)

    return EventSourceResponse(event_generator())

# 관리자용 전체 알림 내역 조회
@router.get("/admin", response_model=dict)
async def list_notifications_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    include_deleted: bool = Query(True),
    current_user: dict = Depends(get_current_user_jwt)
):
    """관리자용 전체 알림 내역 조회"""
    if current_user.get('role') != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return get_notification_list_admin(page, size, include_deleted)

# 관리자가 사용자에게 알림 발송
@router.post("/send", status_code=201)
async def send_notification(
    request: NotificationCreateRequest,
    current_user: dict = Depends(get_current_user_jwt)
):
    """관리자가 사용자에게 알림 발송"""
    if current_user.get('role') != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    notify_id = create_notification(
        receive_user_uid=request.receive_user_uid,
        title=request.title,
        message=request.message,
        send_user_uid=current_user.get('uid')
    )
    
    # 실시간 알림 전송
    notification_manager.notify(request.receive_user_uid, {
        "type": "new_notification",
        "id": notify_id,
        "title": request.title,
        "message": request.message,
        "unread_count": get_unread_count(request.receive_user_uid)
    })
    
    return {"status": "success", "id": notify_id}

# 내 알림 목록 조회
@router.get("/me", response_model=dict)
async def list_my_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user_jwt)
):
    """내 알림 목록 조회"""
    return get_user_notifications(current_user.get('uid'), page, size)

# 읽지 않은 알림 개수 조회
@router.get("/unread-count")
async def unread_count(current_user: dict = Depends(get_current_user_jwt)):
    """읽지 않은 알림 개수 조회"""
    count = get_unread_count(current_user.get('uid'))
    return {"count": count}

# 알림 읽음 처리
@router.patch("/{notify_id}/read")
async def read_notify(
    notify_id: int,
    current_user: dict = Depends(get_current_user_jwt)
):
    """알림 읽음 처리"""
    mark_notification_as_read(notify_id)
    
    # 읽음 처리 후 개수 업데이트 필요할 시 알림 보낼 수도 있음
    notification_manager.notify(current_user.get('uid'), {
        "type": "unread_count_update",
        "unread_count": get_unread_count(current_user.get('uid'))
    })
    
    return {"status": "success"}

# 알림 삭제 (소프트 삭제)
@router.delete("/{notify_id}")
async def remove_notify(
    notify_id: int,
    current_user: dict = Depends(get_current_user_jwt)
):
    """알림 삭제 (소프트 삭제)"""
    delete_notification(notify_id)
    
    # 삭제 처리 후 개수 업데이트
    notification_manager.notify(current_user.get('uid'), {
        "type": "unread_count_update",
        "unread_count": get_unread_count(current_user.get('uid'))
    })
    
    return {"status": "success"}
