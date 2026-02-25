import random
import logging
from datetime import datetime
try:
    from src.db.email_otp import create_otp, get_latest_otp, verify_otp_record
    from src.utils.mailer import EmailSender
except ImportError:
    from db.email_otp import create_otp, get_latest_otp, verify_otp_record
    from utils.mailer import EmailSender

logger = logging.getLogger(__name__)

"""
    OTP 관리 모듈
    - [1] generate_otp_code: 6자리 랜덤 숫자 생성
    - [2] send_management_otp: OTP 생성, DB 저장 및 이메일 발송
    - [3] verify_management_otp: OTP 검증
"""

# [1] generate_otp_code: 6자리 랜덤 숫자 생성
def generate_otp_code(length: int = 6) -> str:
    """6자리 랜덤 숫자를 생성합니다."""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])

# [2] send_management_otp: OTP 생성, DB 저장 및 이메일 발송
async def send_management_otp(email: str, otp_type: str = 'SIGNUP'):
    """
    OTP를 생성하여 DB에 저장하고 사용자에게 메일을 발송합니다.
    """
    # 1. OTP 번호 생성
    otp_code = generate_otp_code()
    
    # 2. DB 저장 (기본 5분 만료)
    create_otp(email, otp_type, otp_code, valid_minutes=5)
    
    # 3. 이메일 발송
    subject = f"[Agent MCP] 인증 번호를 안내해 드립니다."
    content = f"""안녕하세요.
                인증 번호는 [{otp_code}] 입니다.
                5분 이내에 입력해 주세요.

                감사합니다.
                """
    
    sender = EmailSender()
    success, error_msg = sender.send_immediate(email, subject, content)
    
    if not success:
        logger.error(f"Failed to send OTP email to {email}: {error_msg}")
        return False, error_msg
    
    return True, None

# [3] verify_management_otp: OTP 검증
def verify_management_otp(email: str, otp_type: str, input_code: str):
    """
    사용자가 입력한 OTP를 검증합니다.
    Returns: (success: bool, status: str, message: str)
    status: SUCCESS, EXPIRED, INVALID_CODE, NOT_FOUND
    """
    # 1. 최신 OTP 조회
    otp_record = get_latest_otp(email, otp_type)
    
    if not otp_record:
        return False, "NOT_FOUND", "발송된 인증 번호를 찾을 수 없습니다."
    
    # 2. 이미 확인된 경우 (보통은 새로 발송하겠지만, 보안상 체크)
    if otp_record['is_verified'] == 'Y':
        return False, "INVALID_CODE", "이미 확인된 인증 번호입니다. 새로 발송해 주세요."

    # 3. 만료 여부 확인
    expires_at = datetime.strptime(otp_record['expires_at'], '%Y-%m-%d %H:%M:%S')
    if datetime.now() > expires_at:
        return False, "EXPIRED", "인증 번호가 만료되었습니다. 재발송해 주세요."
    
    # 4. 일치 여부 확인
    if otp_record['otp_code'] != input_code:
        return False, "INVALID_CODE", "인증 번호가 일치하지 않습니다."
    
    # 5. 성공 시 확인 처리
    verify_otp_record(otp_record['id'])
    
    return True, "SUCCESS", "인증에 성공하였습니다."
