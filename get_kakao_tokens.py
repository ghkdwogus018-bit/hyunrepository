"""
카카오 OAuth 토큰 최초 발급 스크립트
처음 한 번만 실행하면 .env 파일에 refresh_token이 저장됩니다.

사용법:
  python get_kakao_tokens.py

사전 준비:
1. https://developers.kakao.com 에서 애플리케이션 생성
2. [카카오 로그인] 활성화
3. Redirect URI에 http://localhost 추가
4. [동의항목] → talk_message 체크
5. .env 파일에 KAKAO_REST_API_KEY 입력
"""

import os
import webbrowser
from urllib.parse import urlencode, urlparse, parse_qs
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from dotenv import load_dotenv

load_dotenv()

REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")
REDIRECT_URI = "http://localhost:5000"

_auth_code = None


class _CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global _auth_code
        params = parse_qs(urlparse(self.path).query)
        _auth_code = params.get("code", [None])[0]
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"<h2>인증 완료! 이 창을 닫으셔도 됩니다.</h2>")

    def log_message(self, format, *args):
        pass


def main():
    if not REST_API_KEY:
        print("❌ .env 파일에 KAKAO_REST_API_KEY를 먼저 입력하세요.")
        return

    auth_url = (
        "https://kauth.kakao.com/oauth/authorize?"
        + urlencode(
            {
                "client_id": REST_API_KEY,
                "redirect_uri": REDIRECT_URI,
                "response_type": "code",
                "scope": "talk_message",
            }
        )
    )

    print(f"브라우저가 열립니다. 카카오 로그인 후 인증을 완료하세요.\n{auth_url}")
    webbrowser.open(auth_url)

    server = HTTPServer(("localhost", 5000), _CallbackHandler)
    server.handle_request()

    if not _auth_code:
        print("❌ 인증 코드를 받지 못했습니다.")
        return

    resp = requests.post(
        "https://kauth.kakao.com/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": REST_API_KEY,
            "redirect_uri": REDIRECT_URI,
            "code": _auth_code,
        },
    )
    resp.raise_for_status()
    tokens = resp.json()

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        print(f"❌ refresh_token 발급 실패: {tokens}")
        return

    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            content = f.read()
        if "KAKAO_REFRESH_TOKEN=" in content:
            lines = []
            for line in content.splitlines():
                if line.startswith("KAKAO_REFRESH_TOKEN="):
                    lines.append(f"KAKAO_REFRESH_TOKEN={refresh_token}")
                else:
                    lines.append(line)
            content = "\n".join(lines) + "\n"
        else:
            content += f"\nKAKAO_REFRESH_TOKEN={refresh_token}\n"
        with open(env_path, "w") as f:
            f.write(content)
    else:
        with open(env_path, "w") as f:
            f.write(f"KAKAO_REST_API_KEY={REST_API_KEY}\n")
            f.write(f"KAKAO_REFRESH_TOKEN={refresh_token}\n")

    print(f"✅ .env 파일에 KAKAO_REFRESH_TOKEN 저장 완료!")
    print("이제 main.py 또는 scheduler.py를 실행하세요.")


if __name__ == "__main__":
    main()
