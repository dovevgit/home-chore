import { initPage, supabase, esc, avatar, showToast } from './common.js';
import { guestToken, guestMode, inviteGuest } from './guest.js';

/* ================= הכנה: בן משפחה או אורח ================= */
const GT = guestToken();
let profiles = [], me, gid = new URLSearchParams(location.search).get('g'), gcall = null;
if (GT) { const g = await guestMode('bj', GT); me = g.me; gid = g.ref; gcall = g.call; }
else {
  const r = await initPage({ active: 'games', title: '21' });
  profiles = r.profiles || [];
  me = { id: r.session.user.id };
}
const root = document.getElementById('bjm');
const rpc = (fn, args = {}) => GT ? gcall(fn, args) : supabase.rpc(fn, { p_table: gid, ...args });

const ERR = { not_your_turn: 'עדיין לא התור שלך', table_full: 'השולחן מלא (4 שחקנים)', already_seated: 'אתה כבר יושב בשולחן אחר', closed: 'השולחן נסגר', not_invited: 'לא הוזמנת לשולחן הזה',
  no_table: 'פתחו שולחן ורק אחר כך אפשר להזמין אורח', too_many: 'יצרתם יותר מדי קישורים להיום', bad_bet: 'הימור לא תקין', no_bets: 'עוד אף אחד לא הימר', cannot_double: 'אי אפשר להכפיל עכשיו', cannot_split: 'אי אפשר לפצל עכשיו' };
const errText = (e, d) => { const m = (e && e.message) || ''; const k = Object.keys(ERR).find(x => m.includes(x)); return k ? ERR[k] : d; };
const MAXP = 4;

const RULES = `<details class="bjpanel bjrules"><summary>איך משחקים? (החוקים)</summary>
<p>המטרה: להגיע לסכום קלפים קרוב ככל האפשר ל-21 בלי לעבור אותו, ולהיות גבוה מהדילר. כל השחקנים משחקים מול הדילר ולא אחד מול השני, ולכן אפשר לשחק גם לבד.</p>
<h3>ערך הקלפים</h3>
<ul>
<li>קלפים 2 עד 10 שווים את המספר שלהם. נסיך, מלכה ומלך (J, Q, K) שווים 10.</li>
<li>אס (A) שווה 11, או 1 אם 11 היה גורם לעבור את 21. הוא מתכוונן לבד.</li>
</ul>
<h3>מהלך של סיבוב</h3>
<ol>
<li><b>הימור:</b> כל שחקן בוחר כמה ז'יטונים להמר ומאשר. כשכולם אישרו, הקלפים מחולקים. המארח יכול לחלק גם לפני כן, ומי שעוד לא הימר יושב בצד בסיבוב הזה.</li>
<li><b>חלוקה:</b> כל שחקן מקבל שני קלפים גלויים. הדילר מקבל קלף גלוי אחד וקלף הפוך.</li>
<li><b>בלאק ג'ק:</b> אס עם קלף של 10 בשני הקלפים הראשונים. מנצח ומקבל פי אחד וחצי מההימור (3 ל-2), אלא אם גם לדילר יש בלאק ג'ק, ואז תיקו.</li>
<li><b>התור שלך:</b> "קלף" לוקח עוד קלף. "עצור" משאיר את היד כמו שהיא. עוברים את 21 ומפסידים מיד (נשרפת).</li>
<li><b>כפל:</b> על שני הקלפים הראשונים אפשר להכפיל את ההימור. מקבלים קלף אחד בלבד והיד נגמרת.</li>
<li><b>פיצול:</b> אם שני הקלפים הראשונים שווים בערכם (למשל שתי שמונות, או K ו-10) אפשר לפצל לשתי ידיים עם הימור שווה על כל אחת. מפצלים פעם אחת בלבד.</li>
<li><b>הדילר:</b> אחרי שכולם סיימו הוא חושף קלף ולוקח קלפים עד שהוא מגיע ל-17 או יותר, ואז עוצר (גם על 17 עם אס).</li>
</ol>
<h3>תוצאות</h3>
<ul>
<li>ניצחון: הסכום שלך גבוה מהדילר, או שהדילר עבר 21. מקבלים פי שניים מההימור (ההימור חוזר ועוד רווח שווה).</li>
<li>תיקו: אותו סכום, וההימור חוזר אליך.</li>
<li>הפסד: הסכום שלך נמוך מהדילר, או שעברת 21.</li>
</ul>
<h3>איך זה עובד באפליקציה</h3>
<ul>
<li>משחקים על ז'יטונים וירטואליים בלבד. כל שחקן מתחיל עם 1,000, והם לא קשורים לנקודות הבית. כשנגמרים הז'יטונים מקבלים 1,000 חדשים בסיבוב הבא.</li>
<li>עד 4 שחקנים בשולחן, בני משפחה או אורחים שהוזמנו בקישור. אפשר גם לשחק לבד.</li>
<li>הקלפים מחולקים בשרת מחפיסה של 6 חפיסות, והקלף ההפוך של הדילר נשאר חבוי עד שכולם סיימו.</li>
<li>לכל החלטה יש דקה. אם הזמן נגמר, המשחק עוצר עבורך.</li>
<li>הסיבוב הבא מתחיל אוטומטית אחרי כמה שניות.</li>
</ul></details>`;

/* ================= צלילים ================= */
let AC = null;
const soundOn = () => { try { return localStorage.getItem('soundOff') !== '1'; } catch (_) { return true; } };
const ac = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (_) {} return AC; };
function tone(f, d, type = 'sine', v = .12, at = 0) {
  if (!soundOn()) return; const a = ac(); if (!a) return; const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
const sfx = {
  deal: () => tone(520, .05, 'square', .05), chip: () => tone(900, .06, 'triangle', .14),
  turn: () => { tone(880, .1, 'sine', .1); tone(1175, .12, 'sine', .1, .1); },
  win: () => [523, 659, 784].forEach((f, i) => tone(f, .2, 'triangle', .14, i * .1)),
  lose: () => [300, 240].forEach((f, i) => tone(f, .25, 'sawtooth', .07, i * .15)), bust: () => tone(150, .35, 'sawtooth', .1)
};

/* ================= קלפים ================= */
const SU = { s: '♠', h: '♥', d: '♦', c: '♣' };
const val = c => { const r = c[0]; return r === 'A' ? 11 : 'TJQK'.includes(r) ? 10 : +r; };
function total(cards) { let t = 0, a = 0; for (const c of cards) { t += val(c); if (c[0] === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return t; }
let seen = new Set();
function cardEl(code, key) {
  const k = key + ':' + (code || 'back'), isNew = !seen.has(k); seen.add(k);
  if (!code) return `<div class="bjcard back${isNew ? ' new' : ''}"><i>.</i></div>`;
  return `<div class="bjcard ${code[1] === 'h' || code[1] === 'd' ? 'red' : ''}${isNew ? ' new' : ''}"><span>${code[0] === 'T' ? '10' : code[0]}</span><span class="s">${SU[code[1]]}︎</span></div>`;
}

/* ================= מצב ================= */
let S = null, prev = null, busy = false, deadline = 0, lastKey = '', pend = 0, lastBet = 0, roundSeen = -1, resultAt = 0, INV = null, nextCalled = 0;
const mine = () => S && S.players.find(p => p.user_id === S.me && !p.left);
const nameOf = p => p ? (p.name || 'שחקן') : 'שחקן';
const myHands = () => S.hands.filter(h => h.user_id === S.me).sort((a, b) => a.idx - b.idx);
const cardsCount = s => s.table.dealer_cards.length + s.hands.reduce((n, h) => n + h.cards.length, 0);
const netOf = hs => hs.reduce((n, h) => n + (h.pay || 0) - h.bet, 0);

async function load() {
  const { data, error } = await rpc('bj_state');
  if (error || !data) { if (!S) renderGone(); return; }
  const first = !S; prev = S; S = data;
  deadline = S.secs_left != null ? Date.now() + S.secs_left * 1000 : 0;
  if (S.table.phase === 'result' && (!prev || prev.table.phase !== 'result')) resultAt = Date.now() - (12 - (S.secs_left || 0)) * 1000;
  if (prev) diffEffects(prev, S);
  const key = JSON.stringify({ ...S, secs_left: 0 });
  if (key === lastKey && !first) return;
  lastKey = key; render();
}

function diffEffects(a, b) {
  if (cardsCount(b) > cardsCount(a)) sfx.deal();
  const m = mine(), t = b.table;
  if (t.phase === 'result' && a.table.phase !== 'result' && m) {
    const hs = b.hands.filter(h => h.user_id === b.me);
    if (hs.length) {
      if (hs.some(h => total(h.cards) > 21) && hs.every(h => total(h.cards) > 21)) sfx.bust(); else { const n = netOf(hs); if (n > 0) sfx.win(); else if (n < 0) sfx.lose(); }
    }
  }
  if (m && t.phase === 'play' && t.cur_user === b.me && !(a.table.cur_user === b.me && a.table.cur_hand === t.cur_hand && a.table.phase === 'play')) sfx.turn();
  if (b.table.phase === 'bet' && a.table.phase !== 'bet') pend = 0;
  const am = a.players.find(p => p.user_id === b.me), bm = b.players.find(p => p.user_id === b.me);
  if (bm && am && bm.bet !== am.bet) lastBet = bm.bet || lastBet;
  b.players.forEach(p => { const o = a.players.find(x => x.user_id === p.user_id); if (o && p.user_id !== b.me && p.bet > o.bet) sfx.chip(); });
}

/* ================= רשימה ================= */
function renderGone() {
  root.innerHTML = `<div class="bjpanel"><h2>השולחן לא נמצא</h2><p style="margin:0">ייתכן שהשולחן נסגר.</p>${GT ? '' : '<a class="bjbtn" style="text-align:center;text-decoration:none" href="blackjack.html">חזרה לרשימה</a>'}</div>`;
}
async function showList() {
  const { data } = await supabase.rpc('bj_list');
  const L = data || { tables: [], mine: null };
  root.innerHTML = `
    <div class="bjpanel"><h2>21 (בלאק ג'ק)</h2>
      <p style="margin:0;color:var(--bjmuted);line-height:1.6">משחקים מול הדילר על ז'יטונים וירטואליים. אפשר לשחק לבד, או לפתוח שולחן ולהזמין בני משפחה ואורחים (עד 4 שחקנים).</p>
      ${L.mine ? `<a class="bjbtn" style="text-align:center;text-decoration:none" href="blackjack.html?g=${L.mine}">חזרה לשולחן שלך</a>` : '<button class="bjbtn" id="bjNew" type="button">פתח שולחן חדש</button>'}
    </div>
    <div class="bjpanel"><h2>שולחנות שהוזמנת אליהם</h2>
      ${L.tables.filter(t => t.id !== L.mine).length ? L.tables.filter(t => t.id !== L.mine).map(t => `<div class="bjrowl"><b>השולחן של ${esc(t.host || 'מישהו')}<br><small>${t.n} מתוך ${MAXP} שחקנים · ${t.status === 'lobby' ? 'ממתין להתחלה' : 'במשחק'}</small></b>
        <button class="bjjoin" data-id="${t.id}" type="button" ${t.n >= MAXP || L.mine ? 'disabled style="opacity:.4"' : ''}>הצטרף</button></div>`).join('') : '<p class="bjempty" style="margin:0">אין הזמנות לשולחן כרגע</p>'}
    </div>${RULES}`;
  const nb = document.getElementById('bjNew');
  if (nb) nb.onclick = async () => {
    nb.disabled = true; ac();
    const { data: id, error } = await supabase.rpc('bj_create');
    if (error) { showToast(errText(error, 'פתיחת השולחן נכשלה'), true); nb.disabled = false; return; }
    location.href = 'blackjack.html?g=' + id;
  };
  root.querySelectorAll('.bjjoin:not([disabled])').forEach(b => b.onclick = async () => {
    b.disabled = true; ac();
    const { error } = await supabase.rpc('bj_join', { p_table: b.dataset.id });
    if (error) { showToast(errText(error, 'ההצטרפות נכשלה'), true); b.disabled = false; return; }
    location.href = 'blackjack.html?g=' + b.dataset.id;
  });
}

function bind(id, fn) { const e = document.getElementById(id); if (e) e.onclick = fn; }
async function loadInv() {
  const { data } = await supabase.rpc('bj_invited', { p_table: gid });
  INV = new Set(data || []); if (S && S.table.status === 'lobby') lobbyView();
}
function lobbyView() {
  const t = S.table, isHost = t.host_id === S.me, ps = S.players.filter(p => !p.left), bySeat = Object.fromEntries(ps.map(p => [p.seat, p]));
  root.innerHTML = `
    <div class="bjpanel"><h2>השולחן מתכונן</h2>
      <div class="bjlobby">${[0, 1, 2, 3].map(i => bySeat[i] ? `<div class="bjpl"><span style="font-size:22px">${bySeat[i].user_id === t.host_id ? '👑' : '🂠'}</span>${esc(nameOf(bySeat[i]))}</div>` : '<div class="bjpl empty"><span style="font-size:22px">·</span>מקום פנוי</div>').join('')}</div>
      <div class="bjres">${isHost ? (ps.length < 2 ? 'אפשר להתחיל לבד, או להזמין עוד שחקנים' : 'אפשר להתחיל') : 'ממתינים שהמארח יתחיל'}</div>
      ${isHost ? '<button class="bjbtn" id="bjStart" type="button">התחל משחק</button>' : ''}
      ${isHost && !GT ? `<h3 style="margin:6px 0 0;font-size:15px">הזמן מהמשפחה</h3><div class="bjfams">${profiles.filter(p => p.is_user !== false && p.id !== S.me).map(p => {
        const seated = ps.some(x => x.user_id === p.id), inv = INV && INV.has(p.id);
        return `<button class="bjfam" data-id="${p.id}" type="button" ${seated || inv ? 'disabled' : ''}>${avatar(p, 46)}<span>${esc(p.name)}</span><small>${seated ? 'בשולחן' : inv ? 'הוזמן/ה ✓' : 'הזמן'}</small></button>`; }).join('') || '<p class="bjempty" style="margin:0">אין עוד בני משפחה</p>'}</div>` : ''}
      ${GT ? '' : '<button class="bjbtn sec" id="bjInv" type="button">הזמן אורח בקישור</button>'}
      <button class="bjbtn sec" id="bjLeave" type="button">עזוב שולחן</button>
    </div>${RULES}`;
  if (isHost && !GT && INV === null) loadInv();
  root.querySelectorAll('.bjfam:not([disabled])').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error } = await supabase.rpc('bj_invite', { p_table: gid, p_user: b.dataset.id });
    if (error) { showToast('ההזמנה נכשלה', true); b.disabled = false; return; }
    INV = INV || new Set(); INV.add(b.dataset.id); showToast('ההזמנה נשלחה'); lobbyView();
  });
  bind('bjStart', async () => { ac(); const { error } = await rpc('bj_start'); if (error) showToast(errText(error, 'ההתחלה נכשלה'), true); lastKey = ''; await load(); });
  bind('bjInv', () => inviteGuest('bj'));
  bind('bjLeave', leave);
}
async function leave() {
  if (!confirm('לעזוב את השולחן?')) return;
  await rpc('bj_leave');
  if (GT) { root.innerHTML = '<div class="bjpanel"><h2>יצאת מהשולחן</h2><p style="margin:0">תודה ששיחקת!</p></div>'; clearInterval(poll); } else location.href = 'blackjack.html';
}

/* ================= שולחן ================= */
function handHtml(p, h, key, isMe) {
  const t = S.table, tt = total(h.cards), act = t.phase === 'play' && t.cur_user === p.user_id && t.cur_hand === h.idx && !h.done;
  let badge = '';
  if (h.res) {
    const net = (h.pay || 0) - h.bet, sg = net > 0 ? '+' + net : String(net);
    badge = h.res === 'bj' ? `<span class="bjbadge bj">בלאק ג'ק! ${sg}</span>` : h.res === 'win' ? `<span class="bjbadge win">ניצחון ${sg}</span>`
      : h.res === 'push' ? '<span class="bjbadge push">תיקו</span>' : `<span class="bjbadge lose">${tt > 21 ? 'נשרפת' : 'הפסד'} ${sg}</span>`;
  } else if (tt > 21) badge = '<span class="bjbadge lose">נשרפת</span>';
  return `<div class="bjhand ${act ? 'active' : ''}"><div class="bjcards">${h.cards.map((c, i) => cardEl(c, key + h.idx + ':' + i)).join('')}</div>
    <div class="bjwho"><span class="bjtot">${tt}</span><span class="bjbet"><i></i>${h.bet}${h.doubled ? ' (כפל)' : ''}</span></div>${badge}</div>`;
}
function seatHtml(p, isMe) {
  const hs = S.hands.filter(h => h.user_id === p.user_id).sort((a, b) => a.idx - b.idx), t = S.table;
  const body = hs.length ? `<div class="bjhands">${hs.map(h => handHtml(p, h, p.user_id, isMe)).join('')}</div>`
    : (t.phase === 'bet' ? (p.bet > 0 ? `<span class="bjbet"><i></i>הימור ${p.bet}</span>` : '<span class="bjtl">מחכה להימור...</span>') : '<span class="bjtl">יושב בצד</span>');
  return `<div class="${isMe ? 'bjzone bjme' : 'bjseat'}"><div class="bjwho"><span class="n">${esc(isMe ? 'אתה' : nameOf(p))}</span><span class="bjtot">${p.chips.toLocaleString('he-IL')}</span></div>${body}</div>`;
}
function render() {
  const t = S.table, m = mine();
  if (t.status === 'done') { root.innerHTML = `<div class="bjpanel"><h2>השולחן נסגר</h2><p style="margin:0">כולם עזבו את השולחן.</p>${GT ? '' : '<a class="bjbtn" style="text-align:center;text-decoration:none" href="blackjack.html">חזרה לרשימה</a>'}</div>`; return; }
  if (!m) {
    root.innerHTML = `<div class="bjpanel"><h2>אינך יושב בשולחן</h2>${GT ? '<p style="margin:0">יצאת מהשולחן.</p>' : '<button class="bjbtn" id="bjJoin" type="button">הצטרף לשולחן</button><a class="bjbtn sec" style="text-align:center;text-decoration:none" href="blackjack.html">חזרה לרשימה</a>'}</div>`;
    bind('bjJoin', async () => { const { error } = await supabase.rpc('bj_join', { p_table: gid }); if (error) showToast(errText(error, 'ההצטרפות נכשלה'), true); lastKey = ''; await load(); });
    return;
  }
  if (t.status === 'lobby') return lobbyView();
  if (t.round_no !== roundSeen) { roundSeen = t.round_no; seen = new Set(); }
  const others = S.players.filter(p => !p.left && p.user_id !== S.me).sort((a, b) => a.seat - b.seat);
  const dc = t.dealer_cards, dtot = total(dc);
  const dealer = `<div class="bjzone"><div class="bjwho"><span>הדילר</span>${dc.length ? `<span class="bjtot">${t.hole_hidden && t.phase === 'play' ? val(dc[0]) : dtot}</span>` : ''}</div>
    <div class="bjcards">${dc.length ? dc.map((c, i) => cardEl(c, 'd' + i)).join('') + (t.hole_hidden && t.phase === 'play' ? cardEl(null, 'dh') : '') : '<span class="bjtl">ממתין להימורים</span>'}</div>
    ${t.phase === 'result' && dc.length ? (dtot > 21 ? '<span class="bjbadge lose">הדילר נשרף</span>' : dc.length === 2 && dtot === 21 ? '<span class="bjbadge bj">בלאק ג\'ק לדילר</span>' : '') : ''}</div>`;
  root.innerHTML = `
    <div class="bjbar"><b>21 (בלאק ג'ק)</b><button class="bjchip" id="bjSnd" type="button">צליל: ${soundOn() ? 'פעיל' : 'כבוי'}</button></div>
    <div class="bjtable">${dealer}${others.length ? `<div class="bjseats">${others.map(p => seatHtml(p, false)).join('')}</div>` : ''}${seatHtml(m, true)}</div>
    <div class="bjpanel" id="bjCtl"></div>
    <div class="bjrow">${GT ? '' : '<button class="bjbtn sec" id="bjInv" type="button">הזמן אורח בקישור</button>'}<button class="bjbtn sec" id="bjLeave" type="button">עזוב שולחן</button></div>
    ${RULES}`;
  bind('bjInv', () => inviteGuest('bj'));
  bind('bjLeave', leave);
  bind('bjSnd', () => { try { localStorage.setItem('soundOff', soundOn() ? '1' : '0'); } catch (_) {} lastKey = ''; render(); });
  controls(m);
}

function timerRow(label, big) {
  return `<div class="bjtimer"><span class="bjtl">${label}</span><div class="bjtbar"><div class="bjtfill" id="bjTf"></div></div><span class="bjtt" id="bjTt" ${big ? '' : 'style="font-size:16px"'}>60</span></div>`;
}
function controls(m) {
  const c = document.getElementById('bjCtl'), t = S.table, isHost = t.host_id === S.me;
  if (t.phase === 'bet') {
    if (m.bet > 0) {
      const waiting = S.players.filter(p => !p.left && p.bet === 0);
      c.innerHTML = `<div class="bjline">ההימור שלך: ${m.bet}</div><div class="bjres" style="color:var(--bjmuted)">${waiting.length ? 'ממתינים להימור של ' + waiting.map(p => esc(nameOf(p))).join(', ') : 'מחלקים...'}</div>
        <div class="bjrow"><button class="bjbtn sec" id="bjUnbet" type="button">בטל הימור</button>${isHost && waiting.length ? '<button class="bjbtn" id="bjDeal" type="button">חלק עכשיו</button>' : ''}</div>`;
      bind('bjUnbet', () => place(0)); bind('bjDeal', deal);
      return;
    }
    if (pend > m.chips) pend = 0;
    const anyBet = S.players.some(p => !p.left && p.bet > 0);
    c.innerHTML = `<div class="bjline">הימור: <span id="bjPend">${pend}</span> <span style="color:var(--bjmuted);font-weight:600">· יש לך ${m.chips.toLocaleString('he-IL')}</span></div>
      <div class="bjchips">${[10, 25, 50, 100].map(v => `<button class="bjchipb c${v}" data-v="${v}" type="button" ${pend + v > m.chips ? 'disabled' : ''}>${v}</button>`).join('')}</div>
      <div class="bjrow"><button class="bjbtn sec" id="bjClr" type="button">נקה</button>${lastBet >= 10 && lastBet <= m.chips ? `<button class="bjbtn sec" id="bjSame" type="button">אותו הימור (${lastBet})</button>` : ''}</div>
      <button class="bjbtn" id="bjOk" type="button" ${pend >= 10 ? '' : 'disabled'}>אשר הימור</button>
      ${isHost && anyBet ? '<button class="bjbtn sec" id="bjDeal" type="button">חלק עכשיו (בלי מי שעוד לא הימר)</button>' : ''}
      <div class="bjres" style="color:var(--bjmuted);font-size:13px">מי שלא מהמר בסיבוב הזה יושב בצד.</div>`;
    root.querySelectorAll('.bjchipb').forEach(b => b.onclick = () => { ac(); pend += +b.dataset.v; sfx.chip(); controls(m); });
    bind('bjClr', () => { pend = 0; controls(m); });
    bind('bjSame', () => { pend = lastBet; controls(m); });
    bind('bjOk', () => place(pend)); bind('bjDeal', deal);
    return;
  }
  if (t.phase === 'result') {
    const hs = myHands(), net = netOf(hs);
    c.innerHTML = `<div class="bjres">${hs.length ? (net > 0 ? `<b>ניצחת ${net.toLocaleString('he-IL')} ז'יטונים</b>` : net < 0 ? `הפסדת ${(-net).toLocaleString('he-IL')} ז'יטונים` : 'יצאת באפס') : 'הסיבוב נגמר'}</div>
      <button class="bjbtn" id="bjNext" type="button">סיבוב הבא</button><div class="bjres" style="color:var(--bjmuted);font-size:13px" id="bjAuto"></div>`;
    bind('bjNext', async () => { ac(); await rpc('bj_next', { p_round: t.round_no }); lastKey = ''; await load(); });
    return;
  }
  // play
  const hs = myHands(), cur = hs.find(h => h.idx === t.cur_hand), mineTurn = t.cur_user === S.me && cur && !cur.done && !busy;
  if (!hs.length) { c.innerHTML = `${timerRow('אתה יושב בצד בסיבוב הזה', false)}`; return; }
  const canDouble = mineTurn && cur.cards.length === 2 && m.chips >= cur.bet;
  const canSplit = mineTurn && cur.cards.length === 2 && !cur.split && val(cur.cards[0]) === val(cur.cards[1]) && m.chips >= cur.bet && hs.length === 1;
  const who = S.players.find(p => p.user_id === t.cur_user);
  c.innerHTML = `${t.cur_user === S.me ? timerRow('הזמן שלך להחליט', true) : timerRow(t.cur_user ? `ממתין ל${esc(nameOf(who))}...` : 'הדילר משחק...', false)}
    <div class="bjrow" style="grid-template-columns:1fr 1fr"><button class="bjbtn" id="aH" type="button" ${mineTurn ? '' : 'disabled'}>קלף</button><button class="bjbtn stand" id="aS" type="button" ${mineTurn ? '' : 'disabled'}>עצור</button>
    <button class="bjbtn sec" id="aD" type="button" ${canDouble ? '' : 'disabled'}>כפל</button><button class="bjbtn sec" id="aP" type="button" ${canSplit ? '' : 'disabled'}>פיצול</button></div>`;
  bind('aH', () => act('hit')); bind('aS', () => act('stand')); bind('aD', () => act('double')); bind('aP', () => act('split'));
}
async function place(n) {
  if (busy) return; busy = true; ac();
  const { error } = await rpc('bj_bet', { p_amount: n });
  busy = false;
  if (error) showToast(errText(error, 'ההימור נכשל, נסו שוב'), true); else { if (n > 0) { sfx.chip(); lastBet = n; } pend = 0; }
  lastKey = ''; await load();
}
async function deal() {
  if (busy) return; busy = true; ac();
  const { error } = await rpc('bj_deal'); busy = false;
  if (error) showToast(errText(error, 'החלוקה נכשלה'), true);
  lastKey = ''; await load();
}
async function act(a) {
  if (busy) return; busy = true; ac(); deadline = 0;
  const { error } = await rpc('bj_action', { p_action: a });
  busy = false;
  if (error) showToast(errText(error, 'הפעולה נכשלה, נסו שוב'), true);
  lastKey = ''; await load();
}

/* ================= טיימר ================= */
function tick() {
  if (!S) return;
  const t = S.table;
  if (t.phase === 'result') {
    const a = document.getElementById('bjAuto'), left = Math.max(0, 12 - Math.floor((Date.now() - resultAt) / 1000));
    if (a) a.textContent = `הסיבוב הבא מתחיל בעוד ${left}`;
    if (left <= 0 && nextCalled !== t.round_no && !busy) { nextCalled = t.round_no; setTimeout(() => { lastKey = ''; load(); }, 700); }
    return;
  }
  const f = document.getElementById('bjTf'), tt = document.getElementById('bjTt'); if (!f || !tt || !deadline) return;
  const left = Math.max(0, deadline - Date.now()), s = Math.ceil(left / 1000);
  f.style.width = (left / 600) + '%'; f.className = 'bjtfill' + (s <= 10 ? ' low' : s <= 25 ? ' mid' : '');
  tt.textContent = s;
  if (left <= 0 && !busy) { deadline = 0; setTimeout(() => { lastKey = ''; load(); }, 600); }
}

/* ================= הפעלה ================= */
let poll = null;
if (!gid) await showList();
else {
  await load();
  poll = setInterval(() => { if (!busy && !document.hidden) load(); }, 2200);
  setInterval(tick, 250);
  if (!GT) supabase.channel('bj-' + gid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bj_tables', filter: 'id=eq.' + gid }, () => { if (!busy) load(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bj_players', filter: 'table_id=eq.' + gid }, () => { if (!busy) load(); })
    .subscribe();
}
