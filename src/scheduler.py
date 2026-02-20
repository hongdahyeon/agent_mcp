from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

try:
    from src.db.email_manager import get_pending_scheduled_emails, update_email_status
    from src.utils.mailer import EmailSender
except ImportError:
    # Fallback for direct execution testing
    from db.email_manager import get_pending_scheduled_emails, update_email_status
    from utils.mailer import EmailSender

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def process_scheduled_emails():
    """
    주기적으로 실행되어 예약된 이메일을 발송하는 작업입니다.
    """
    try:
        pending_emails = get_pending_scheduled_emails()
        if not pending_emails:
            return

        logger.info(f"Checking scheduled emails... Found {len(pending_emails)} pending emails.")
        
        email_sender = EmailSender()
        
        for email in pending_emails:
            log_id = email['id']
            recipient = email['recipient']
            subject = email['subject']
            content = email['content']
            
            # 이메일 발송 시도
            success, error_msg = email_sender.send_immediate(recipient, subject, content)
            
            if success:
                update_email_status(log_id, 'SENT')
                logger.info(f"Scheduled email sent successfully. Log ID: {log_id}")
            else:
                update_email_status(log_id, 'FAILED', error_msg)
                logger.error(f"Failed to send scheduled email. Log ID: {log_id}, Error: {error_msg}")
                
    except Exception as e:
        logger.error(f"Error in process_scheduled_emails: {e}")

def send_one_email(log_id: int):
    """
    특정 로그 ID의 이메일을 즉시 발송하고 결과를 업데이트합니다.
    스케줄러에 의해 단일 작업으로 실행될 때 사용됩니다.
    """
    try:
        # DB 연결 및 해당 로그 조회
        try:
            from src.db.connection import get_db_connection
        except ImportError:
            from db.connection import get_db_connection
            
        conn = get_db_connection()
        # conn.row_factory = None  <-- Removed to use default sqlite3.Row from get_db_connection
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM h_email_log WHERE id = ? AND status = 'PENDING'", (log_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            logger.warning(f"send_one_email: Email log not found or not PENDING. Log ID: {log_id}")
            return
            
        email = dict(row)
        recipient = email['recipient']
        subject = email['subject']
        content = email['content']
        
        email_sender = EmailSender()
        success, error_msg = email_sender.send_immediate(recipient, subject, content)
        
        if success:
            update_email_status(log_id, 'SENT')
            logger.info(f"Scheduled email (One-time) sent successfully. Log ID: {log_id}")
        else:
            update_email_status(log_id, 'FAILED', error_msg)
            logger.error(f"Failed to send scheduled email (One-time). Log ID: {log_id}, Error: {error_msg}")
            
    except Exception as e:
        logger.error(f"Error in send_one_email: {e}")

def add_scheduled_job(log_id: int, run_date: str):
    """
    특정 시간에 이메일을 발송하도록 스케줄러에 작업을 등록합니다.
    run_date: 'YYYY-MM-DD HH:MM:SS' 형식의 문자열 (또는 ISO 포맷)
    """
    logger.info("Adding scheduled job for Email Log ID: {} at {}".format(log_id, run_date))
    try:
        from datetime import datetime
        dt_run_date = None
        
        # 1. YYYY-MM-DD HH:MM:SS 포맷 시도
        try:
            dt_run_date = datetime.strptime(run_date, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            pass
            
        # 2. ISO 포맷 시도 (frontend에서 T가 포함된 문자열을 보낼 수 있음)
        if not dt_run_date:
            try:
                dt_run_date = datetime.fromisoformat(run_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        
        if not dt_run_date:
            logger.error(f"Invalid date format: {run_date}. Job not added.")
            return

        if not scheduler.running:
            logger.warning("Scheduler is not running. Job not added.")
            return

        scheduler.add_job(
            send_one_email,
            'date',
            run_date=dt_run_date,
            args=[log_id],
            id=f"email_{log_id}",
            replace_existing=True
        )
        logger.info(f"Added scheduled job for Email Log ID: {log_id} at {dt_run_date}")
    except Exception as e:
        logger.error(f"Failed to add scheduled job: {e}")

def start_scheduler():
    """
    스케줄러를 시작합니다.
    """
    if not scheduler.running:
        # 1. Polling Job (Fallback & Fail-safe) - 1분 주기
        trigger = IntervalTrigger(minutes=1)
        scheduler.add_job(
            process_scheduled_emails,
            trigger=trigger,
            id='email_sender_job',
            replace_existing=True,
            coalesce=True,
            max_instances=1
        )
        scheduler.start()
        logger.info("Email Scheduler started.")

def shutdown_scheduler():
    """
    스케줄러를 종료합니다.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Email Scheduler shut down.")
