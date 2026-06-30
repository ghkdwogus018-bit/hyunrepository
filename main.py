"""
ISA ETF 일일 알림 메인 실행 파일
단독 실행 시 즉시 분석 후 카카오톡 전송.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from etf_analyzer import analyze_etfs, format_message
from kakao_sender import send_message


def run():
    top_n = int(os.getenv("TOP_N_ETF", "10"))
    print(f"📈 ETF 데이터 분석 중... (상위 {top_n}개)")

    ranked = analyze_etfs(top_n=top_n)

    if not ranked:
        print("⚠️  ETF 데이터를 가져오지 못했습니다. 네트워크 또는 장 개장 여부를 확인하세요.")
        return

    message = format_message(ranked)
    print("\n--- 전송할 메시지 미리보기 ---")
    print(message)
    print("------------------------------\n")

    send_message(message)


if __name__ == "__main__":
    run()
