import asyncio
import os
import sys

# 프로젝트 루트를 sys.path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.init_manager import init_db
from src.utils.otp_manager import send_management_otp, verify_management_otp
from src.db.email_otp import get_latest_otp

"""
    ## 파일 설명
    -> OTP 체크 Flow 테스트
"""

async def verify_otp_flow():
    print("=== [OTP Flow Verification] ===")
    
    # 1. DB 초기화 (테이블 생성 확인)
    init_db()
    print("[1] Database initialized.")
    
    test_email = "test@example.com"
    test_type = "SIGNUP"
    
    # 2. OTP 발송 (이메일 발송은 설정에 따라 실패할 수 있음 - DB 기록 위주 확인)
    print(f"[2] Sending OTP to {test_email}...")
    success, error = await send_management_otp(test_email, test_type)
    
    if not success:
        print(f"(!) OTP Send failed (Expected if mail config is missing): {error}")
    
    # DB에 잘 들어갔는지 확인
    otp_record = get_latest_otp(test_email, test_type)
    if not otp_record:
        print("(!) DB record NOT found.")
        return
    
    print(f"[3] DB Record found: ID={otp_record['id']}, Code={otp_record['otp_code']}, Expires={otp_record['expires_at']}")
    
    # 4. 틀린 번호 검증
    print("[4] Verifying with WRONG code...")
    v_success, v_status, v_msg = verify_management_otp(test_email, test_type, "000000")
    print(f"Result: {v_status} - {v_msg}")
    
    # 5. 올바른 번호 검증
    print(f"[5] Verifying with CORRECT code [{otp_record['otp_code']}]...")
    v_success, v_status, v_msg = verify_management_otp(test_email, test_type, otp_record['otp_code'])
    print(f"Result: {v_status} - {v_msg}")
    
    # 6. 확인 후 상태 체크
    otp_record_after = get_latest_otp(test_email, test_type)
    print(f"[6] Record verified status: {otp_record_after['is_verified']}")
    
    if otp_record_after['is_verified'] == 'Y':
        print(">>> SUCCESS: OTP module works correctly.")
    else:
        print(">>> FAILURE: Verification state didn't update.")

if __name__ == "__main__":
    asyncio.run(verify_otp_flow())
