import { useState, useEffect, useMemo, useRef } from "react";

/* ================================================================== */
/*  공단기 2027 대비 · 26년 7월 6일(월) 시작 · 월~토 공부 · 48주          */
/* ================================================================== */

const PHASES = [
  { id: 1, name: "입문 · 기초", color: "#2E9C8A" },
  { id: 2, name: "기본이론 1회독", color: "#3B79BD" },
  { id: 3, name: "기출 1회독 + 신유형", color: "#5A5FCB" },
  { id: 4, name: "기출 심화 · 약점", color: "#8A57B4" },
  { id: 5, name: "동형 모의고사 · 실전", color: "#C26A3C" },
];
const SUBJECTS = { 영어: "#2F73C4", 국어: "#D85268", 행정법: "#2E9C7A", 행정학: "#8A63C0", 공통: "#9498A2" };
const SUBJECT_TABS = ["영어", "국어", "행정법", "행정학"];

const COURSES = [
  // 영어 — 순차 배치 (겹침 없음, 주당 최대 6강 = 하루 1강)
  ["영어", "심슨 영기싹(노베이스)", 32, 1, 6],
  ["영어", "심슨 구문", 20, 7, 10],
  ["영어", "심슨 문법", 28, 11, 15],
  ["영어", "심슨 독해", 28, 16, 20],
  ["영어", "기출의 품격·유형별", 36, 21, 26],
  ["영어", "심슨 동형·파이널", 24, 37, 46],
  // 국어 — 순차 배치
  ["국어", "시간단축 공문서·문법독해", 18, 2, 4],
  ["국어", "이선재 올인원", 36, 5, 10],
  ["국어", "논리·독해 훈련(1일3독)", 24, 11, 14],
  ["국어", "선재 예상 기출서", 35, 17, 22],
  ["국어", "신유형 고난도 추론", 14, 23, 25],
  ["국어", "실전형 훈련 모의고사", 20, 29, 36],
  ["국어", "합격선 파이널·봉투", 10, 41, 47],
  // 행정법 — 순차 배치
  ["행정법", "행정법으로의 초대(입문)", 18, 1, 3],
  ["행정법", "써니 행정법총론 올인원", 76, 4, 16],
  ["행정법", "써니 기출문제 풀이", 40, 17, 23],
  ["행정법", "핵심집약", 30, 24, 30],
  ["행정법", "단원별·실전 동형", 24, 37, 46],
  // 행정학 — 순차 배치
  ["행정학", "행정학 입문 특강", 14, 2, 4],
  ["행정학", "황철곤 기본서 올인원", 56, 5, 16],
  ["행정학", "황철곤 핵심 기출", 36, 17, 25],
  ["행정학", "출제범위 확장(고난도)", 14, 26, 30],
  ["행정학", "황철곤 동형·최종병기", 24, 37, 46],
].map(([sub, name, total, ws, we], ci) => {
  const span = we - ws + 1, base = Math.floor(total / span); let rem = total - base * span, lec = 1; const alloc = {};
  for (let w = ws; w <= we; w++) { let c = base + (rem > 0 ? 1 : 0); if (rem > 0) rem--; if (c > 0) { alloc[w] = [lec, lec + c - 1]; lec += c; } }
  return { sub, name, total, ws, we, ci, alloc };
});

const MILESTONES = { 16: "전 과목 1회독 완료", 28: "기출 1회독 완료", 37: "동형 모의고사 시작", 48: "시험" };
const DOW = ["월", "화", "수", "목", "금", "토"];
const START = new Date(2026, 6, 6);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const weekMonday = (W) => addDays(START, (W - 1) * 7);
const fmtMD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const phaseOfWeek = (W) => (W <= 4 ? 1 : W <= 16 ? 2 : W <= 28 ? 3 : W <= 36 ? 4 : 5);
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const planWeekOf = (date) => { const diff = Math.floor((date - START) / 86400000); if (diff < 0) return null; const W = Math.floor(diff / 7) + 1; return W >= 1 && W <= 48 ? W : null; };
const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const EXAM = addDays(weekMonday(48), 5);

const SUB_ORDER = ["영어", "국어", "행정법", "행정학"];

function generateWeek(W) {
  const tasks = [];
  const subDayMap = {}; // 과목 → 강의 있는 요일 Set
  SUB_ORDER.forEach((s) => (subDayMap[s] = new Set()));

  // 과목별 독립 배분 (하루 1강 보장: 각 과목 내 겹치는 강좌 없으므로 round-robin이 곧 1강/일)
  SUB_ORDER.forEach((sub) => {
    let dayIdx = 0;
    COURSES.filter((c) => c.sub === sub).forEach((c) => {
      const r = c.alloc[W];
      if (!r) return;
      for (let l = r[0]; l <= r[1]; l++) {
        const d = dayIdx % 6;
        tasks.push({ id: `w${W}c${c.ci}l${l}`, sub, ci: c.ci, label: `${c.name} 제${l}강`, dDay: d });
        subDayMap[sub].add(d);
        dayIdx++;
      }
    });
  });

  // 매일 고정 카드
  for (let d = 0; d < 6; d++) {
    if (W <= 46) tasks.push({ id: `w${W}v${d}`, sub: "영어", label: "심슨 보카 · 단어 암기", dDay: d, fixed: true });
    tasks.push({ id: `w${W}vk${d}`, sub: "영어", label: "중학 영단어 150개", dDay: d, fixed: true });
    tasks.push({ id: `w${W}i${d}`, sub: "국어", label: "독해야 산다 1일 1독", dDay: d, fixed: true });
  }

  // 당일 복습 카드 (강의 있는 날만, 과목별)
  SUB_ORDER.forEach((sub, si) => {
    subDayMap[sub].forEach((d) => {
      tasks.push({ id: `w${W}rv${si}d${d}`, sub, label: `${sub} 당일 복습`, dDay: d, isReview: true });
    });
  });

  // 토요일 종합
  tasks.push({ id: `w${W}r`, sub: "공통", label: W >= 37 ? "동형 오답 정리 + 단권화 회독" : "이번 주 복습 + 약점 점검", dDay: 5 });
  return { W, phase: phaseOfWeek(W), milestone: MILESTONES[W], monday: weekMonday(W), tasks };
}
const WEEKS = {}; for (let W = 1; W <= 48; W++) WEEKS[W] = generateWeek(W);
const ALL_TASKS = []; for (let W = 1; W <= 48; W++) ALL_TASKS.push(...WEEKS[W].tasks);
const phaseMeta = (id) => { const i = PHASES.findIndex((p) => p.id === id); return { ...PHASES[i], order: i + 1 }; };
const STORAGE_KEY = "study-plan-v4";
const MIN_DAILY = "심슨 보카 + 중학 영단어 150개 + 국어 1일 1독 + 인강 1강 복습";

export default function StudyPlanner() {
  const [checked, setChecked] = useState({});
  const [moves, setMoves] = useState({});
  const [edits, setEdits] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("time");
  const [selW, setSelW] = useState(1);
  const [subj, setSubj] = useState("영어");
  const [dragId, setDragId] = useState(null);
  const [overDay, setOverDay] = useState(null);
  const didInit = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const v = JSON.parse(raw); setChecked(v.c || {}); setMoves(v.m || {}); setEdits(v.e || {}); }
    } catch (e) {}
    setLoaded(true);
  }, []);

  const save = (c, m, e) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ c, m, e })); } catch (e2) {}
  };
  const toggle = (id) => setChecked((p) => { const n = { ...p }; if (n[id]) delete n[id]; else n[id] = true; save(n, moves, edits); return n; });
  const moveTo = (id, d) => setMoves((p) => { const n = { ...p, [id]: d }; save(checked, n, edits); return n; });
  const resetAll = () => { setChecked({}); setMoves({}); setEdits({}); save({}, {}, {}); };

  const startEdit = (t) => { setEditingId(t.id); setEditVal(edits[t.id] ?? t.label); };
  const commitEdit = (id) => {
    const trimmed = editVal.trim();
    setEdits((p) => {
      const n = trimmed ? { ...p, [id]: trimmed } : (() => { const x = { ...p }; delete x[id]; return x; })();
      save(checked, moves, n);
      return n;
    });
    setEditingId(null);
  };

  const stats = useMemo(() => {
    let done = 0; const bySub = {}, byCourse = {}, perWeek = {};
    Object.keys(SUBJECTS).forEach((s) => (bySub[s] = { d: 0, t: 0 }));
    COURSES.forEach((c) => (byCourse[c.ci] = { d: 0, t: 0 }));
    for (let W = 1; W <= 48; W++) perWeek[W] = { d: 0, t: 0 };
    ALL_TASKS.forEach((t) => {
      const W = +t.id.slice(1).split(/[civr]/)[0];
      perWeek[W].t++; bySub[t.sub].t++; if (t.ci != null) byCourse[t.ci].t++;
      if (checked[t.id]) { done++; perWeek[W].d++; bySub[t.sub].d++; if (t.ci != null) byCourse[t.ci].d++; }
    });
    let cur = 48; for (let W = 1; W <= 48; W++) if (perWeek[W].d < perWeek[W].t) { cur = W; break; }
    return { done, total: ALL_TASKS.length, bySub, byCourse, perWeek, cur };
  }, [checked]);

  useEffect(() => {
    if (loaded && !didInit.current) {
      didInit.current = true;
      const tW = planWeekOf(TODAY); const tdi = (TODAY.getDay() + 6) % 7;
      setSelW(tW && tdi <= 5 ? tW : stats.cur);
    }
  }, [loaded, stats]);

  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const dayOf = (t) => (moves[t.id] != null ? moves[t.id] : t.dDay);
  const subTag = (s) => { const c = SUBJECTS[s]; return <span className="p-subj" style={{ background: `${c}1A`, color: c }}>{s}</span>; };
  const dday = Math.ceil((EXAM - TODAY) / 86400000);
  const todayW = planWeekOf(TODAY);

  /* ---------------- 시간별 (한 주 · 가로 한 줄) ---------------- */
  const board = WEEKS[selW]; const bpm = phaseMeta(board.phase); const bst = stats.perWeek[selW];
  const bpct = bst.t ? Math.round((bst.d / bst.t) * 100) : 0;

  const TimeView = (
    <div className="p-view">
      <div className="p-strip">
        {PHASES.map((p, i) => {
          const ws = []; for (let W = 1; W <= 48; W++) if (phaseOfWeek(W) === p.id) ws.push(W);
          let d = 0, t = 0; ws.forEach((W) => { d += stats.perWeek[W].d; t += stats.perWeek[W].t; });
          const on = board.phase === p.id;
          return (
            <button key={p.id} className={`p-strip-seg${on ? " on" : ""}`} style={{ flexGrow: t }} onClick={() => setSelW(ws[0])} title={`${i + 1}단계 · ${p.name}`}>
              <span className="p-strip-track"><span className="p-strip-fill" style={{ width: `${t ? (d / t) * 100 : 0}%`, background: p.color }} /></span>
              <span className="p-strip-num num" style={on ? { color: p.color } : undefined}>{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* 주 네비게이터 */}
      <div className="p-wknav">
        <button className="p-nav-btn" onClick={() => setSelW((w) => Math.max(1, w - 1))} disabled={selW === 1} aria-label="지난 주">‹</button>
        <div className="p-wknav-mid">
          <div className="p-wknav-t"><span className="p-wknav-chip" style={{ background: `${bpm.color}16`, color: bpm.color }}>{bpm.order}단계</span><span className="p-wknav-n">{selW}주차</span>{board.milestone && <span className="p-wknav-ms" style={{ color: bpm.color }}>🚩 {board.milestone}</span>}</div>
          <div className="p-wknav-d num">{fmtMD(board.monday)} ~ {fmtMD(addDays(board.monday, 5))} · {dday > 0 ? `시험까지 D-${dday}` : dday === 0 ? "시험일 🎯" : "수고했어요"}</div>
        </div>
        <button className="p-nav-btn" onClick={() => setSelW((w) => Math.min(48, w + 1))} disabled={selW === 48} aria-label="다음 주">›</button>
      </div>
      <div className="p-wktop">
        <div className="p-wkbar"><div className="p-wkbar-f" style={{ width: `${bpct}%`, background: bpm.color }} /></div>
        <span className="p-wkbar-cap">{bpct === 100 ? "이번 주 다 했어요 👏" : <>이번 주 <b className="num">{bst.d}</b>/<span className="num">{bst.t}</span></>}</span>
        {todayW && todayW !== selW && <button className="p-today-jump" onClick={() => setSelW(todayW)}>오늘 주로</button>}
      </div>

      {/* 한 주를 한 줄로 (월~토) */}
      <div className="p-week">
        {DOW.map((dow, d) => {
          const date = addDays(board.monday, d); const isToday = sameDay(date, TODAY);
          const items = board.tasks.filter((t) => dayOf(t) === d);
          return (
            <div key={d} className={`p-col${overDay === d ? " over" : ""}${isToday ? " today" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOverDay(d); }} onDragLeave={() => setOverDay((o) => (o === d ? null : o))}
              onDrop={() => { if (dragId != null) moveTo(dragId, d); setDragId(null); setOverDay(null); }}>
              <div className="p-col-head">
                <span className="p-col-date">{fmtMD(date)}({dow})</span>
                {isToday && <span className="p-col-today">오늘</span>}
              </div>
              <div className="p-col-body">
                {items.length === 0 && <div className="p-col-empty">여기로 옮겨도 돼요</div>}
                {items.map((t) => {
                  const on = !!checked[t.id]; const sc = SUBJECTS[t.sub];
                  const isEditing = editingId === t.id;
                  const label = edits[t.id] ?? t.label;
                  return (
                    <div key={t.id} className={`p-card${on ? " on" : ""}${isEditing ? " editing" : ""}${t.isReview ? " review" : ""}`} style={{ "--sc": sc }}
                      draggable={!isEditing} onDragStart={() => !isEditing && setDragId(t.id)} onDragEnd={() => { setDragId(null); setOverDay(null); }}>
                      <div className="p-card-top">
                        <button className="p-card-ck" onClick={() => toggle(t.id)} aria-pressed={on} aria-label="완료"><span className="p-box">{on && <svg viewBox="0 0 16 16" width="10" height="10"><path d="M3 8.5l3 3 7-7.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span></button>
                        {subTag(t.sub)}
                        {edits[t.id] && !isEditing && <span className="p-edited-dot" title="수정됨" />}
                      </div>
                      {isEditing ? (
                        <input
                          className="p-card-input"
                          value={editVal}
                          autoFocus
                          onChange={(e) => setEditVal(e.target.value)}
                          onBlur={() => commitEdit(t.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(t.id); if (e.key === "Escape") setEditingId(null); }}
                        />
                      ) : (
                        <span className="p-card-text" onDoubleClick={() => startEdit(t)} title="더블클릭으로 수정">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-scrollhint">← 좌우로 넘기면 토요일까지 보여요 · 일요일은 쉬는 날 🌿</div>
    </div>
  );

  /* ---------------- 과목별 ---------------- */
  const subCourses = COURSES.filter((c) => c.sub === subj);
  const ssub = stats.bySub[subj]; const sPct = ssub.t ? Math.round((ssub.d / ssub.t) * 100) : 0; const sc = SUBJECTS[subj];
  const axisMonths = [0, 3, 6, 9, 11];

  const SubjectView = (
    <div className="p-view">
      <div className="p-tabs">{SUBJECT_TABS.map((s) => (<button key={s} className={`p-tab${s === subj ? " on" : ""}`} onClick={() => setSubj(s)} style={s === subj ? { background: SUBJECTS[s], color: "#fff", borderColor: SUBJECTS[s] } : { color: SUBJECTS[s] }}>{s}</button>))}</div>
      <p className="p-tabs-hint">강좌가 1년 중 언제 진행되는지, 지금 어디까지 왔는지 한눈에 볼 수 있어요.</p>
      <div className="p-shead" style={{ "--sc": sc }}>
        <div className="p-shead-top"><span className="p-shead-name">{subj}</span><span className="num p-shead-pct" style={{ color: sc }}>{sPct}%</span></div>
        <div className="p-shead-daily">매일 하는 것 · {subj === "영어" ? "단어(보카) 암기" : subj === "국어" ? "독해야 산다 1일 1독" : "단권화 회독"}</div>
      </div>
      <div className="p-gantt" style={{ "--sc": sc }}>
        <div className="p-gantt-axis">{axisMonths.map((w) => { const mon = weekMonday(w * 4 + 1); return <span key={w} className="num" style={{ left: `${(w * 4 / 48) * 100}%` }}>{mon.getMonth() + 1}월</span>; })}</div>
        {subCourses.map((c) => {
          const bc = stats.byCourse[c.ci]; const cp = bc.t ? Math.round((bc.d / bc.t) * 100) : 0;
          const left = ((c.ws - 1) / 48) * 100, width = ((c.we - c.ws + 1) / 48) * 100;
          return (
            <div className="p-grow" key={c.ci}>
              <div className="p-grow-label">{c.name} <span className="num p-grow-n">{c.total}강</span></div>
              <div className="p-grow-track"><div className="p-grow-bar" style={{ left: `${left}%`, width: `${width}%`, background: `${sc}28` }}><div className="p-grow-fill" style={{ width: `${cp}%`, background: sc }} /><span className="num p-grow-pct" style={{ color: cp > 55 ? "#fff" : sc }}>{cp}%</span></div></div>
            </div>
          );
        })}
      </div>
      <div className="p-gantt-note">막대 = 그 강좌가 진행되는 시기 · 채워진 색 = 들은 강의 비율. 자세한 강·날짜는 시간별 보기에서.</div>
    </div>
  );

  return (
    <div className="p-root">
      <style>{CSS}</style>
      <div className="p-wrap">
        <header className="p-top">
          <div><div className="p-eyebrow">울산 지방직 9급 · 일반행정</div><h1 className="p-title">1년 합격 플래너</h1></div>
          <div className="p-overall"><span className="num p-overall-n">{pct}</span><span className="p-overall-p">%</span></div>
        </header>
        <div className="p-toggle">
          <button className={`p-toggle-b${view === "time" ? " on" : ""}`} onClick={() => setView("time")}>시간별</button>
          <button className={`p-toggle-b${view === "subject" ? " on" : ""}`} onClick={() => setView("subject")}>과목별</button>
        </div>
        {view === "time" ? TimeView : SubjectView}
        <div className="p-floor">
          <div className="p-floor-icon"><svg viewBox="0 0 16 16" width="13" height="13"><path d="M3 8.5l3 3 7-7.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <div className="p-floor-text"><div className="p-floor-tag">아무리 바쁜 날도, 이것만</div><div className="p-floor-body">{MIN_DAILY}</div><div className="p-floor-note">이거 하나면 오늘도 잘한 거예요</div></div>
          <button className="p-reset" onClick={resetAll}>처음부터 다시</button>
        </div>
        <footer className="p-foot"><b>26년 7월 6일(월) 시작</b> 기준이에요. 강 번호는 제공된 커리큘럼의 강 수를 바탕으로 배분한 값이라, 실제 강의 목록에 맞춰 살짝 조정하면 돼요.</footer>
      </div>
    </div>
  );
}

const CSS = `
.p-root{--bg:#F6F7F9;--surface:#FFFFFF;--panel:#FAFBFC;--ink:#1A1B1F;--ink2:#52545C;--muted:#8C8F98;--line:#EAEBEF;--line2:#F1F2F5;--ring:#E9EAEF;--shadow:0 1px 2px rgba(20,22,33,.05),0 2px 6px rgba(20,22,33,.04);--shadow-h:0 4px 14px rgba(20,22,33,.09);background:var(--bg);color:var(--ink);font-family:"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;-webkit-font-smoothing:antialiased;line-height:1.55;letter-spacing:-.005em;}
.p-root *{box-sizing:border-box;}
.num{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
.p-wrap{max-width:1040px;margin:0 auto;padding:24px 18px 44px;}
.p-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;}
.p-eyebrow{font-size:11px;letter-spacing:.04em;color:var(--muted);font-weight:600;}
.p-title{font-size:23px;font-weight:800;letter-spacing:-.035em;margin:5px 0 0;}
.p-overall{display:flex;align-items:baseline;font-weight:800;}
.p-overall-n{font-size:26px;letter-spacing:-.04em;}.p-overall-p{font-size:14px;color:var(--muted);margin-left:1px;}
.p-toggle{display:flex;gap:4px;background:var(--line2);border:1px solid var(--line);border-radius:12px;padding:4px;margin-bottom:18px;}
.p-toggle-b{flex:1;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--ink2);background:none;border:0;border-radius:9px;padding:9px;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s;}
.p-toggle-b.on{background:var(--surface);color:var(--ink);box-shadow:var(--shadow);}

.p-strip{display:flex;gap:5px;margin-bottom:16px;}
.p-strip-seg{flex-grow:1;display:flex;flex-direction:column;gap:5px;background:none;border:0;padding:0;cursor:pointer;min-width:0;}
.p-strip-track{height:8px;border-radius:99px;background:var(--ring);overflow:hidden;}
.p-strip-fill{display:block;height:100%;border-radius:99px;transition:width .4s ease;}
.p-strip-num{font-size:10px;color:var(--muted);font-weight:700;text-align:center;}
.p-strip-seg.on .p-strip-track{box-shadow:0 0 0 1.5px var(--surface),0 0 0 3px rgba(20,22,33,.12);}

.p-wknav{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.p-nav-btn{width:36px;height:36px;flex-shrink:0;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:21px;line-height:1;cursor:pointer;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;transition:transform .12s,box-shadow .15s;}
.p-nav-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:var(--shadow-h);}
.p-nav-btn:disabled{opacity:.35;cursor:default;}
.p-wknav-mid{flex:1;text-align:center;min-width:0;}
.p-wknav-t{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;}
.p-wknav-chip{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;}
.p-wknav-n{font-size:18px;font-weight:800;letter-spacing:-.02em;}
.p-wknav-ms{font-size:11.5px;font-weight:700;}
.p-wknav-d{font-size:12.5px;color:var(--muted);font-weight:700;margin-top:3px;}

.p-wktop{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.p-wkbar{flex:1;height:6px;border-radius:99px;background:var(--ring);overflow:hidden;}
.p-wkbar-f{height:100%;border-radius:99px;transition:width .4s ease;}
.p-wkbar-cap{font-size:12px;color:var(--muted);font-weight:700;white-space:nowrap;}
.p-wkbar-cap b{color:var(--ink);}
.p-today-jump{font-family:inherit;font-size:11.5px;font-weight:700;color:var(--ink2);background:var(--surface);border:1px solid var(--line);border-radius:99px;padding:5px 11px;cursor:pointer;white-space:nowrap;box-shadow:var(--shadow);}
.p-today-jump:hover{background:var(--line2);}

.p-week{display:flex;overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--surface);box-shadow:var(--shadow);scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;}
.p-col{flex:1 0 152px;min-width:152px;scroll-snap-align:start;background:var(--surface);border-right:1px solid var(--line);padding:10px 9px;display:flex;flex-direction:column;transition:background .15s;}
.p-col:last-child{border-right:0;}
.p-col.today{background:#3B79BD0e;}
.p-col.over{background:#3B79BD1c;}
.p-col-head{display:flex;align-items:center;gap:6px;padding:0 1px 9px;border-bottom:1px solid var(--line2);margin-bottom:9px;}
.p-col-date{font-size:15px;font-weight:800;color:var(--ink);letter-spacing:-.01em;}
.p-col.today .p-col-date{color:#2F73C4;}
.p-col-today{margin-left:auto;font-size:9px;font-weight:800;color:#fff;background:#3B79BD;padding:2px 7px;border-radius:99px;}
.p-col-body{display:flex;flex-direction:column;gap:6px;min-height:60px;flex:1;}
.p-col-empty{font-size:11px;color:#C2C4CC;font-weight:600;padding:6px 2px;text-align:center;}
.p-card{display:flex;flex-direction:column;gap:5px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px;box-shadow:var(--shadow);cursor:grab;}
.p-card:active{cursor:grabbing;}
.p-card-top{display:flex;align-items:center;gap:6px;}
.p-card-ck{background:none;border:0;padding:0;cursor:pointer;flex-shrink:0;}
.p-box{width:18px;height:18px;border-radius:6px;border:1.6px solid #CFD0D8;background:var(--surface);display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s;}
.p-card.on .p-box{background:var(--sc);border-color:var(--sc);}
.p-subj{text-align:center;padding:1.5px 7px;border-radius:6px;font-size:10.5px;font-weight:800;line-height:1.5;}
.p-card-text{font-size:12.5px;line-height:1.45;cursor:text;}
.p-card.on .p-card-text{color:var(--muted);text-decoration:line-through;text-decoration-color:#CFD0D8;}
.p-card.on .p-subj{opacity:.5;}
.p-card.editing{border-color:#3B79BD;box-shadow:0 0 0 2px #3B79BD33;}
.p-card.review{background:var(--panel);border-style:dashed;border-color:var(--line);}
.p-card.review .p-card-text{color:var(--ink2);font-style:italic;}
.p-card-input{font-family:inherit;font-size:12.5px;line-height:1.45;width:100%;border:0;outline:none;background:transparent;color:var(--ink);padding:0;resize:none;}
.p-edited-dot{width:6px;height:6px;border-radius:99px;background:#3B79BD;margin-left:auto;flex-shrink:0;}
.p-scrollhint{font-size:11.5px;color:var(--muted);font-weight:600;text-align:center;margin-top:10px;}

.p-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px;}
.p-tab{font-family:inherit;font-size:13px;font-weight:700;padding:7px 16px;border-radius:99px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;box-shadow:var(--shadow);transition:transform .12s;}
.p-tab:hover{transform:translateY(-1px);}
.p-tabs-hint{font-size:12px;color:var(--muted);margin:0 0 16px;}
.p-shead{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;box-shadow:var(--shadow);margin-bottom:16px;}
.p-shead-top{display:flex;align-items:baseline;justify-content:space-between;}
.p-shead-name{font-size:19px;font-weight:800;letter-spacing:-.03em;}
.p-shead-pct{font-size:18px;font-weight:800;}
.p-shead-daily{font-size:12px;color:var(--ink2);font-weight:600;margin-top:4px;}
.p-gantt{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:30px 14px 14px;box-shadow:var(--shadow);}
.p-gantt-axis{position:absolute;top:9px;left:14px;right:14px;height:14px;}
.p-gantt-axis span{position:absolute;font-size:10px;color:var(--muted);font-weight:700;transform:translateX(-2px);}
.p-grow{margin-bottom:11px;}
.p-grow-label{font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:4px;}
.p-grow-n{font-size:11px;color:var(--muted);font-weight:700;margin-left:3px;}
.p-grow-track{position:relative;height:20px;background:var(--line2);border-radius:6px;}
.p-grow-bar{position:absolute;top:0;height:100%;border-radius:6px;overflow:hidden;display:flex;align-items:center;min-width:30px;}
.p-grow-fill{position:absolute;left:0;top:0;height:100%;border-radius:6px;transition:width .4s ease;}
.p-grow-pct{position:relative;font-size:10px;font-weight:800;padding-left:6px;z-index:1;}
.p-gantt-note{font-size:11.5px;color:var(--muted);margin-top:10px;line-height:1.5;}

.p-floor{display:flex;gap:11px;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px 14px;box-shadow:var(--shadow);margin-top:18px;}
.p-floor-icon{width:26px;height:26px;border-radius:8px;background:linear-gradient(160deg,#34B98A,#2E9C8A);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
.p-floor-text{flex:1;min-width:0;}
.p-floor-tag{font-size:11px;font-weight:700;color:var(--muted);margin-bottom:2px;}
.p-floor-body{font-size:13.5px;font-weight:600;color:var(--ink);line-height:1.4;}
.p-floor-note{font-size:11.5px;color:#2E9C8A;font-weight:600;margin-top:3px;}
.p-reset{align-self:center;flex-shrink:0;font-family:inherit;font-size:12px;font-weight:600;color:var(--muted);background:none;border:0;cursor:pointer;padding:6px 4px;white-space:nowrap;}
.p-reset:hover{color:var(--ink2);}
.p-foot{font-size:12px;color:var(--muted);margin-top:14px;line-height:1.6;}
.p-foot b{color:var(--ink2);}

@media (max-width:480px){.p-title{font-size:21px;}.p-wknav-n{font-size:16px;}}
@media (prefers-reduced-motion:reduce){*{transition:none !important;}}
`;
