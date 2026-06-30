"""
ISA ETF 일일 알림 메인 실행 파일
"""

import os
from dotenv import load_dotenv

load_dotenv()

from etf_analyzer import analyze_etfs, format_message
from telegram_sender import send_message


def run():
    top_n = int(os.getenv("TOP_N_ETF", "10"))
    print(f"📈 ETF 데이터 분석 중... (상위 {top_n}개)")

    try:
        ranked = analyze_etfs(top_n=top_n)
    except Exception as e:
        send_message(f"⚠️ ISA ETF 알림: 데이터 수집 중 오류가 발생했습니다.\n오류: {e}")
        raise

    if not ranked:
        send_message("⚠️ ISA ETF 알림: 오늘은 시장 데이터를 가져오지 못했습니다. (휴장일이거나 네트워크 오류)")
        print("ETF 데이터 없음 — 오류 메시지 전송 완료")
        return

    message = format_message(ranked)
    print("\n--- 전송할 메시지 ---")
    print(message)
    print("--------------------\n")
    send_message(message)


if __name__ == "__main__":
    run()
