"""
로컬 환경에서 매일 오전 8시 자동 실행하는 스케줄러.
서버나 개인 PC를 24시간 켜두는 경우 사용.
클라우드 환경(GitHub Actions / CCR Cron)에서는 이 파일 대신
.github/workflows/daily_alert.yml 을 사용하세요.
"""

import schedule
import time
import os
from dotenv import load_dotenv

load_dotenv()

from main import run

ALERT_TIME = os.getenv("ALERT_TIME", "08:00")


def job():
    print(f"⏰ 스케줄 실행: ISA ETF 알림 전송 시작")
    try:
        run()
    except Exception as e:
        print(f"❌ 실행 중 오류 발생: {e}")


schedule.every().day.at(ALERT_TIME).do(job)
print(f"✅ 스케줄러 시작 — 매일 {ALERT_TIME}에 카카오톡으로 알림을 전송합니다.")
print("종료하려면 Ctrl+C 를 누르세요.\n")

while True:
    schedule.run_pending()
    time.sleep(30)
