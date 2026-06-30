"""
텔레그램 봇 메시지 전송 모듈
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"


def send_message(text: str) -> bool:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not bot_token or not chat_id:
        raise EnvironmentError(
            "TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 설정되지 않았습니다."
        )

    resp = requests.post(
        TELEGRAM_API_URL.format(token=bot_token),
        json={"chat_id": chat_id, "text": text},
        timeout=15,
    )
    resp.raise_for_status()
    result = resp.json()

    if result.get("ok"):
        print("✅ 텔레그램 전송 성공")
        return True
    else:
        raise RuntimeError(f"텔레그램 전송 실패: {result}")
