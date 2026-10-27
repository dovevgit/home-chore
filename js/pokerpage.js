import { initPage, supabase, esc, avatar, showToast } from './common.js';
import { guestToken, guestMode, inviteGuest } from './guest.js';
import { gameSplash } from './gamesplash.js';
gameSplash('poker-splash.jpg');

/* ================= הכנה: בן משפחה או אורח ================= */
const GT = guestToken();
let profiles = [], me, gid = new URLSearchParams(location.search).get('g'), gcall = null;
if (GT) { const g = await guestMode('poker', GT); me = g.me; gid = g.ref; gcall = g.call; }
else {
  const r = await initPage({ active: 'games', title: 'פוקר' });
  profiles = r.profiles || [];
  me = { id: r.session.user.id };
}
const root = document.getElementById('pk');
const rpc = (fn, args = {}) => GT ? gcall(fn, args) : supabase.rpc(fn, { p_table: gid, ...args });

const SUITS = ['♠', '♥', '♦', '♣'], RKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const HAND = ['קלף גבוה', 'זוג', 'שני זוגות', 'שלישייה', 'רצף', 'צבע', 'פול האוס', 'רביעייה', 'רצף צבע', 'רצף מלכותי'];
const SEATPOS = [[50, 85], [11, 66], [11, 27], [50, 8], [89, 27], [89, 66]];
const PICK = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
const ERR = { not_your_turn: 'עדיין לא התור שלך', table_full: 'השולחן מלא (6 שחקנים)', already_seated: 'אתה כבר יושב בשולחן אחר', closed: 'השולחן נסגר', need_players: 'צריך לפחות 2 שחקנים',
  raise_too_small: 'ההעלאה קטנה מדי', cannot_check: 'אי אפשר צ\'ק, יש הימור', not_invited: 'לא הוזמנת לשולחן הזה', no_table: 'פתחו שולחן ורק אחר כך אפשר להזמין אורח', too_many: 'יצרתם יותר מדי קישורים להיום' };
const errText = (e, d) => { const m = (e && e.message) || ''; const k = Object.keys(ERR).find(x => m.includes(x)); return k ? ERR[k] : d; };

const RULES = `<details class="pkpanel pkrules"><summary>איך משחקים? (החוקים)</summary>
<h3>המטרה</h3>
<p>טקסס הולדם הוא סוג הפוקר הנפוץ בעולם. כל שחקן מקבל שני קלפים סגורים, ועל השולחן נחשפים בהדרגה חמישה קלפים משותפים. המנצח הוא מי שמרכיב את ידי חמשת הקלפים הטובה ביותר מתוך שבעת הקלפים, או מי שכל השאר ויתרו מולו.</p>
<h3>מהלך של יד אחת</h3>
<ol>
<li><b>בליינדים:</b> שני השחקנים שאחרי הכפתור הלבן (D) מניחים הימור חובה קטן וגדול. כאן 10 ו-20 ז'יטונים.</li>
<li><b>פרה-פלופ:</b> כל שחקן מקבל שני קלפים סגורים. סבב הימורים ראשון.</li>
<li><b>פלופ:</b> נחשפים שלושה קלפים משותפים. סבב הימורים.</li>
<li><b>טרן:</b> נחשף קלף רביעי. סבב הימורים.</li>
<li><b>ריבר:</b> נחשף הקלף החמישי והאחרון. סבב הימורים אחרון.</li>
<li><b>שואו דאון:</b> מי ששרד חושף קלפים, והיד הטובה ביותר לוקחת את הקופה. בתיקו הקופה מתחלקת.</li>
</ol>
<h3>מה אפשר לעשות בתור שלך</h3>
<ul>
<li><b>פולד:</b> מוותרים על היד ומאבדים את מה שהימרתם.</li>
<li><b>צ'ק:</b> ממשיכים בלי להוסיף, אפשר רק אם אף אחד לא הימר לפניך בסבב.</li>
<li><b>קול:</b> משווים את ההימור הגבוה ביותר על השולחן.</li>
<li><b>רייז:</b> מעלים את ההימור. ההעלאה המינימלית היא גודל ההימור או ההעלאה הקודמת.</li>
<li><b>אול-אין:</b> מהמרים את כל הז'יטונים שלך. אפשר לנצח רק על החלק בקופה שהצלחת לכסות.</li>
</ul>
<h3>סדר הידיים, מהחזקה לחלשה</h3>
<div id="pkRanks"></div>
<h3>כללים נוספים</h3>
<ul>
<li>בתיקו בין ידיים מאותו סוג מכריע הקלף הגבוה יותר, ואחריו הקלפים הבאים בתור.</li>
<li>האס יכול להיות גבוה (A K Q J 10) או נמוך ברצף (A 2 3 4 5).</li>
<li>קופות צד: כששחקן הולך אול-אין בסכום קטן, נוצרת קופה נפרדת שהוא יכול לזכות בה בלבד.</li>
<li>מי שנגמרו לו הז'יטונים יכול לקנות מחדש 1,000 בין ידיים.</li>
</ul>
<h3>איך זה עובד באפליקציה</h3>
<ul>
<li>משחקים על ז'יטונים וירטואליים בלבד. כל שחקן מתחיל עם 1,000, והם לא קשורים לנקודות הבית.</li>
<li>עד 6 שחקנים בשולחן, בני משפחה או אורחים שהוזמנו בקישור.</li>
<li>לכל החלטה יש דקה. אם הזמן נגמר, המשחק עושה צ'ק או פולד עבורך.</li>
<li>היד הבאה מתחילה אוטומטית אחרי כמה שניות.</li>
<li>הקלפים הסגורים נשמרים בשרת וכל שחקן רואה רק את שלו.</li>
</ul></details>`;
const EX = [['A♠ K♠ Q♠ J♠ 10♠', 'רצף מלכותי', 'רצף צבע מ-10 עד אס.'], ['9♥ 8♥ 7♥ 6♥ 5♥', 'רצף צבע', 'חמישה קלפים ברצף מאותו סוג.'], ['Q♣ Q♦ Q♠ Q♥ 4♦', 'רביעייה', 'ארבעה קלפים באותו ערך.'], ['K♠ K♦ K♣ 8♥ 8♠', 'פול האוס', 'שלישייה וזוג ביחד.'], ['A♦ J♦ 9♦ 6♦ 3♦', 'צבע', 'חמישה קלפים מאותו סוג.'], ['10♠ 9♥ 8♦ 7♣ 6♥', 'רצף', 'חמישה קלפים ברצף.'], ['7♣ 7♦ 7♠ K♥ 2♦', 'שלישייה', 'שלושה קלפים באותו ערך.'], ['J♠ J♥ 4♦ 4♣ A♠', 'שני זוגות', 'שני זוגות שונים.'], ['10♥ 10♣ A♦ 7♠ 3♣', 'זוג', 'שני קלפים באותו ערך.'], ['A♠ J♦ 8♣ 5♥ 2♦', 'קלף גבוה', 'אין שילוב. מכריע הקלף הגבוה.']];
function fillRanks() {
  const h = document.getElementById('pkRanks'); if (!h) return;
  h.innerHTML = EX.map(([cs, n, d]) => `<div class="pkrank"><b>${n}</b><div class="ex">${cs.split(' ').map(t => { const s = t.slice(-1), r = t.slice(0, -1); return `<div class="pkc sm ${s === '♥' || s === '♦' ? 'red' : ''}"><span>${r}</span><span class="s">${s}︎</span></div>`; }).join('')}</div><small>${d}</small></div>`).join('');
}

/* ================= צלילים ================= */
let AC = null;
const soundOn = () => { try { return localStorage.getItem('soundOff') !== '1'; } catch (_) { return true; } };
const ac = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (_) {} return AC; };
function tone(f, d, type = 'sine', v = .12, at = 0, slide = 0) {
  if (!soundOn()) return; const a = ac(); if (!a) return; const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
const sfx = {
  deal: () => tone(1500, .05, 'square', .04),
  chip: () => { tone(2400, .06, 'triangle', .1); tone(3100, .05, 'triangle', .07, .05); },
  check: () => tone(180, .09, 'sine', .2),
  fold: () => tone(300, .18, 'sawtooth', .05, 0, -160),
  turn: () => { tone(880, .1, 'sine', .1); tone(1175, .12, 'sine', .1, .1); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .14, i * .11)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, .3, 'sawtooth', .07, i * .18))
};

/* ================= קלפים והערכה (רק לרמז "היד שלך") ================= */
const parse = c => ({ r: '23456789TJQKA'.indexOf(c[0]), s: 'shdc'.indexOf(c[1]) });
function score5(c) {
  const r = c.map(x => x.r).sort((a, b) => b - a), flush = c.every(x => x.s === c[0].s);
  let straight = false, hi = 0;
  if (new Set(r).size === 5) { if (r[0] - r[4] === 4) { straight = true; hi = r[0]; } else if (r.join() === '12,3,2,1,0') { straight = true; hi = 3; } }
  const cnt = {}; r.forEach(x => cnt[x] = (cnt[x] || 0) + 1);
  const g = Object.entries(cnt).map(([k, v]) => [v, +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  if (straight && flush) return [8, hi]; if (g[0][0] === 4) return [7, g[0][1], g[1][1]]; if (g[0][0] === 3 && g[1][0] === 2) return [6, g[0][1], g[1][1]];
  if (flush) return [5, ...r]; if (straight) return [4, hi]; if (g[0][0] === 3) return [3, ...g.map(x => x[1])];
  if (g[0][0] === 2 && g[1][0] === 2) return [2, ...g.map(x => x[1])]; if (g[0][0] === 2) return [1, ...g.map(x => x[1])]; return [0, ...r];
}
const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function best(cards) {
  let bs = null; const n = cards.length; if (n < 5) return null;
  for (let a = 0; a < n - 4; a++) for (let b = a + 1; b < n - 3; b++) for (let c = b + 1; c < n - 2; c++) for (let d = c + 1; d < n - 1; d++) for (let e = d + 1; e < n; e++) {
    const s = score5([cards[a], cards[b], cards[c], cards[d], cards[e]]); if (!bs || cmp(s, bs) > 0) bs = s;
  }
  return bs;
}
const hname = (cat, hi) => (cat === 8 && hi === 12) ? HAND[9] : HAND[cat];
function describe(codes) {
  const cs = codes.map(parse);
  if (cs.length < 5) { const [a, b] = cs.map(c => c.r).sort((x, y) => y - x); return a === b ? `זוג של ${RKS[a]}` : `קלף גבוה ${RKS[a]}`; }
  const s = best(cs), n = hname(s[0], s[1]);
  return (s[0] === 1 || s[0] === 0 || s[0] === 3 || s[0] === 7) ? `${n} (${RKS[s[1]]})` : n;
}

/* ================= מצב ================= */
let S = null, prev = null, busy = false, deadline = 0, lastSec = 0, seen = new Set(), seenHand = -1, logMsg = '', showAt = 0, raiseVal = 0, lastKey = '';
const mySeatP = () => S && S.players.find(p => p.user_id === S.me && !p.left);
const nameOf = p => p ? (p.name || 'שחקן') : 'שחקן';

async function load() {
  const { data, error } = await rpc('poker_state');
  if (error || !data) { if (!S) renderGone(); return; }
  const first = !S; prev = S; S = data;
  if (first && S.table.phase === 'show') showAt = Date.now();
  deadline = S.secs_left != null ? Date.now() + S.secs_left * 1000 : 0;
  if (prev) diffEffects(prev, S);
  const key = JSON.stringify({ ...S, secs_left: 0 });
  if (key === lastKey && !first) return;
  lastKey = key;
  render();
}

function diffEffects(a, b) {
  const t = b.table;
  if (t.hand_no !== a.table.hand_no) { sfx.deal(); logMsg = `יד ${t.hand_no}`; }
  else if (t.board.length > a.table.board.length) sfx.deal();
  const A = Object.fromEntries(a.players.map(p => [p.seat, p]));
  for (const p of b.players) {
    const o = A[p.seat]; if (!o || t.hand_no !== a.table.hand_no) continue;
    if (p.last_act && (p.last_act !== o.last_act || p.bet !== o.bet)) {
      const who = nameOf(p), lab = { fold: 'ויתר', check: 'צ\'ק', call: `קול ${p.bet}`, raise: `העלה ל-${p.bet}`, allin: `אול-אין ${p.bet + 0}` }[p.last_act];
      if (lab) logMsg = `${who}: ${lab}`;
      if (p.user_id !== b.me) (p.last_act === 'fold' ? sfx.fold : p.last_act === 'check' ? sfx.check : sfx.chip)();
    }
  }
  const mine = mySeatP();
  if (t.phase === 'show' && a.table.phase !== 'show') {
    showAt = Date.now();
    const lines = (t.results && t.results.lines) || [];
    if (mine) (lines.some(l => l.seat === mine.seat) ? sfx.win : sfx.lose)();
  }
  if (mine && t.to_act === mine.seat && a.table.to_act !== mine.seat) sfx.turn();
}

/* ================= ציור: רשימה ================= */
function renderGone() {
  root.innerHTML = `<div class="pkpanel"><h2>השולחן לא נמצא</h2><p style="margin:0">ייתכן שהשולחן נסגר.</p>${GT ? '' : '<a class="pknext" style="text-align:center;text-decoration:none" href="poker.html">חזרה לרשימה</a>'}</div>`;
}
async function showList() {
  const { data } = await supabase.rpc('poker_list');
  const L = data || { tables: [], mine: null };
  root.innerHTML = `
    <div class="pkpanel"><h2>פוקר טקסס הולדם</h2>
      <p style="margin:0;color:var(--pkmuted);line-height:1.6">עד 6 שחקנים, ז'יטונים וירטואליים. פותחים שולחן, בוחרים את מי להזמין (בני משפחה או אורחים בקישור), ומתחילים.</p>
      ${L.mine ? `<a class="pknext" style="text-align:center;text-decoration:none" href="poker.html?g=${L.mine}">חזרה לשולחן שלך</a>` : '<button class="pknext" id="pkNew" type="button">פתח שולחן חדש</button>'}
    </div>
    <div class="pkpanel"><h2>שולחנות שהוזמנת אליהם</h2>
      ${L.tables.length ? L.tables.map(t => `<div class="pkrow"><b>השולחן של ${esc(t.host || 'מישהו')}<br><small>${t.n} מתוך 6 שחקנים · ${t.status === 'lobby' ? 'ממתין להתחלה' : 'במשחק'}</small></b>
        ${t.id === L.mine ? '<span class="pkchip">אתה כאן</span>' : `<button class="pkjoin" data-id="${t.id}" type="button" ${t.n >= 6 || L.mine ? 'disabled style="opacity:.4"' : ''}>הצטרף</button>`}</div>`).join('') : '<p class="pkempty" style="margin:0">אין הזמנות לשולחן כרגע</p>'}
    </div>${RULES}`;
  fillRanks();
  const nb = document.getElementById('pkNew');
  if (nb) nb.onclick = async () => {
    nb.disabled = true; ac();
    const { data: id, error } = await supabase.rpc('poker_create');
    if (error) { showToast(errText(error, 'פתיחת השולחן נכשלה'), true); nb.disabled = false; return; }
    location.href = 'poker.html?g=' + id;
  };
  root.querySelectorAll('.pkjoin:not([disabled])').forEach(b => b.onclick = async () => {
    b.disabled = true; ac();
    const { error } = await supabase.rpc('poker_join', { p_table: b.dataset.id });
    if (error) { showToast(errText(error, 'ההצטרפות נכשלה'), true); b.disabled = false; return; }
    location.href = 'poker.html?g=' + b.dataset.id;
  });
}

/* ================= ציור: שולחן ================= */
function cardEl(code, cls = '', hidden = false) {
  const k = (code || 'x') + cls, isNew = !seen.has(k); seen.add(k);
  if (hidden || !code) return `<div class="pkc back ${cls}${isNew ? ' new' : ''}"><i>.</i><i>.</i></div>`;
  const c = parse(code);
  return `<div class="pkc ${cls} ${c.s === 1 || c.s === 2 ? 'red' : ''}${isNew ? ' new' : ''}"><span>${RKS[c.r]}</span><span class="s">${SUITS[c.s]}︎</span></div>`;
}
const DECO = `<svg class="pkdeco" viewBox="0 0 400 510" preserveAspectRatio="none" aria-hidden="true">
  <rect x="13" y="13" width="374" height="484" rx="170" ry="160" fill="none" stroke="#e8bd4f" stroke-opacity=".55" stroke-width="2"/>
  <rect x="22" y="22" width="356" height="466" rx="162" ry="152" fill="none" stroke="#e8bd4f" stroke-opacity=".25" stroke-width="1.2" stroke-dasharray="2 6"/>
  <g font-size="48" text-anchor="middle" opacity=".55"><text transform="translate(66 176) rotate(-14)" style="fill:#c9372c">♥︎</text><text transform="translate(334 176) rotate(14)" style="fill:#111">♠︎</text><text transform="translate(66 340) rotate(12)" style="fill:#111">♣︎</text><text transform="translate(334 340) rotate(-12)" style="fill:#c9372c">♦︎</text></g>
  <g transform="translate(200 246)" fill="none" stroke="#e8bd4f" stroke-opacity=".3"><circle r="92" stroke-width="2.5"/><circle r="84" stroke-width="1" stroke-dasharray="3 5"/><circle r="52" stroke-width="1"/>
    <g stroke="none" font-size="24" text-anchor="middle" opacity=".6"><text x="0" y="-62" style="fill:#111">♠︎</text><text x="68" y="9" style="fill:#c9372c">♥︎</text><text x="0" y="78" style="fill:#c9372c">♦︎</text><text x="-68" y="9" style="fill:#111">♣︎</text></g></g>
  <g><path d="M125 209 L123 195 L131 201 L135 192 L139 201 L147 195 L145 209 Z" fill="#e8bd4f" stroke="#8a6a1c" stroke-width=".8" stroke-linejoin="round"/>
    <circle cx="123" cy="194" r="2" fill="#f6d77a"/><circle cx="135" cy="191" r="2" fill="#f6d77a"/><circle cx="147" cy="194" r="2" fill="#f6d77a"/>
    <text x="153" y="207" font-size="15" textLength="124" lengthAdjust="spacingAndGlyphs" style="direction:ltr;font-weight:800">Dovev Greenberg</text></g>
  <g opacity=".8"><line x1="96" y1="118" x2="150" y2="118" stroke="#e8bd4f" stroke-opacity=".5"/><line x1="250" y1="118" x2="304" y2="118" stroke="#e8bd4f" stroke-opacity=".5"/>
    <text x="200" y="107" font-size="13" text-anchor="middle" letter-spacing="1" fill-opacity=".75" style="font-weight:800">♠ אליפות הבית שלנו ♦</text>
    <text x="200" y="132" font-size="9.5" text-anchor="middle" letter-spacing="2" fill-opacity=".55" style="font-weight:600">TEXAS HOLD'EM</text></g></svg>`;

let INV = null;
async function loadInv() {
  const { data } = await supabase.rpc('poker_invited', { p_table: gid });
  INV = new Set(data || []); if (S && S.table.status === 'lobby') lobbyView();
}
function lobbyView() {
  const t = S.table, isHost = t.host_id === S.me, ps = S.players.filter(p => !p.left), bySeat = Object.fromEntries(ps.map(p => [p.seat, p]));
  root.innerHTML = `
    <div class="pkpanel"><h2>השולחן מתכונן</h2>
      <div class="pklobby">${[0, 1, 2, 3, 4, 5].map(i => bySeat[i] ? `<div class="pkpl"><span style="font-size:22px">${bySeat[i].user_id === t.host_id ? '👑' : '🂠'}</span>${esc(nameOf(bySeat[i]))}</div>` : '<div class="pkpl empty"><span style="font-size:22px">·</span>מקום פנוי</div>').join('')}</div>
      <div class="pkres">${ps.length < 2 ? 'ממתינים לעוד שחקן' : isHost ? 'אפשר להתחיל' : 'ממתינים שהמארח יתחיל'}</div>
      ${isHost ? `<button class="pknext" id="pkStart" type="button" ${ps.length < 2 ? 'disabled style="opacity:.4"' : ''}>התחל משחק</button>` : ''}
      ${isHost && !GT ? `<h3 style="margin:6px 0 0;font-size:15px">הזמן מהמשפחה</h3><div class="pkfams">${profiles.filter(p => p.is_user !== false && p.id !== S.me).map(p => {
        const seated = ps.some(x => x.user_id === p.id), inv = INV && INV.has(p.id);
        return `<button class="pkfam" data-id="${p.id}" type="button" ${seated || inv ? 'disabled' : ''}>${avatar(p, 46)}<span>${esc(p.name)}</span><small>${seated ? 'בשולחן' : inv ? 'הוזמן/ה ✓' : 'הזמן'}</small></button>`; }).join('') || '<p class="pkempty" style="margin:0">אין עוד בני משפחה</p>'}</div>` : ''}
      ${GT ? '' : '<button class="pknext sec" id="pkInv" type="button">הזמן אורח בקישור</button>'}
      <button class="pknext sec" id="pkLeave" type="button">עזוב שולחן</button>
    </div>${RULES}`;
  fillRanks();
  if (isHost && !GT && INV === null) loadInv();
  root.querySelectorAll('.pkfam:not([disabled])').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error } = await supabase.rpc('poker_invite', { p_table: gid, p_user: b.dataset.id });
    if (error) { showToast('ההזמנה נכשלה', true); b.disabled = false; return; }
    INV = INV || new Set(); INV.add(b.dataset.id); showToast('ההזמנה נשלחה'); lobbyView();
  });
  bind('pkStart', async () => { ac(); const { error } = await rpc('poker_start'); if (error) showToast(errText(error, 'ההתחלה נכשלה'), true); await load(); });
  bind('pkInv', () => inviteGuest('poker'));
  bind('pkLeave', leave);
}
function bind(id, fn) { const e = document.getElementById(id); if (e) e.onclick = fn; }
async function leave() {
  if (!confirm('לעזוב את השולחן?')) return;
  await rpc('poker_leave');
  if (GT) { root.innerHTML = '<div class="pkpanel"><h2>יצאת מהשולחן</h2><p style="margin:0">תודה ששיחקת!</p></div>'; clearInterval(poll); } else location.href = 'poker.html';
}

function render() {
  const t = S.table, mine = mySeatP();
  if (t.status === 'done') { root.innerHTML = `<div class="pkpanel"><h2>השולחן נסגר</h2><p style="margin:0">כולם עזבו את השולחן.</p>${GT ? '' : '<a class="pknext" style="text-align:center;text-decoration:none" href="poker.html">חזרה לרשימה</a>'}</div>`; return; }
  if (!mine) {
    root.innerHTML = `<div class="pkpanel"><h2>אינך יושב בשולחן</h2>${GT ? '<p style="margin:0">יצאת מהשולחן.</p>' : '<button class="pknext" id="pkJoin" type="button">הצטרף לשולחן</button><a class="pknext sec" style="text-align:center;text-decoration:none" href="poker.html">חזרה לרשימה</a>'}</div>`;
    bind('pkJoin', async () => { const { error } = await supabase.rpc('poker_join', { p_table: gid }); if (error) showToast(errText(error, 'ההצטרפות נכשלה'), true); lastKey = ''; await load(); });
    return;
  }
  if (t.status === 'lobby') return lobbyView();
  if (t.hand_no !== seenHand) { seenHand = t.hand_no; seen = new Set(); }
  const ps = S.players.filter(p => !p.left).sort((a, b) => ((a.seat - mine.seat + 6) % 6) - ((b.seat - mine.seat + 6) % 6));
  const pos = PICK[Math.min(6, ps.length)];
  const res = t.results, rev = (res && res.revealed) || {}, wins = new Set(((res && res.lines) || []).map(l => l.seat));
  let seats = '';
  ps.forEach((p, i) => {
    const [x, y] = SEATPOS[pos[i]], isMe = p.user_id === S.me;
    let hole = '';
    if (p.in_hand) {
      if (isMe) hole = (S.my_cards || ['', '']).map(c => cardEl(c, 'lg', !c)).join('');
      else if (rev[p.seat]) hole = rev[p.seat].map(c => cardEl(c, 'sm')).join('');
      else hole = cardEl(null, 'sm', true) + cardEl(null, 'sm', true);
    }
    const out = !p.in_hand && p.chips === 0 && t.phase !== 'pre';
    const tag = out ? 'ללא ז\'יטונים' : wins.has(p.seat) && t.phase === 'show' ? 'ניצח' : p.in_hand && p.folded ? 'ויתר' : p.allin ? 'אול-אין' : '';
    seats += `<div class="pkseat ${isMe ? 'me' : ''} ${p.seat === t.to_act && t.phase !== 'show' ? 'turn' : ''} ${p.in_hand && p.folded ? 'fold' : ''} ${out ? 'out' : ''}" style="left:${x}%;top:${y}%">
      <div class="pkhole">${hole}</div><div class="pkplate"><b>${esc(isMe ? 'אתה' : nameOf(p))}</b><span>${p.chips.toLocaleString('he-IL')}</span></div><div class="pktag ${tag === 'אול-אין' ? 'allin' : tag === 'ניצח' ? 'win' : ''}">${tag}</div></div>`;
    if (p.bet > 0) seats += `<div class="pkbet" style="left:${x + (50 - x) * .38}%;top:${y + (46 - y) * .38 - (isMe ? 4 : 0)}%"><i></i>${p.bet}</div>`;
    if (p.seat === t.dealer && p.in_hand) seats += `<div class="pkdealer" style="left:${x + (50 - x) * .22 + (x < 50 ? 8 : x > 50 ? -8 : 11)}%;top:${y + (46 - y) * .22 + (x === 50 ? (y > 50 ? -3 : 5) : 6)}%">D</div>`;
  });
  const board = [0, 1, 2, 3, 4].map(k => t.board[k] ? cardEl(t.board[k]) : '<div class="pkc empty"><i>.</i><i>.</i></div>').join('');
  const myHint = mine.in_hand && !mine.folded && S.my_cards ? `היד שלך: ${describe([...S.my_cards, ...t.board])}` : (mine.in_hand && mine.folded ? 'ויתרת על היד הזו' : '');
  root.innerHTML = `
    <div class="pkbar"><b>פוקר טקסס הולדם</b><button class="pkchip" id="pkSnd" type="button">צליל: ${soundOn() ? 'פעיל' : 'כבוי'}</button></div>
    <div class="pkwrap"><div class="pktbl">${DECO}
      <div class="pkpot">${t.pot > 0 ? `<small>קופה</small>${t.pot.toLocaleString('he-IL')}` : ''}</div>
      <div class="pkboard">${board}</div>
      <div class="pkmsg">${t.phase === 'show' ? '' : esc(logMsg)}</div>${seats}</div></div>
    <div class="pkhint">${myHint}</div>
    <div class="pkpanel" id="pkCtl"></div>
    <div class="pkbtns" style="grid-template-columns:${GT ? '1fr' : '1fr 1fr'}">${GT ? '' : '<button class="pknext sec" id="pkInv" type="button">הזמן אורח בקישור</button>'}<button class="pknext sec" id="pkLeave" type="button">עזוב שולחן</button></div>
    ${RULES}`;
  fillRanks();
  bind('pkInv', () => inviteGuest('poker'));
  bind('pkLeave', leave);
  bind('pkSnd', () => { try { localStorage.setItem('soundOff', soundOn() ? '1' : '0'); } catch (_) {} lastKey = ''; render(); });
  controls(mine);
}

function resultHtml() {
  const t = S.table, res = t.results; if (!res) return '';
  const byS = Object.fromEntries(S.players.map(p => [p.seat, p]));
  return (res.lines || []).map(l => `<b>${esc(nameOf(byS[l.seat]))}</b> זכה ב-${l.won.toLocaleString('he-IL')}${res.showdown ? ` עם ${hname(l.cat, l.hi)}` : ' כי כולם ויתרו'}`).join('<br>');
}
function timerRow(mine) {
  const t = S.table;
  if (!['pre', 'flop', 'turn', 'river'].includes(t.phase)) return '';
  if (t.to_act === mine.seat) return '<div class="pktimer"><span class="pktl">הזמן שלך להחליט</span><div class="pktbar"><div class="pktfill" id="pkTf"></div></div><span class="pktt" id="pkTt">60</span></div>';
  const p = S.players.find(x => x.seat === t.to_act);
  return `<div class="pktimer"><span class="pktl">ממתין ל${esc(nameOf(p))}...</span><div class="pktbar"><div class="pktfill" id="pkTf"></div></div><span class="pktt" id="pkTt" style="font-size:18px">60</span></div>`;
}
function controls(mine) {
  const c = document.getElementById('pkCtl'), t = S.table;
  if (t.phase === 'show' || t.phase === 'wait') {
    const need = mine.chips === 0;
    c.innerHTML = `<div class="pkres">${t.phase === 'wait' ? 'מחכים לעוד שחקנים עם ז\'יטונים' : resultHtml()}</div>
      ${need ? '<button class="pknext" id="pkRebuy" type="button">קנה מחדש 1,000 ז\'יטונים</button>' : ''}
      ${t.phase === 'show' ? `<button class="pknext ${need ? 'sec' : ''}" id="pkNext" type="button">היד הבאה</button><div class="pkres" style="color:var(--pkmuted);font-size:13px" id="pkAuto"></div>` : ''}`;
    bind('pkRebuy', async () => { ac(); const { error } = await rpc('poker_rebuy'); if (error) showToast('הפעולה נכשלה', true); lastKey = ''; await load(); });
    bind('pkNext', async () => { ac(); await rpc('poker_next', { p_hand: t.hand_no }); lastKey = ''; await load(); });
    return;
  }
  const isMine = t.to_act === mine.seat && !busy && mine.in_hand && !mine.folded;
  const toCall = t.cur_bet - mine.bet, maxTo = mine.bet + mine.chips, minTo = Math.min(maxTo, t.cur_bet + t.min_raise), canRaise = maxTo > t.cur_bet && mine.chips > toCall;
  const rv = Math.min(maxTo, Math.max(minTo, raiseVal || minTo));
  const on = isMine && canRaise ? '' : 'disabled';
  c.innerHTML = `${timerRow(mine)}<div class="pkbtns"><button class="pkact fold" id="aF" type="button" ${isMine ? '' : 'disabled'}>פולד</button>
    <button class="pkact call" id="aC" type="button" ${isMine ? '' : 'disabled'}>${toCall <= 0 ? 'צ\'ק' : toCall >= mine.chips ? `אול-אין ${mine.chips}` : `קול ${toCall}`}</button>
    <button class="pkact raise" id="aR" type="button" ${on}>${t.cur_bet === 0 ? 'הימור' : 'העלאה'} <span id="rv">${rv}</span></button></div>
    <div class="pkraise"><input type="range" id="rs" min="${minTo}" max="${maxTo}" step="10" value="${rv}" ${on} aria-label="סכום ההימור"><div class="pkamt" id="av">${rv}</div></div>
    <div class="pkquick"><button id="q1" type="button" ${on}>חצי קופה</button><button id="q2" type="button" ${on}>קופה</button><button id="q3" type="button" ${on}>הכול</button></div>`;
  const rs = document.getElementById('rs'), upd = () => { raiseVal = +rs.value; document.getElementById('av').textContent = rs.value; document.getElementById('rv').textContent = rs.value; };
  rs.oninput = upd;
  const setv = v => { rs.value = Math.max(minTo, Math.min(maxTo, Math.round(v / 10) * 10)); upd(); };
  bind('q1', () => setv(t.cur_bet + (t.pot + toCall) * .5)); bind('q2', () => setv(t.cur_bet + t.pot + toCall)); bind('q3', () => setv(maxTo));
  bind('aF', () => human('fold')); bind('aC', () => human(toCall <= 0 ? 'check' : 'call')); bind('aR', () => human('raise', +rs.value));
}
async function human(action, amount = 0) {
  if (busy) return; busy = true; ac(); raiseVal = 0; deadline = 0;
  const { error } = await rpc('poker_action', { p_action: action, p_amount: amount });
  busy = false;
  if (error) showToast(errText(error, 'הפעולה נכשלה, נסו שוב'), true); else (action === 'fold' ? sfx.fold : action === 'check' ? sfx.check : sfx.chip)();
  lastKey = ''; await load();
}

/* ================= טיימר ================= */
function tick() {
  if (!S) return;
  const t = S.table;
  if (t.phase === 'show') { const a = document.getElementById('pkAuto'); if (a && showAt) a.textContent = `היד הבאה מתחילה בעוד ${Math.max(0, 12 - Math.floor((Date.now() - showAt) / 1000))}`; return; }
  const f = document.getElementById('pkTf'), tt = document.getElementById('pkTt'); if (!f || !tt || !deadline) return;
  const left = Math.max(0, deadline - Date.now()), s = Math.ceil(left / 1000), mineTurn = mySeatP() && t.to_act === mySeatP().seat;
  f.style.width = (left / 600) + '%'; f.className = 'pktfill' + (s <= 10 ? ' low' : s <= 25 ? ' mid' : '');
  tt.textContent = s; tt.className = 'pktt' + (s <= 10 && mineTurn ? ' low' : '');
  if (mineTurn && s <= 10 && s > 0 && s !== lastSec) { lastSec = s; tone(880, .07, 'square', .05); }
  if (left <= 0 && !busy) { deadline = 0; setTimeout(() => { lastKey = ''; load(); }, 600); }
}

/* ================= הפעלה ================= */
let poll = null;
if (!gid) await showList();
else {
  await load();
  poll = setInterval(() => { if (!busy && !document.hidden) load(); }, 2200);
  setInterval(tick, 250);
  if (!GT) supabase.channel('pk-' + gid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_tables', filter: 'id=eq.' + gid }, () => { if (!busy) load(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_players', filter: 'table_id=eq.' + gid }, () => { if (!busy) load(); })
    .subscribe();
}
