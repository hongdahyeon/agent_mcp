import os
import httpx
import logging
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

logger = logging.getLogger(__name__)

# 환경 변수에서 텔레그램 설정 로드
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# [1] send_telegram_message: 텔레그램 봇을 통해 메시지를 전송합니다. (비동기)
async def send_telegram_message(message: str):
    """
    텔레그램 봇을 통해 메시지를 전송합니다. (비동기)
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("Telegram Bot Token 또는 Chat ID가 설정되지 않았습니다.")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            if response.status_code == 200:
                logger.info("Telegram 메시지 전송 성공")
                return True
            else:
                logger.error(f"Telegram API 오류: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        logger.error(f"Telegram 메시지 전송 중 예외 발생: {e}")
        return False
