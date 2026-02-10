from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import logging
try:
    from src.db import log_email, update_email_status, get_email_logs, cancel_email_log
    from src.utils.mailer import EmailSender
    from src.scheduler import add_scheduled_job
    from src.dependencies import get_current_user_jwt
except ImportError:
    from db import log_email, update_email_status, get_email_logs, cancel_email_log
    from utils.mailer import EmailSender
    from scheduler import add_scheduled_job
    from dependencies import get_current_user_jwt

"""
    이메일 관련
"""

router = APIRouter(prefix="/api/email", tags=["email"])
logger = logging.getLogger(__name__)

class EmailSendRequest(BaseModel):
    recipient: str
    subject: str
    content: str
    is_scheduled: bool = False
    scheduled_dt: str | None = None # YYYY-MM-DD HH:MM

# 이메일 발송
@router.post("/send")
async def api_send_email(req: EmailSendRequest, current_user: dict = Depends(get_current_user_jwt)):
    user = current_user
    try:
        log_id = log_email(
            user_uid=user['uid'], recipient=req.recipient, subject=req.subject, content=req.content,
            is_scheduled=req.is_scheduled, scheduled_dt=req.scheduled_dt
        )
    except Exception as e:
        logger.error(f"Failed to log email: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not req.is_scheduled:
        sender = EmailSender()
        success, error_msg = sender.send_immediate(req.recipient, req.subject, req.content)
        new_status = 'SENT' if success else 'FAILED'
        update_email_status(log_id, new_status, error_msg)
        if not success:
            return {"success": False, "log_id": log_id, "error": error_msg}
        return {"success": True, "log_id": log_id, "status": "SENT"}
    
    try:
         logger.info("Scheduling email job for log_id: {}".format(log_id))
         add_scheduled_job(log_id, req.scheduled_dt)
         return {"success": True, "log_id": log_id, "status": "PENDING (Scheduled)"}
    except Exception as e:
         logger.error(f"Failed to schedule job: {e}")
         return {"success": True, "log_id": log_id, "status": "PENDING (Scheduled, Job Add Failed)", "warning": str(e)}

# 이메일 로그 조회
@router.get("/logs")
async def api_get_email_logs(
    page: int = Query(1, ge=1), 
    size: int = Query(10, ge=1, le=100), 
    current_user: dict = Depends(get_current_user_jwt)
):
    user = current_user
    target_uid = None
    if user['role'] != 'ROLE_ADMIN':
        target_uid = user['uid']
        
    offset = (page - 1) * size
    logs, total = get_email_logs(limit=size, offset=offset, user_uid=target_uid)
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "size": size
    }

# 이메일 취소
@router.post("/cancel/{log_id}")
async def api_cancel_email(log_id: int, current_user: dict = Depends(get_current_user_jwt)):
    user = current_user
    is_admin = user['role'] == 'ROLE_ADMIN'
    success, msg = cancel_email_log(log_id, user['uid'], is_admin)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}
