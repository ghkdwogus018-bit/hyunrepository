# ISA ETF 일일 카카오톡 알림

매일 오전 8시, ISA 계좌에 넣기 좋은 ETF 순위를 분석해 카카오톡으로 자동 전송하는 시스템입니다.

---

## 메시지 예시

```
📊 [2025년 12월 01일] ISA 계좌 추천 ETF
━━━━━━━━━━━━━━━━━━━━━━━

🏆 오늘의 TOP ETF 순위

🥇 1위 TIGER 미국S&P500 (133690)
   현재가: 18,500원
   1개월: ▲3.2% | 3개월: ▲9.1%
   샤프: 1.43 | 변동성: 12.3%
...
```

---

## 순위 산출 방식

| 항목 | 가중치 |
|------|--------|
| 1개월 수익률 | 30% |
| 3개월 수익률 | 30% |
| 6개월 수익률 | 20% |
| 1년 수익률 | 10% |
| 샤프지수(3M) | 10% |
| 저변동성 보너스 | +α |

---

## 설치 방법

### 1단계: 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/ghkdwogus018-bit/hyunrepository.git
cd hyunrepository
pip install -r requirements.txt
```

### 2단계: 카카오 앱 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com) 접속
2. **내 애플리케이션 → 애플리케이션 추가하기**
3. **카카오 로그인** 활성화
4. **Redirect URI** 에 `http://localhost:5000` 추가
5. **동의항목** → `talk_message` 활성화
6. **앱 키 → REST API 키** 복사

### 3단계: 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 KAKAO_REST_API_KEY에 복사한 키 입력
```

### 4단계: 카카오 토큰 최초 발급 (한 번만)

```bash
python get_kakao_tokens.py
```

브라우저가 열리면 카카오 로그인 후 인증하면 `.env`에 자동 저장됩니다.

---

## 실행 방법

### A. 즉시 한 번 실행

```bash
python main.py
```

### B. 로컬 스케줄러 (PC를 켜두는 경우)

```bash
python scheduler.py
# → 매일 오전 8시에 자동 실행
```

### C. GitHub Actions (추천 - 서버 없이 자동화)

1. 저장소 **Settings → Secrets → Actions** 에서 아래 두 시크릿 등록:
   - `KAKAO_REST_API_KEY`
   - `KAKAO_REFRESH_TOKEN`
2. `.github/workflows/daily_alert.yml` 이 이미 포함되어 있으므로 push 후 자동 활성화됩니다.

---

## 분석 대상 ETF

| 분류 | ETF |
|------|-----|
| 국내 주식 | KODEX 200, TIGER 200, KODEX 코스닥150, KODEX 반도체 등 |
| 해외 주식 | TIGER 미국S&P500, KODEX 나스닥100, TIGER 해외선진국 등 |
| 채권 | KODEX 국고채3년, KOSEF 국고채10년, KODEX 단기채권 |
| 배당 | KODEX 고배당, KODEX MSCI한국배당귀족 |
| 리츠 | TIGER 부동산인프라고배당 |

---

> ⚠️ 본 정보는 투자 참고용이며, 투자 판단의 책임은 본인에게 있습니다.
