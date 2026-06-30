"""
카카오톡 '나에게 보내기' API 모듈
카카오 REST API를 이용해 본인에게 텍스트 메시지를 전송합니다.

사전 준비:
1. https://developers.kakao.com 에서 앱 생성
2. '카카오 로그인' 활성화 및 Redirect URI 등록
3. 동의항목에서 '카카오톡 메시지 전송' 권한 추가
4. get_kakao_tokens.py 실행하여 refresh token 발급
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
KAKAO_SEND_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send"


def _refresh_access_token(rest_api_key: str, refresh_token: str) -> str:
    """refresh token으로 새 access token을 발급합니다."""
    resp = requests.post(
        KAKAO_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "client_id": rest_api_key,
            "refresh_token": refresh_token,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if "access_token" not in data:
        raise ValueError(f"access_token 발급 실패: {data}")
    # 새 refresh_token이 발급된 경우 갱신된 값 저장
    new_refresh = data.get("refresh_token")
    if new_refresh:
        _update_env_refresh_token(new_refresh)
    return data["access_token"]


def _update_env_refresh_token(new_token: str) -> None:
    """.env 파일의 KAKAO_REFRESH_TOKEN 값을 업데이트합니다."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    with open(env_path, "w", encoding="utf-8") as f:
        for line in lines:
            if line.startswith("KAKAO_REFRESH_TOKEN="):
                f.write(f"KAKAO_REFRESH_TOKEN={new_token}\n")
            else:
                f.write(line)


def send_message(text: str) -> bool:
    """카카오톡 나에게 보내기로 텍스트 메시지를 전송합니다."""
    rest_api_key = os.getenv("KAKAO_REST_API_KEY")
    refresh_token = os.getenv("KAKAO_REFRESH_TOKEN")

    if not rest_api_key or not refresh_token:
        raise EnvironmentError(
            "KAKAO_REST_API_KEY 또는 KAKAO_REFRESH_TOKEN 환경 변수가 설정되지 않았습니다.\n"
            ".env 파일을 확인하거나 get_kakao_tokens.py를 실행하세요."
        )

    access_token = _refresh_access_token(rest_api_key, refresh_token)

    payload = {
        "template_object": '{"object_type":"text","text":"'
        + text.replace('"', '\\"').replace("\n", "\\n")
        + '","link":{"web_url":"","mobile_web_url":""}}'
    }

    resp = requests.post(
        KAKAO_SEND_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        data=payload,
        timeout=15,
    )
    resp.raise_for_status()
    result = resp.json()

    if result.get("result_code") == 0:
        print("✅ 카카오톡 전송 성공")
        return True
    else:
        raise RuntimeError(f"카카오톡 전송 실패: {result}")
