/* 단어팡 — 심슨보카 하루 복습 게임
   순수 바닐라 JS. 외부 의존성 없음. */
(function () {
  'use strict';

  var VOCAB = window.VOCAB || [];
  var app = document.getElementById('app');
  var fx = document.getElementById('fx');

  var POS_KO = { v: '동사', n: '명사', a: '형용사', ad: '부사', adv: '부사', prep: '전치사', conj: '접속사', pron: '대명사', int: '감탄사', phr: '숙어', x: '숙어·표현' };

  /* ---------------- 저장소 ---------------- */
  var SKEY = 'danapang.v1';
  var store = load();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(SKEY));
      if (s && s.days) return s;
    } catch (e) {}
    return { days: {}, xp: 0, streak: 0, lastPlayed: null, totalCorrect: 0, muted: false };
  }
  function save() { try { localStorage.setItem(SKEY, JSON.stringify(store)); } catch (e) {} }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function markPlayedToday() {
    var t = todayStr();
    if (store.lastPlayed === t) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var ystr = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    store.streak = (store.lastPlayed === ystr) ? (store.streak + 1) : 1;
    store.lastPlayed = t;
    save();
  }

  function levelInfo() {
    var xp = store.xp || 0;
    var lvl = Math.floor(xp / 500) + 1;
    var into = xp - (lvl - 1) * 500;
    return { lvl: lvl, into: into, need: 500, pct: Math.round(into / 500 * 100) };
  }

  /* ---------------- 유틸 ---------------- */
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  // 뜻에서 앞의 품사표기(v. n. a.)를 떼어 보기 라벨용으로 정리
  function cleanMeaning(m) {
    return m.replace(/^(v|n|a|ad|adv|prep|conj|pron|int|phr)\.\s*/i, '').trim();
  }
  function posLabel(pos) { return POS_KO[pos] || '표현'; }

  /* ---------------- 사운드 (WebAudio, 짧고 부드럽게) ---------------- */
  var actx = null;
  function beep(freqs, dur, type) {
    if (store.muted) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var t0 = actx.currentTime;
      freqs.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        var st = t0 + i * 0.08;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.18, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g); g.connect(actx.destination);
        o.start(st); o.stop(st + dur + 0.02);
      });
    } catch (e) {}
  }
  function soundCorrect(combo) {
    var base = [523, 659, 784]; // C E G
    if (combo >= 3) base = [659, 784, 988];
    if (combo >= 6) base = [784, 988, 1175];
    beep(base, 0.16, 'triangle');
  }
  function soundWrong() { beep([311, 233], 0.22, 'sine'); }

  /* ---------------- 이펙트 ---------------- */
  var CONF_COLORS = ['#6c5ce7', '#18b980', '#ffb020', '#ff6b81', '#4dabff', '#ff9ff3'];
  function confetti(n) {
    n = n || 26;
    var W = window.innerWidth;
    for (var i = 0; i < n; i++) {
      (function () {
        var c = el('div', 'confetti');
        var x = W / 2 + (Math.random() - 0.5) * 120;
        var col = CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)];
        c.style.background = col;
        c.style.left = x + 'px';
        c.style.top = '38%';
        c.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
        fx.appendChild(c);
        var dx = (Math.random() - 0.5) * 420;
        var dy = 320 + Math.random() * 260;
        var rot = (Math.random() - 0.5) * 720;
        var dur = 900 + Math.random() * 700;
        c.animate([
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)', opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)' });
        setTimeout(function () { c.remove(); }, dur);
      })();
    }
  }
  function floatWord(text, color) {
    var f = el('div', 'floatword', text);
    f.style.color = color || '#18b980';
    f.style.left = '50%';
    f.style.top = '32%';
    f.style.transform = 'translateX(-50%)';
    f.style.fontSize = '26px';
    fx.appendChild(f);
    setTimeout(function () { f.remove(); }, 1000);
  }

  /* ---------------- 화면 전환 ---------------- */
  function render(node) {
    app.innerHTML = '';
    app.appendChild(node);
    window.scrollTo(0, 0);
  }

  /* ================= 홈 화면 ================= */
  function Home() {
    var s = el('div', 'screen');

    // 상단바
    var top = el('div', 'topbar');
    top.appendChild(el('div', 'brand', '<span class="logo">🐣</span><span>단어팡</span>'));
    var chips = el('div', 'chips');
    chips.appendChild(el('div', 'chip fire', '🔥 ' + (store.streak || 0) + '일'));
    chips.appendChild(el('div', 'chip xp', '⭐ ' + (store.xp || 0)));
    top.appendChild(chips);
    s.appendChild(top);

    // 히어로 (레벨)
    var li = levelInfo();
    var hero = el('div', 'hero');
    hero.innerHTML =
      '<h1>오늘의 단어 복습 🎯</h1>' +
      '<p>하루치 단어를 게임하듯 가볍게 넘겨보세요.</p>' +
      '<div class="level-row">' +
        '<span class="level-badge">Lv.' + li.lvl + '</span>' +
        '<div class="xpbar"><span style="width:' + li.pct + '%"></span></div>' +
      '</div>' +
      '<div class="xp-caption">다음 레벨까지 ' + (li.need - li.into) + ' XP</div>';
    s.appendChild(hero);

    // 이어하기 / 추천
    var doneDays = Object.keys(store.days).filter(function (k) { return store.days[k].cleared; }).map(Number);
    var reviewDays = Object.keys(store.days).filter(function (k) { return (store.days[k].wrong || []).length; }).map(Number);
    var nextDay = 1;
    for (var i = 1; i <= VOCAB.length; i++) { if (!(store.days[i] && store.days[i].cleared)) { nextDay = i; break; } }

    s.appendChild(el('div', 'section-title', '이어서 학습 <small>추천</small>'));
    var cont = el('div', 'continue');
    cont.innerHTML =
      '<div class="emoji">📘</div>' +
      '<div class="txt"><b>Day ' + pad(nextDay) + ' 시작하기</b>' +
      '<span>' + (VOCAB[nextDay - 1] ? VOCAB[nextDay - 1].words.length : 50) + '개 단어 · 약 3분</span></div>' +
      '<div class="go">›</div>';
    cont.onclick = function () { render(Setup(nextDay)); };
    s.appendChild(cont);

    if (reviewDays.length) {
      var total = reviewDays.reduce(function (a, d) { return a + store.days[d].wrong.length; }, 0);
      var rev = el('div', 'continue');
      rev.style.marginTop = '10px';
      rev.innerHTML =
        '<div class="emoji">🩹</div>' +
        '<div class="txt"><b>틀린 단어 복습</b>' +
        '<span>' + reviewDays.length + '개 Day · 총 ' + total + '단어 대기 중</span></div>' +
        '<div class="go">›</div>';
      rev.onclick = function () { startReviewAll(reviewDays); };
      s.appendChild(rev);
    }

    // Day 그리드
    s.appendChild(el('div', 'section-title', 'Day 선택 <small>' + doneDays.length + ' / ' + VOCAB.length + ' 완료</small>'));
    var grid = el('div', 'grid');
    VOCAB.forEach(function (d, idx) {
      var day = d.day;
      var rec = store.days[day];
      var cell = el('div', 'day' + (rec && rec.cleared ? ' done' : ''));
      var star = rec && rec.best >= d.words.length ? '⭐' : (rec && rec.cleared ? '✔️' : '');
      cell.innerHTML = '<span>' + pad(day) + '</span><small>Day</small>' +
        (star ? '<span class="star">' + star + '</span>' : '') +
        (rec && (rec.wrong || []).length ? '<span class="rev-dot"></span>' : '');
      cell.onclick = function () { render(Setup(day)); };
      grid.appendChild(cell);
    });
    s.appendChild(grid);

    s.appendChild(el('div', 'footer-note',
      '심슨보카 2027 · DAY별 단어 ' + VOCAB.length + '일 · 총 ' +
      VOCAB.reduce(function (a, d) { return a + d.words.length; }, 0) + '단어<br>기록은 이 브라우저에만 저장돼요.'));

    return s;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ================= 설정 시트 ================= */
  var sessionSize = 25;
  function Setup(day) {
    var d = VOCAB[day - 1];
    var s = el('div', 'screen');

    var top = el('div', 'topbar');
    top.appendChild(el('div', 'brand', '<span class="logo">🐣</span><span>단어팡</span>'));
    var back = el('button', 'link', '← 홈');
    back.onclick = function () { render(Home()); };
    top.appendChild(back);
    s.appendChild(top);

    var box = el('div', 'setup');
    box.appendChild(el('h2', null, 'Day ' + pad(day)));
    var rec = store.days[day];
    var subtxt = '전체 ' + d.words.length + '단어' + (rec && rec.cleared ? ' · 최고 ' + rec.best + '/' + d.words.length : ' · 첫 도전');
    box.appendChild(el('div', 'sub', subtxt));

    box.appendChild(el('div', 'opt-label', '문제 수'));
    var seg = el('div', 'segment');
    [10, 25, d.words.length].forEach(function (n, i) {
      var label = (i === 2) ? '전체 ' + n : '' + n;
      var b = el('button', n === sessionSize ? 'on' : '', label);
      b.onclick = function () {
        sessionSize = n;
        Array.prototype.forEach.call(seg.children, function (c) { c.classList.remove('on'); });
        b.classList.add('on');
      };
      seg.appendChild(b);
    });
    box.appendChild(seg);

    var start = el('button', 'btn btn-primary', '🚀 시작하기');
    start.style.marginTop = '22px';
    start.onclick = function () {
      var words = shuffle(d.words).slice(0, Math.min(sessionSize, d.words.length));
      startQuiz({ title: 'Day ' + pad(day), day: day, pool: d.words, words: words, mode: 'day' });
    };
    box.appendChild(start);

    if (rec && (rec.wrong || []).length) {
      var revBtn = el('button', 'btn btn-ghost', '🩹 이 Day 틀린 단어만 (' + rec.wrong.length + ')');
      revBtn.style.marginTop = '10px';
      revBtn.onclick = function () {
        var ws = d.words.filter(function (w) { return rec.wrong.indexOf(w.no) >= 0; });
        startQuiz({ title: 'Day ' + pad(day) + ' 복습', day: day, pool: d.words, words: shuffle(ws), mode: 'review' });
      };
      box.appendChild(revBtn);
    }

    s.appendChild(box);
    return s;
  }

  function startReviewAll(days) {
    var words = [], pool = [];
    days.forEach(function (day) {
      var d = VOCAB[day - 1];
      pool = pool.concat(d.words);
      var wrong = store.days[day].wrong || [];
      d.words.forEach(function (w) { if (wrong.indexOf(w.no) >= 0) words.push({ w: w, day: day }); });
    });
    words = shuffle(words);
    startQuiz({ title: '전체 복습', day: null, pool: pool, words: words.map(function (x) { return x.w; }),
      mode: 'review-all', srcDays: words });
  }

  /* ================= 퀴즈 엔진 ================= */
  function buildOptions(word, pool) {
    var correct = word;
    // 같은 품사 우선, 부족하면 전체에서 채움
    var same = pool.filter(function (w) { return w.no !== word.no && w.pos === word.pos && cleanMeaning(w.meaning) !== cleanMeaning(word.meaning); });
    var others = pool.filter(function (w) { return w.no !== word.no && cleanMeaning(w.meaning) !== cleanMeaning(word.meaning); });
    var picks = [];
    var usedMeans = { };
    usedMeans[cleanMeaning(correct.meaning)] = 1;
    function tryAdd(list) {
      shuffle(list).forEach(function (w) {
        if (picks.length >= 3) return;
        var m = cleanMeaning(w.meaning);
        if (!usedMeans[m]) { usedMeans[m] = 1; picks.push(w); }
      });
    }
    tryAdd(same); tryAdd(others);
    // 그래도 부족하면 전역에서
    if (picks.length < 3) {
      var flat = [];
      VOCAB.forEach(function (d) { d.words.forEach(function (w) { flat.push(w); }); });
      tryAdd(flat);
    }
    var opts = shuffle([correct].concat(picks.slice(0, 3)));
    return opts;
  }

  var Q = null;
  function startQuiz(cfg) {
    Q = {
      cfg: cfg,
      idx: 0,
      correct: 0,
      combo: 0,
      maxCombo: 0,
      xpGain: 0,
      wrongWords: [],
      questions: cfg.words.map(function (w) { return { word: w, options: buildOptions(w, cfg.pool) }; })
    };
    render(Quiz());
  }

  function Quiz() {
    var s = el('div', 'screen');
    var q = Q.questions[Q.idx];
    var word = q.word;
    var total = Q.questions.length;

    // 헤더
    var head = el('div', 'quiz-head');
    var quit = el('button', 'iconbtn', '✕');
    quit.title = '나가기';
    quit.onclick = function () { if (confirm('학습을 그만둘까요? 기록은 저장되지 않아요.')) render(Home()); };
    head.appendChild(quit);

    var pw = el('div', 'progress-wrap');
    pw.innerHTML =
      '<div class="progress-top"><span>' + esc(Q.cfg.title) + '</span><span>' + (Q.idx + 1) + ' / ' + total + '</span></div>' +
      '<div class="pbar"><span style="width:' + (Q.idx / total * 100) + '%"></span></div>';
    head.appendChild(pw);

    var mute = el('button', 'iconbtn', store.muted ? '🔇' : '🔊');
    mute.onclick = function () { store.muted = !store.muted; save(); mute.textContent = store.muted ? '🔇' : '🔊'; };
    head.appendChild(mute);
    s.appendChild(head);

    // 콤보
    var combo = el('div', 'combo' + (Q.combo >= 2 ? ' show' : ''), Q.combo >= 2 ? '🔥 ' + Q.combo + ' 콤보!' : '');
    s.appendChild(combo);

    // 단어 카드
    var card = el('div', 'wordcard');
    card.innerHTML =
      '<div class="mascot">🐥</div>' +
      '<div class="kicker">이 단어의 뜻은?</div>' +
      '<div class="word">' + esc(word.word) + '</div>' +
      '<div class="pos">' + posLabel(word.pos) + '</div>';
    s.appendChild(card);

    // 보기
    var choices = el('div', 'choices');
    var answered = false;
    q.options.forEach(function (opt, i) {
      var b = el('button', 'choice');
      b.innerHTML = '<span class="num">' + (i + 1) + '</span><span class="label">' + esc(cleanMeaning(opt.meaning)) + '</span>';
      b.onclick = function () { pick(opt, b); };
      choices.appendChild(b);
    });
    s.appendChild(choices);

    var nextBar = el('div', 'next-bar');
    s.appendChild(nextBar);

    // 키보드 1~4
    function keyHandler(e) {
      if (answered) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= q.options.length) {
        choices.children[n - 1].click();
      }
    }
    document.addEventListener('keydown', keyHandler);

    function pick(opt, btn) {
      if (answered) return;
      answered = true;
      var isCorrect = cleanMeaning(opt.meaning) === cleanMeaning(word.meaning);
      Array.prototype.forEach.call(choices.children, function (c, i) {
        c.disabled = true;
        var m = cleanMeaning(q.options[i].meaning);
        if (m === cleanMeaning(word.meaning)) c.classList.add('correct');
        else if (c === btn) c.classList.add('wrong');
        else c.classList.add('dim');
      });

      var mascot = card.querySelector('.mascot');
      if (isCorrect) {
        Q.correct++;
        Q.combo++;
        Q.maxCombo = Math.max(Q.maxCombo, Q.combo);
        var gain = 10 + Math.min(Q.combo - 1, 5) * 2;
        Q.xpGain += gain;
        card.classList.add('correct');
        mascot.textContent = ['🐥', '🥳', '😻', '🎉'][Math.min(Q.combo - 1, 3)];
        mascot.classList.add('happy');
        confetti(Q.combo >= 3 ? 40 : 24);
        floatWord('+' + gain + ' XP', '#18b980');
        soundCorrect(Q.combo);
        setTimeout(next, 780);
      } else {
        Q.combo = 0;
        card.classList.add('wrong');
        mascot.textContent = '🥺';
        soundWrong();
        recordWrong(word);
        Q.wrongWords.push(word);
        var hint = el('div', 'review-hint', '아쉬워요! 정답: ' + esc(cleanMeaning(word.meaning)) + ' · 복습 목록에 담을게요');
        nextBar.appendChild(hint);
        var nb = el('button', 'btn btn-primary', '다음 →');
        nb.onclick = next;
        nextBar.appendChild(nb);
      }
    }

    function next() {
      document.removeEventListener('keydown', keyHandler);
      Q.idx++;
      if (Q.idx >= Q.questions.length) finish();
      else render(Quiz());
    }

    return s;
  }

  function recordWrong(word) {
    // review-all 모드에선 원본 day를 알 수 없으니, 현재 cfg.day 있을 때만 저장
    var day = Q.cfg.day;
    if (!day) {
      // 전체 복습: 어느 day의 단어인지 찾아서 저장
      for (var i = 0; i < VOCAB.length; i++) {
        var found = VOCAB[i].words.some(function (w) { return w.word === word.word && w.meaning === word.meaning; });
        if (found) { day = VOCAB[i].day; break; }
      }
    }
    if (!day) return;
    var rec = store.days[day] || (store.days[day] = { best: 0, cleared: false, wrong: [] });
    if (!rec.wrong) rec.wrong = [];
    if (rec.wrong.indexOf(word.no) < 0) rec.wrong.push(word.no);
    save();
  }

  /* ================= 결과 화면 ================= */
  function finish() {
    var total = Q.questions.length;
    var acc = Math.round(Q.correct / total * 100);

    // 기록 반영
    store.xp = (store.xp || 0) + Q.xpGain;
    store.totalCorrect = (store.totalCorrect || 0) + Q.correct;
    markPlayedToday();

    var day = Q.cfg.day;
    if (day) {
      var rec = store.days[day] || (store.days[day] = { best: 0, cleared: false, wrong: [] });
      rec.cleared = true;
      rec.best = Math.max(rec.best || 0, Q.correct + (Q.cfg.mode === 'day' ? (total - Q.correct === 0 ? 0 : 0) : 0));
      // best는 맞힌 개수 기준(전체 세션일 때 의미)
      if (Q.cfg.mode === 'day') rec.best = Math.max(rec.best || 0, Q.correct);
      // 이번에 맞힌 단어는 복습목록에서 제거
      var wrongSet = {};
      Q.wrongWords.forEach(function (w) { wrongSet[w.no] = 1; });
      if (rec.wrong) rec.wrong = rec.wrong.filter(function (no) {
        // 이번 세션에 등장했고 틀리지 않은 단어는 제거
        var appeared = Q.questions.some(function (q) { return q.word.no === no; });
        if (appeared && !wrongSet[no]) return false;
        return true;
      });
    } else {
      // 전체 복습: 이번에 맞힌 단어 복습목록에서 제거
      var correctWords = {};
      Q.questions.forEach(function (q) {
        var wrong = Q.wrongWords.indexOf(q.word) >= 0;
        if (!wrong) correctWords[q.word.word + '|' + q.word.meaning] = 1;
      });
      Object.keys(store.days).forEach(function (dk) {
        var d = VOCAB[dk - 1]; if (!d) return;
        var r = store.days[dk]; if (!r.wrong) return;
        r.wrong = r.wrong.filter(function (no) {
          var w = d.words.filter(function (x) { return x.no === no; })[0];
          if (w && correctWords[w.word + '|' + w.meaning]) return false;
          return true;
        });
      });
    }
    save();

    render(Result(total, acc));
  }

  function Result(total, acc) {
    var s = el('div', 'screen');
    var top = el('div', 'topbar');
    top.appendChild(el('div', 'brand', '<span class="logo">🐣</span><span>단어팡</span>'));
    var home = el('button', 'link', '홈 →');
    home.onclick = function () { render(Home()); };
    top.appendChild(home);
    s.appendChild(top);

    var emoji, title, grade;
    if (acc === 100) { emoji = '🏆'; title = '완벽해요!'; grade = '한 문제도 놓치지 않았어요'; confetti(60); }
    else if (acc >= 80) { emoji = '🎉'; title = '아주 좋아요!'; grade = '조금만 더 하면 만점이에요'; confetti(40); }
    else if (acc >= 60) { emoji = '💪'; title = '잘하고 있어요'; grade = '틀린 단어를 복습해봐요'; }
    else { emoji = '🌱'; title = '복습이 필요해요'; grade = '천천히, 반복이 답이에요'; }

    var hero = el('div', 'result-hero');
    hero.innerHTML =
      '<div class="big-emoji">' + emoji + '</div>' +
      '<h2>' + title + '</h2>' +
      '<div class="grade">' + grade + '</div>' +
      '<div class="score-ring">' + Q.correct + '<span> / ' + total + '</span></div>' +
      '<div class="stat-row">' +
        '<div class="stat"><b>' + acc + '%</b><small>정답률</small></div>' +
        '<div class="stat"><b>🔥 ' + Q.maxCombo + '</b><small>최고 콤보</small></div>' +
        '<div class="stat"><b>+' + Q.xpGain + '</b><small>획득 XP</small></div>' +
      '</div>';
    s.appendChild(hero);

    // 틀린 단어 복습 리스트
    if (Q.wrongWords.length) {
      var rl = el('div', 'review-list');
      rl.appendChild(el('h3', null, '🩹 다시 볼 단어 (' + Q.wrongWords.length + ')'));
      Q.wrongWords.forEach(function (w) {
        var it = el('div', 'rv-item');
        it.innerHTML =
          '<div class="rv-word">' + esc(w.word) + '<span class="pos">' + posLabel(w.pos) + '</span></div>' +
          '<div class="rv-mean">' + esc(w.meaning) + '</div>';
        rl.appendChild(it);
      });
      s.appendChild(rl);

      var retryWrong = el('button', 'btn btn-primary', '🔁 틀린 단어 다시 풀기');
      retryWrong.style.marginTop = '16px';
      retryWrong.onclick = function () {
        startQuiz({ title: Q.cfg.title + ' 복습', day: Q.cfg.day, pool: Q.cfg.pool, words: shuffle(Q.wrongWords.slice()), mode: 'review' });
      };
      s.appendChild(retryWrong);
    } else {
      s.appendChild(el('div', 'footer-note', '틀린 단어가 없어요. 다음 Day로 넘어가 볼까요? 🚀'));
    }

    var row = el('div', 'btn-row');
    var again = el('button', 'btn btn-ghost', '다시 풀기');
    again.onclick = function () {
      startQuiz({ title: Q.cfg.title, day: Q.cfg.day, pool: Q.cfg.pool,
        words: shuffle(Q.cfg.pool).slice(0, Q.questions.length), mode: Q.cfg.mode });
    };
    var homeBtn = el('button', 'btn btn-primary', '홈으로');
    homeBtn.onclick = function () { render(Home()); };
    row.appendChild(again);
    row.appendChild(homeBtn);
    s.appendChild(row);

    return s;
  }

  /* ---------------- 시작 ---------------- */
  if (!VOCAB.length) {
    app.innerHTML = '<p style="padding:40px;text-align:center;color:#888">단어 데이터를 불러오지 못했어요. data.js 를 확인해주세요.</p>';
  } else {
    render(Home());
  }
})();
