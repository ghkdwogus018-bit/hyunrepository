"""
ISA 계좌용 국내 ETF 수익성 분석 모듈
pykrx와 FinanceDataReader를 사용해 ETF 성과를 측정하고 순위를 매깁니다.
"""

from datetime import datetime, timedelta
import pandas as pd
import numpy as np

try:
    from pykrx import stock as krx_stock
except ImportError:
    krx_stock = None



# ISA 계좌에서 주로 활용되는 국내 ETF 티커 목록
ISA_ETF_TICKERS = {
    # 국내 주식
    "069500": "KODEX 200",
    "102110": "TIGER 200",
    "229200": "KODEX 코스닥150",
    "278540": "KODEX MSCI Korea TR",
    "091160": "KODEX 반도체",
    "091170": "KODEX 은행",
    "098560": "TIGER 미디어&엔터",
    "228800": "KODEX 바이오",
    # 해외 주식 ETF (국내 상장)
    "133690": "TIGER 미국S&P500",
    "143850": "TIGER 미국나스닥100",
    "195930": "TIGER 해외선진국MSCI World",
    "381170": "KODEX 미국S&P500TR",
    "360750": "TIGER 미국S&P500",
    "379800": "KODEX 미국S&P500",
    "458730": "TIGER 미국빅테크10",
    # 채권 ETF
    "114260": "KODEX 국고채3년",
    "148070": "KOSEF 국고채10년",
    "136340": "KODEX 단기채권",
    "153130": "KODEX 단기채권PLUS",
    # 배당 ETF
    "266160": "KODEX 고배당",
    "279540": "KODEX MSCI한국배당귀족",
    "161510": "TIGER 우량회사채",
    # 리츠/인프라
    "182480": "TIGER 부동산인프라고배당",
    # 혼합/멀티에셋
    "272220": "KODEX 혼합자산",
}


def _get_price_data(ticker: str, start: str, end: str) -> pd.Series:
    """KRX에서 ETF 종가 시계열을 가져옵니다."""
    if krx_stock is None:
        return pd.Series(dtype=float)
    try:
        df = krx_stock.get_etf_ohlcv_by_date(start, end, ticker)
        if df is None or df.empty:
            return pd.Series(dtype=float)
        return df["NAV"] if "NAV" in df.columns else df["종가"]
    except Exception:
        return pd.Series(dtype=float)


def _calc_metrics(prices: pd.Series) -> dict:
    """수익률, 변동성, 샤프지수를 계산합니다."""
    if len(prices) < 5:
        return {}

    returns = prices.pct_change().dropna()
    total_ret = (prices.iloc[-1] / prices.iloc[0]) - 1
    annual_vol = returns.std() * np.sqrt(252)
    sharpe = (returns.mean() * 252) / annual_vol if annual_vol > 0 else 0

    return {
        "total_return": round(total_ret * 100, 2),
        "annual_volatility": round(annual_vol * 100, 2),
        "sharpe_ratio": round(sharpe, 3),
        "current_price": int(prices.iloc[-1]),
    }


def analyze_etfs(top_n: int = 10) -> list[dict]:
    """
    ISA ETF 전체를 분석하고 종합 점수 순으로 정렬해 반환합니다.

    종합 점수 = (1M 수익 × 0.3) + (3M 수익 × 0.3) + (6M 수익 × 0.2) +
                (1Y 수익 × 0.1) + (샤프 × 5 × 0.1)
    변동성이 낮을수록 보너스 점수 부여.
    """
    today = datetime.now()
    periods = {
        "1M": (today - timedelta(days=30)).strftime("%Y%m%d"),
        "3M": (today - timedelta(days=90)).strftime("%Y%m%d"),
        "6M": (today - timedelta(days=180)).strftime("%Y%m%d"),
        "1Y": (today - timedelta(days=365)).strftime("%Y%m%d"),
    }
    end_date = today.strftime("%Y%m%d")

    results = []
    for ticker, name in ISA_ETF_TICKERS.items():
        row = {"ticker": ticker, "name": name}
        metrics_by_period = {}
        for period_label, start_date in periods.items():
            prices = _get_price_data(ticker, start_date, end_date)
            m = _calc_metrics(prices)
            metrics_by_period[period_label] = m

        if not metrics_by_period.get("1M"):
            continue

        ret_1m = metrics_by_period["1M"].get("total_return", 0)
        ret_3m = metrics_by_period["3M"].get("total_return", 0)
        ret_6m = metrics_by_period["6M"].get("total_return", 0)
        ret_1y = metrics_by_period["1Y"].get("total_return", 0)
        sharpe = metrics_by_period["3M"].get("sharpe_ratio", 0)
        vol = metrics_by_period["3M"].get("annual_volatility", 99)

        score = (
            ret_1m * 0.30
            + ret_3m * 0.30
            + ret_6m * 0.20
            + ret_1y * 0.10
            + sharpe * 5 * 0.10
        )
        if vol > 0:
            score += max(0, (20 - vol) * 0.05)

        row.update(
            {
                "score": round(score, 2),
                "ret_1m": ret_1m,
                "ret_3m": ret_3m,
                "ret_6m": ret_6m,
                "ret_1y": ret_1y,
                "sharpe_3m": sharpe,
                "vol_3m": vol,
                "current_price": metrics_by_period["1M"].get("current_price", 0),
            }
        )
        results.append(row)

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


def format_message(ranked_etfs: list[dict]) -> str:
    """분석 결과를 카카오톡 전송용 텍스트로 변환합니다."""
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
        ret_1m = etf["ret_1m"]
        ret_3m = etf["ret_3m"]
        arrow_1m = "▲" if ret_1m >= 0 else "▼"
        arrow_3m = "▲" if ret_3m >= 0 else "▼"

        lines.append(
            f"{medal} {i+1}위 {etf['name']} ({etf['ticker']})\n"
            f"   현재가: {etf['current_price']:,}원\n"
            f"   1개월: {arrow_1m}{abs(ret_1m):.1f}% | "
            f"3개월: {arrow_3m}{abs(ret_3m):.1f}%\n"
            f"   샤프: {etf['sharpe_3m']:.2f} | "
            f"변동성: {etf['vol_3m']:.1f}%\n"
        )

    lines += [
        "━━━━━━━━━━━━━━━━━━━━━━━",
        "💡 ISA 절세 TIP",
        "• 비과세 한도: 200만원 (서민형 400만원)",
        "• 손익통산으로 절세 효과 극대화",
        "• 의무 보유 3년 후 비과세 수령 가능",
        "",
        "⚠️ 본 정보는 투자 참고용이며 투자 판단의 책임은 본인에게 있습니다.",
    ]

    return "\n".join(lines)
