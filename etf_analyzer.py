"""
ISA 계좌용 국내 ETF 수익성 분석 모듈
Yahoo Finance에서 한국 ETF 데이터를 가져와 순위를 매깁니다.
"""

from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import requests

# Yahoo Finance 티커 형식: 종목코드.KS
ISA_ETF_TICKERS = {
    "069500.KS": "KODEX 200",
    "102110.KS": "TIGER 200",
    "229200.KS": "KODEX 코스닥150",
    "091160.KS": "KODEX 반도체",
    "091170.KS": "KODEX 은행",
    "133690.KS": "TIGER 미국S&P500",
    "143850.KS": "TIGER 미국나스닥100",
    "381170.KS": "KODEX 미국S&P500TR",
    "360750.KS": "TIGER 미국S&P500",
    "458730.KS": "TIGER 미국빅테크10",
    "114260.KS": "KODEX 국고채3년",
    "148070.KS": "KOSEF 국고채10년",
    "136340.KS": "KODEX 단기채권",
    "266160.KS": "KODEX 고배당",
    "279540.KS": "KODEX MSCI한국배당귀족",
    "182480.KS": "TIGER 부동산인프라고배당",
    "195930.KS": "TIGER 해외선진국MSCI",
    "228800.KS": "KODEX 바이오",
    "278540.KS": "KODEX MSCI Korea TR",
}

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def _fetch_prices(ticker: str, days: int) -> pd.Series:
    end = int(datetime.now().timestamp())
    start = int((datetime.now() - timedelta(days=days)).timestamp())
    try:
        resp = requests.get(
            YAHOO_URL.format(ticker=ticker),
            params={"period1": start, "period2": end, "interval": "1d"},
            headers=HEADERS,
            timeout=10,
        )
        data = resp.json()
        closes = data["chart"]["result"][0]["indicators"]["quote"][0]["close"]
        timestamps = data["chart"]["result"][0]["timestamp"]
        series = pd.Series(closes, index=pd.to_datetime(timestamps, unit="s"))
        return series.dropna()
    except Exception:
        return pd.Series(dtype=float)


def _calc_return(prices: pd.Series) -> float:
    if len(prices) < 2:
        return 0.0
    return round((prices.iloc[-1] / prices.iloc[0] - 1) * 100, 2)


def _calc_sharpe(prices: pd.Series) -> float:
    if len(prices) < 5:
        return 0.0
    r = prices.pct_change().dropna()
    vol = r.std() * (252 ** 0.5)
    return round((r.mean() * 252) / vol, 3) if vol > 0 else 0.0


def _calc_volatility(prices: pd.Series) -> float:
    if len(prices) < 5:
        return 99.0
    return round(prices.pct_change().dropna().std() * (252 ** 0.5) * 100, 2)


def analyze_etfs(top_n: int = 10) -> list[dict]:
    results = []
    prices_1y = {t: _fetch_prices(t, 365) for t in ISA_ETF_TICKERS}

    for ticker, name in ISA_ETF_TICKERS.items():
        p = prices_1y[ticker]
        if len(p) < 5:
            continue

        now = p.index[-1]
        p1m = p[p.index >= now - pd.Timedelta(days=30)]
        p3m = p[p.index >= now - pd.Timedelta(days=90)]
        p6m = p[p.index >= now - pd.Timedelta(days=180)]

        ret_1m = _calc_return(p1m)
        ret_3m = _calc_return(p3m)
        ret_6m = _calc_return(p6m)
        ret_1y = _calc_return(p)
        sharpe = _calc_sharpe(p3m)
        vol = _calc_volatility(p3m)

        score = (
            ret_1m * 0.30
            + ret_3m * 0.30
            + ret_6m * 0.20
            + ret_1y * 0.10
            + sharpe * 5 * 0.10
        )
        if vol > 0:
            score += max(0, (20 - vol) * 0.05)

        results.append({
            "ticker": ticker.replace(".KS", ""),
            "name": name,
            "score": round(score, 2),
            "ret_1m": ret_1m,
            "ret_3m": ret_3m,
            "ret_6m": ret_6m,
            "ret_1y": ret_1y,
            "sharpe_3m": sharpe,
            "vol_3m": vol,
            "current_price": int(p.iloc[-1]),
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


def format_message(ranked_etfs: list[dict]) -> str:
    today_str = datetime.now().strftime("%Y년 %m월 %d일")
    lines = [
        f"📊 [{today_str}] ISA 계좌 추천 ETF",
        "━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "🏆 오늘의 TOP ETF 순위",
        "",
    ]

    medals = ["🥇", "🥈", "🥉"] + ["🔹"] * 10

    for i, etf in enumerate(ranked_etfs):
        medal = medals[i]
        arrow_1m = "▲" if etf["ret_1m"] >= 0 else "▼"
        arrow_3m = "▲" if etf["ret_3m"] >= 0 else "▼"
        lines.append(
            f"{medal} {i+1}위 {etf['name']} ({etf['ticker']})\n"
            f"   현재가: {etf['current_price']:,}원\n"
            f"   1개월: {arrow_1m}{abs(etf['ret_1m']):.1f}%  "
            f"3개월: {arrow_3m}{abs(etf['ret_3m']):.1f}%\n"
            f"   샤프: {etf['sharpe_3m']:.2f}  변동성: {etf['vol_3m']:.1f}%\n"
        )

    lines += [
        "━━━━━━━━━━━━━━━━━━━━━━━",
        "💡 ISA 절세 TIP",
        "• 비과세 한도: 200만원 (서민형 400만원)",
        "• 손익통산으로 절세 효과 극대화",
        "• 의무 보유 3년 후 비과세 수령",
        "",
        "⚠️ 투자 참고용이며 책임은 본인에게 있습니다.",
    ]
    return "\n".join(lines)
