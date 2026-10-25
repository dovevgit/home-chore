import { initPage, supabase, esc, avatar, showToast } from './common.js';
import { guestToken, guestMode, inviteGuest } from './guest.js';

/* ================= הכנה: בן משפחה או אורח ================= */
const GT = guestToken();
let profiles = [], me, gid = new URLSearchParams(location.search).get('g'), gcall = null;
if (GT) { const g = await guestMode('bg', GT); me = g.me; gid = g.ref; gcall = g.call; }
else {
  const r = await initPage({ active: 'games', title: 'שש בש' });
  profiles = r.profiles || [];
  me = profiles.find(p => p.id === r.session.user.id) || { id: r.session.user.id, name: '' };
}
const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
byId[me.id] = byId[me.id] || me;
const root = document.getElementById('bgm');
const call = (fn, args) => GT ? gcall(fn, args) : supabase.rpc(fn, args);
const nm = id => (byId[id] && byId[id].name) || 'שחקן';

const RULES = `<details class="bgcard bgrules"><summary>איך משחקים שש בש? (החוקים)</summary>
<p>שש בש הוא משחק לשני שחקנים. כל אחד מקבל 15 כלים, והמטרה היא להביא את כל הכלים שלך לאזור הבית שלך ואז להוציא אותם מהלוח לפני היריב. הקוביות קובעות כמה צעדים מותר להתקדם.</p>
<h4>הלוח והכיוון</h4>
<ul>
<li>ללוח 24 משולשים (נקודות), ובאמצע פס (בר). אתה תמיד משחק עם הכלים הבהירים. הם נעים נגד כיוון השעון: לאורך השורה העליונה משמאל לימין, למטה ואז בשורה התחתונה מימין לשמאל, אל הבית שלך: ששת המשולשים בתחתית מימין.</li>
<li>הכלים השחורים של היריב נעים בכיוון ההפוך אל הבית שלו בצד העליון מימין.</li>
</ul>
<h4>התור</h4>
<ol>
<li>לוחצים על "הטל קוביות". המערכת מטילה שתי קוביות. כל קובייה היא צעד נפרד: אפשר להזיז כלי אחד פעמיים או שני כלים כל אחד בצעד.</li>
<li>לוחצים על כלי שלך, והמשולשים שאפשר להגיע אליהם נדלקים. לוחצים על משולש כדי להזיז.</li>
<li>כלי יכול לנחות על משולש ריק, על משולש עם כלים שלך, או על משולש שיש בו כלי יריב אחד בלבד.</li>
<li>אסור לנחות על משולש עם שני כלי יריב או יותר, כי הוא חסום.</li>
<li>דאבל: אם יצאו שתי קוביות זהות, משחקים ארבעה צעדים באותו גודל.</li>
<li>חובה לשחק את כל הקוביות שאפשר. אם אפשר לשחק רק קובייה אחת, חובה לשחק אותה, ואם אפשר לשחק כל אחת מהן לבד, חובה לשחק את הגבוהה. אם אין מהלך חוקי התור עובר לבד.</li>
<li>עד שהתור עובר אפשר ללחוץ "בטל מהלך" ולהתחיל את התור מחדש.</li>
</ol>
<h4>אכילה ובר</h4>
<ul>
<li>כלי בודד על משולש אפשר לאכול: אם כלי יריב נוחת עליו, הכלי נאכל ועובר לפס באמצע.</li>
<li>כל עוד יש לך כלי על הפס, אסור להזיז כלים אחרים. קודם צריך להחזיר אותו לבית של היריב לפי הקובייה. אם המשולש חסום, התור עובר.</li>
</ul>
<h4>הוצאת כלים</h4>
<ul>
<li>כשכל 15 הכלים שלך באזור הבית, מותר להוציא אותם מהלוח.</li>
<li>קובייה מוציאה כלי מהמשולש המתאים לה. אם אין שם כלי, מזיזים כלי אחר צעד כזה, ורק אם אין כלים רחוקים יותר מהקובייה אפשר להוציא את הכלי הרחוק ביותר.</li>
</ul>
<h4>ניצחון</h4>
<ul>
<li>מי שמוציא את כל 15 הכלים ראשון מנצח.</li>
<li>מארס (ניצחון כפול): המפסיד לא הוציא אף כלי. מארס בבית (ניצחון משולש): בנוסף יש לו כלי על הפס או בבית של המנצח.</li>
<li>בתחילת המשחק כל אחד מטיל קובייה, והגבוה מתחיל ומשחק את שתי הקוביות. אפשר גם לוותר באמצע.</li>
</ul></details>`;

/* ================= צלילים ================= */
let AC = null;
const soundOn = () => { try { return localStorage.getItem('soundOff') !== '1'; } catch (_) { return true; } };
function ac() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (_) {} return AC; }
function tone(f, d, type = 'sine', v = .12, at = 0, slide = 0) {
  if (!soundOn()) return; const a = ac(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
const sfx = {
  roll: () => [0, .06, .12, .2].forEach(t => tone(300 + Math.random() * 300, .05, 'square', .05, t)),
  move: () => tone(220, .08, 'triangle', .22),
  hit: () => { tone(140, .25, 'sawtooth', .1, 0, -60); tone(90, .3, 'sine', .2); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .14, i * .11)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, .3, 'sawtooth', .07, i * .18))
};
function confetti() {
  const cs = ['#e2b552', '#f3ead3', '#c0563f', '#58c27d', '#6c8ee0'];
  for (let i = 0; i < 80; i++) { const e = document.createElement('i'); e.className = 'bgconf'; e.style.left = Math.random() * 100 + 'vw'; e.style.background = cs[i % cs.length];
    e.style.animationDuration = 2 + Math.random() * 2.2 + 's'; e.style.animationDelay = Math.random() * .6 + 's'; document.body.append(e); setTimeout(() => e.remove(), 5200); }
}

/* ================= מנוע (לסימון מהלכים בלבד; השרת בודק הכל מחדש) ================= */
// נקודת מבט שלי: כלי שלי חיוביים ונעים מ-24 ל-1, בר = 25
const clone = s => ({ p: s.p.slice(), barW: s.barW, barB: s.barB, offW: s.offW, offB: s.offB });
function steps(s, d) {
  const out = [];
  if (s.barW > 0) { const to = 25 - d; if (s.p[to] >= -1) out.push({ from: 25, to, die: d }); return out; }
  let allHome = true, hi = 0;
  for (let i = 24; i >= 1; i--) if (s.p[i] > 0) { if (i > 6) allHome = false; if (i > hi) hi = i; }
  for (let i = 24; i >= 1; i--) {
    if (s.p[i] <= 0) continue; const to = i - d;
    if (to >= 1) { if (s.p[to] >= -1) out.push({ from: i, to, die: d }); }
    else if (allHome && (to === 0 || i === hi)) out.push({ from: i, to: 0, die: d });
  }
  return out;
}
function applyStep(s, m) {
  const n = clone(s);
  if (m.from === 25) n.barW--; else n.p[m.from]--;
  if (m.to >= 1) { if (n.p[m.to] === -1) { n.p[m.to] = 0; n.barB++; } n.p[m.to]++; } else n.offW++;
  return n;
}
let memo = new Map();
function maxuse(s, dice) {
  if (!dice.length) return 0;
  const k = s.p.join() + '|' + s.barW + '|' + dice.slice().sort().join(); if (memo.has(k)) return memo.get(k);
  let best = 0; const seen = new Set();
  for (let i = 0; i < dice.length && best < dice.length; i++) {
    const d = dice[i]; if (seen.has(d)) continue; seen.add(d);
    const rest = dice.slice(0, i).concat(dice.slice(i + 1));
    for (const m of steps(s, d)) { const v = 1 + maxuse(applyStep(s, m), rest); if (v > best) best = v; if (best === dice.length) break; }
  }
  memo.set(k, best); return best;
}
function firstSteps(s, dice) {
  const n = dice.length, mb = maxuse(s, dice), out = [], seen = new Set();
  if (!n || !mb) return out;
  const hiDie = Math.max(...dice);
  dice.forEach((d, i) => {
    if (seen.has(d)) return; seen.add(d);
    const rest = dice.slice(0, i).concat(dice.slice(i + 1));
    steps(s, d).forEach(m => {
      if (1 + maxuse(applyStep(s, m), rest) < mb) return;
      if (mb === 1 && n === 2 && dice[0] !== dice[1] && d < hiDie && steps(s, hiDie).length) return;
      out.push(m);
    });
  });
  return out;
}
// ממיר שורת משחק מהשרת לנקודת המבט שלי
function viewOf(g) {
  const iA = g.a_id === me.id, pts = g.pts, p = Array(26).fill(0);
  for (let i = 1; i <= 24; i++) p[i] = iA ? pts[i - 1] : -pts[24 - i];
  return iA ? { p, barW: g.bar_a, barB: g.bar_b, offW: g.off_a, offB: g.off_b } : { p, barW: g.bar_b, barB: g.bar_a, offW: g.off_b, offB: g.off_a };
}

/* ================= רשימה ================= */
async function learn(games) {
  const miss = [...new Set(games.flatMap(g => [g.a_id, g.b_id]))].filter(id => id && !byId[id]);
  if (!miss.length) return;
  const { data } = await supabase.from('profiles').select('id,name,color').in('id', miss);
  (data || []).forEach(p => { byId[p.id] = p; });
}
async function showList() {
  const { data: games } = await supabase.from('bg_games').select('id,a_id,b_id,status,turn,rolled,winner,result,updated_at').order('updated_at', { ascending: false }).limit(30);
  const mine = games || []; await learn(mine);
  const active = mine.filter(g => ['invite', 'play'].includes(g.status));
  const busyWith = new Set(active.map(g => g.a_id === me.id ? g.b_id : g.a_id));
  const others = profiles.filter(p => p.is_user !== false && p.id !== me.id);
  const label = g => {
    const iA = g.a_id === me.id;
    if (g.status === 'invite') return iA ? ['ממתין לאישור', ''] : ['הזמנה אליך', 'me'];
    if (g.status === 'play') return g.turn === (iA ? 'a' : 'b') ? ['התור שלך', 'me'] : ['התור שלו/ה', ''];
    if (g.status === 'done') return [g.winner === me.id ? 'ניצחת' : 'הפסדת', ''];
    return ['בוטל', ''];
  };
  const row = g => { const opp = g.a_id === me.id ? g.b_id : g.a_id, [t, c] = label(g);
    return `<a class="bgrow" href="backgammon.html?g=${g.id}">${avatar(byId[opp], 40)}<b>${esc(nm(opp))}</b><span class="bgtag ${c}">${t}</span></a>`; };
  const clrAt = (() => { try { return +localStorage.getItem('clr_bg') || 0; } catch (_) { return 0; } })();
  const done = mine.filter(g => g.status === 'done' && new Date(g.updated_at || g.created_at || 0).getTime() > clrAt).slice(0, 5);
  root.innerHTML = `
    <div class="bgcard"><h3>משחק חדש. עם מי משחקים?</h3><div class="bgpick">
      ${others.map(p => `<button class="bgp" data-id="${p.id}" type="button" ${busyWith.has(p.id) ? 'disabled style="opacity:.4"' : ''}>${avatar(p, 52)}${esc(p.name)}</button>`).join('') || '<p>אין עוד שחקנים</p>'}
    </div></div>
    <div class="bgcard"><h3>חבר שהוא לא מהמשפחה?</h3><button class="bgbtn" id="bGuest" type="button" style="width:100%">הזמן אורח בקישור</button></div>
    ${active.length ? `<div class="bgcard"><h3>משחקים פעילים</h3>${active.map(row).join('')}</div>` : ''}
    ${done.length ? `<div class="bgcard"><h3>משחקים אחרונים<button class="bgclr" id="bgClr" type="button" style="border:0;background:transparent;font:inherit;font-size:13px;font-weight:700;color:inherit;opacity:.7;cursor:pointer;text-decoration:underline">נקה רשימה</button></h3>${done.map(row).join('')}</div>` : ''}${RULES}`;
  const clrB = document.getElementById('bgClr');
  if (clrB) clrB.onclick = () => { try { localStorage.setItem('clr_bg', String(Date.now())); } catch (_) {} clrB.closest('.bgcard').remove(); };
  document.getElementById('bGuest').onclick = () => inviteGuest('bg', d => { location.href = 'backgammon.html?g=' + d.ref; });
  root.querySelectorAll('.bgp:not([disabled])').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { data, error } = await supabase.rpc('bg_invite', { p_opp: b.dataset.id });
    if (error) { showToast(/game_exists/.test(error.message) ? 'כבר יש משחק פעיל עם השחקן הזה' : 'ההזמנה נכשלה', true); b.disabled = false; return; }
    location.href = 'backgammon.html?g=' + data;
  });
}

/* ================= משחק ================= */
let G = null, V = null, DL = [], busy = false, sel = null, lastKey = '', newDice = false;

async function load() {
  let data = null;
  if (GT) {
    const r = await gcall('bg_state', {});
    if (r.data && r.data.game) { data = r.data.game; byId[data.a_id] = byId[data.a_id] || { id: data.a_id, name: r.data.a_name }; byId[data.b_id] = byId[data.b_id] || { id: data.b_id, name: r.data.b_name }; }
  } else {
    ({ data } = await supabase.from('bg_games').select('id,a_id,b_id,status,turn,pts,bar_a,bar_b,off_a,off_b,rolled,dice,full_dice,open_dice,turn_log,last_by,last_skip,winner,result,updated_at').eq('id', gid).maybeSingle());
    if (data) await learn([data]);
  }
  if (!data) { root.innerHTML = '<p class="bgempty">המשחק לא נמצא</p><a class="bgbtn g" href="backgammon.html">חזרה</a>'; return; }
  const key = [data.status, data.turn, data.updated_at, data.rolled].join('|');
  if (key === lastKey) return;
  lastKey = key;
  const prev = G; G = data; V = viewOf(G); DL = (G.dice || []).slice(); sel = null; memo = new Map();
  const sd = G.a_id === me.id ? 'a' : 'b';
  if (prev) {
    if (G.status !== 'done') {
      const pl = (prev.turn_log || []).length, nl = (G.turn_log || []).length;
      if (G.last_by && G.last_by !== sd && nl > pl) { (G.turn_log || []).slice(pl).some(m => m.h) ? sfx.hit() : sfx.move(); }
      if (G.rolled && G.turn !== sd && !prev.rolled) { sfx.roll(); newDice = true; }
    }
    if (prev.status !== 'done' && G.status === 'done') { G.winner === me.id ? sfx.win() : (G.result === 'resign' ? 0 : sfx.lose()); }
    if (prev.status === 'invite' && G.status === 'play') newDice = true;
  } else if (G.rolled) newDice = true;
  render();
}

function bind(id, fn) { const e = document.getElementById(id); if (e) e.onclick = fn; }
async function act(fn, args) {
  if (busy) return; busy = true;
  const { error } = await call(fn, args); busy = false;
  if (error) showToast('הפעולה נכשלה', true);
  lastKey = ''; await load();
}
function resign() { if (confirm('לוותר על המשחק?')) act('bg_resign', { p_game: gid }); }

async function rollMine() {
  if (busy || !G || G.status !== 'play') return; busy = true; ac(); sfx.roll();
  const { error } = await call('bg_roll', { p_game: gid }); busy = false;
  if (error) showToast(/not_your_turn/.test(error.message) ? 'עדיין לא התור שלך' : 'ההטלה נכשלה, נסו שוב', true);
  newDice = true; lastKey = ''; await load();
}
function onPoint(p) {
  if (busy || !G || G.status !== 'play') return;
  const sd = G.a_id === me.id ? 'a' : 'b'; if (G.turn !== sd || !G.rolled) return; ac();
  const fs = firstSteps(V, DL);
  if (sel !== null) {
    const m = fs.filter(x => x.from === sel && x.to === p).sort((a, b) => a.die - b.die)[0];
    if (m) return doMove(m);
  }
  sel = fs.some(x => x.from === p) ? p : null; render();
}
async function doMove(m) {
  busy = true;
  const hit = m.to >= 1 && V.p[m.to] === -1;
  V = applyStep(V, m); const i = DL.indexOf(m.die); if (i >= 0) DL.splice(i, 1); sel = null; hit ? sfx.hit() : sfx.move(); render();
  const { error } = await call('bg_move', { p_game: gid, p_from: m.from, p_die: m.die });
  busy = false;
  if (error) showToast('המהלך נדחה', true);
  lastKey = ''; await load();
}
async function undo() {
  if (busy) return; busy = true; ac();
  const { error } = await call('bg_undo', { p_game: gid }); busy = false;
  if (error) showToast('אי אפשר לבטל', true);
  lastKey = ''; await load();
}

/* ---------- ציור ---------- */
const PW = 28, BW = 360, BH = 360, TH = 148;
const xOf = p => p >= 13 ? (p <= 18 ? (p - 13) * PW : 192 + (p - 19) * PW) : (p >= 7 ? (12 - p) * PW : 192 + (6 - p) * PW);
const isTop = p => p >= 13;
function pips(n) { const pos = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[n]; return Array.from({ length: 9 }, (_, i) => pos.includes(i + 1) ? '<b></b>' : '<span></span>').join(''); }
// מהלכי היריב האחרונים, בנקודת המבט שלי
function oppMoves(g) {
  const iA = g.a_id === me.id, sd = iA ? 'a' : 'b';
  if (!g.last_by || g.last_by === sd) return { from: new Set(), to: new Set() };
  const cv = n => (n === 25 || n === 0) ? n : (iA ? n : 25 - n);
  const from = new Set(), to = new Set();
  (g.turn_log || []).forEach(m => { const f = cv(m.f), t = cv(m.t); if (f >= 1 && f <= 24) from.add(f); if (t >= 1 && t <= 24) to.add(t); });
  return { from, to };
}
function boardSvg(fs, dests, movable, om) {
  const s = V;
  let svg = `<rect width="${BW}" height="${BH}" fill="#17222f"/>`;
  for (let p = 1; p <= 24; p++) {
    const x = xOf(p), top = isTop(p), col = p % 2 === 0 ? '#7a3b2b' : '#d3a85c', y0 = top ? 0 : BH, y1 = top ? TH : BH - TH;
    const poly = `${x + 1},${y0} ${x + PW - 1},${y0} ${x + PW / 2},${y1}`;
    svg += `<polygon points="${poly}" fill="${col}" opacity=".95"/>`;
    svg += `<text x="${x + PW / 2}" y="${top ? TH + 11 : BH - TH - 4}" font-size="8.5" fill="#8d97a5" text-anchor="middle">${p}</text>`;
    if (om.to.has(p)) svg += `<polygon points="${poly}" fill="none" stroke="#e2b552" stroke-width="2" stroke-opacity=".8"/>`;
    else if (om.from.has(p)) svg += `<polygon points="${poly}" fill="none" stroke="#e2b552" stroke-width="1.2" stroke-opacity=".6" stroke-dasharray="3 3"/>`;
    if (dests.has(p)) svg += `<polygon points="${poly}" fill="rgba(226,181,82,.55)"/>`;
  }
  svg += `<rect x="168" y="0" width="24" height="${BH}" fill="#3a2418"/><rect x="0" y="0" width="${BW}" height="${BH}" fill="none" stroke="#3a2418" stroke-width="3"/>`;
  const chk = (cx, cy, white, ring) => `<circle cx="${cx}" cy="${cy}" r="12" fill="${white ? '#f3ead3' : '#2a2420'}" stroke="${white ? '#cdbf9a' : '#e2b552'}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="7.5" fill="none" stroke="${white ? '#d9cca6' : '#5a4a3a'}" stroke-width="1"/>${ring ? `<circle cx="${cx}" cy="${cy}" r="14.5" fill="none" stroke="#e2b552" stroke-width="2.4"/>` : ''}`;
  for (let p = 1; p <= 24; p++) {
    const n = Math.abs(s.p[p]); if (!n) continue; const white = s.p[p] > 0, x = xOf(p) + PW / 2, top = isTop(p), step = Math.min(24, (TH - 26) / Math.max(1, n - 1));
    for (let i = 0; i < n; i++) { const cy = top ? 13 + i * step : BH - 13 - i * step; svg += chk(x, cy, white, sel === p && white && i === n - 1); }
    if (white && movable.has(p) && sel !== p) { const cy = top ? 13 + (n - 1) * step : BH - 13 - (n - 1) * step; svg += `<circle cx="${x}" cy="${cy}" r="14.5" fill="none" stroke="#e2b552" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray="3 3"/>`; }
  }
  for (let i = 0; i < s.barB; i++) svg += chk(180, 58 + i * 26, false, false);
  for (let i = 0; i < s.barW; i++) svg += chk(180, BH - 58 - i * 26, true, sel === 25 && i === s.barW - 1);
  if (s.barW && movable.has(25) && sel !== 25) svg += `<circle cx="180" cy="${BH - 58 - (s.barW - 1) * 26}" r="14.5" fill="none" stroke="#e2b552" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray="3 3"/>`;
  for (let p = 1; p <= 24; p++) svg += `<rect data-p="${p}" x="${xOf(p)}" y="${isTop(p) ? 0 : BH - TH}" width="${PW}" height="${TH}" fill="transparent" style="cursor:pointer"/>`;
  svg += `<rect data-p="25" x="168" y="${BH / 2}" width="24" height="${BH / 2}" fill="transparent" style="cursor:pointer"/>`;
  return `<svg id="bgBoard" viewBox="0 0 ${BW} ${BH}" role="img" aria-label="לוח שש בש">${svg}</svg>`;
}

const RES_TXT = { single: 'ניצחון רגיל', gammon: 'מארס (ניצחון כפול)', backgammon: 'מארס בבית (ניצחון משולש)' };

function render() {
  const g = G, iA = g.a_id === me.id, sd = iA ? 'a' : 'b', oppId = iA ? g.b_id : g.a_id;
  const bar = `<div class="bgbar">${avatar(byId[oppId], 38)}<span>${esc(nm(oppId))}</span><span class="sp">${g.status === 'play' ? 'במשחק' : ''}</span></div>`;
  let html = '', after = null;
  if (g.status === 'invite') {
    html = `${bar}<div class="bgbanner">${iA ? `ממתינים ש${esc(nm(oppId))} יאשר/תאשר` : `${esc(nm(oppId))} הזמין/ה אותך לשש בש`}</div>
      <div class="bgbtns">${iA ? '<button class="bgbtn r" id="bCancel" type="button">בטל הזמנה</button>' : '<button class="bgbtn" id="bYes" type="button">בוא נשחק</button><button class="bgbtn g" id="bNo" type="button">לא עכשיו</button>'}</div>${RULES}`;
    after = () => {
      bind('bCancel', () => act('bg_resign', { p_game: gid }));
      bind('bYes', () => act('bg_respond', { p_game: gid, p_accept: true }));
      bind('bNo', async () => { await act('bg_respond', { p_game: gid, p_accept: false }); location.href = 'backgammon.html'; });
    };
  } else if (g.status === 'declined') {
    html = `${bar}<div class="bgbanner">ההזמנה בוטלה</div><div class="bgbtns"><a class="bgbtn" href="backgammon.html">חזרה</a></div>`;
  } else {
    const myTurn = g.status === 'play' && g.turn === sd, played = g.status === 'play';
    const fs = myTurn && g.rolled ? firstSteps(V, DL) : [], dests = new Set(sel !== null ? fs.filter(m => m.from === sel).map(m => m.to) : []), movable = new Set(fs.map(m => m.from));
    const om = oppMoves(g);
    // הודעת מצב
    let bn = '', cls = '';
    const total = g.full_dice && g.full_dice.length ? (g.full_dice[0] === g.full_dice[1] ? 4 : 2) : 0;
    if (g.status === 'done') {
      bn = g.result === 'resign' ? (g.winner === me.id ? `${esc(nm(oppId))} ויתר/ה. ניצחת!` : 'ויתרת על המשחק') : (g.winner === me.id ? `ניצחת! ${RES_TXT[g.result] || ''}` : `${esc(nm(oppId))} ניצח/ה. ${RES_TXT[g.result] || ''}`);
    } else if (myTurn && !g.rolled) { bn = g.last_skip && g.last_by && g.last_by !== sd ? `${esc(nm(oppId))} לא היה מהלך חוקי. התור שלך, הטל קוביות` : 'התור שלך. הטל קוביות'; cls = 'you'; }
    else if (myTurn) {
      const first = !g.last_by && g.open_dice && g.open_dice.length === 2 && !(g.turn_log || []).length;
      bn = first ? `בהטלה הראשונה יצא לך ${g.open_dice[iA ? 0 : 1]} ול${esc(nm(oppId))} ${g.open_dice[iA ? 1 : 0]}. אתה מתחיל, שחק` : (DL.length ? 'שחק את הקוביות' : 'מסיימים תור...'); cls = 'you';
    } else if (g.last_skip && g.last_by === sd) { bn = `לא היה לך מהלך חוקי. התור עבר ל${esc(nm(oppId))}`; }
    else if (g.rolled) { const first = !g.last_by && g.open_dice && g.open_dice.length === 2 && !(g.turn_log || []).length;
      bn = first ? `בהטלה הראשונה יצא לך ${g.open_dice[iA ? 0 : 1]} ול${esc(nm(oppId))} ${g.open_dice[iA ? 1 : 0]}. ${esc(nm(oppId))} מתחיל/ה` : `${esc(nm(oppId))} משחק/ת...`; }
    else { bn = `התור של ${esc(nm(oppId))}`; }
    if (!cls && (g.turn_log || []).some(m => m.h) && g.last_by && g.last_by !== sd && myTurn) cls = 'boom';
    // קוביות
    let diceHtml = '';
    const showDice = g.rolled || g.last_skip;
    if (showDice && total) {
      const list = total === 4 ? [g.full_dice[0], g.full_dice[0], g.full_dice[0], g.full_dice[0]] : g.full_dice.slice();
      const used = g.rolled ? total - DL.length : total;
      diceHtml = list.map((d, i) => `<div class="bgdie ${i < used ? 'used' : ''} ${newDice ? 'new' : ''}">${pips(d)}</div>`).join(''); newDice = false;
    } else diceHtml = '<span style="color:var(--bgmuted);font-size:14px">הקוביות יופיעו כאן</span>';
    const canUndo = myTurn && g.rolled && (g.turn_log || []).length > 0 && !busy;
    const canOff = dests.has(0);
    const tr = (n, col) => Array.from({ length: n }, () => `<i style="background:${col}"></i>`).join('');
    html = `${bar}<div class="bgbanner ${cls}">${bn}</div>
      <div class="bgframe">${boardSvg(fs, dests, movable, om)}</div>
      <div class="bgsides"><span><i style="background:#2a2420;box-shadow:0 0 0 2px #e2b552"></i>${esc(nm(oppId))}</span><span><i style="background:#f3ead3"></i>אתה</span></div>
      <div class="bgcard"><div class="bgdice">${diceHtml}</div>
        ${played ? `<div class="bgbtns" style="margin-top:10px"><button class="bgbtn" id="bRoll" type="button" ${myTurn && !g.rolled && !busy ? '' : 'disabled'}>הטל קוביות</button><button class="bgbtn g" id="bUndo" type="button" ${canUndo ? '' : 'disabled'}>בטל מהלך</button></div>` : ''}
        <div class="bgoff" style="margin-top:10px"><div class="bgtray ${canOff ? 'can' : ''}" id="bTrayMe">${canOff ? 'לחץ כאן להוצאה' : `הוצאת: ${V.offW} ${tr(V.offW, '#f3ead3')}`}</div><div class="bgtray">${esc(nm(oppId))} הוציא/ה: ${V.offB} ${tr(V.offB, '#2a2420;box-shadow:0 0 0 1px #e2b552')}</div></div></div>
      ${played ? '<div class="bgbtns"><button class="bgbtn r" id="bResign" type="button">ויתור</button></div>' : (GT ? '<p class="bgmsg">תודה ששיחקת!</p>' : '<div class="bgbtns"><a class="bgbtn" href="backgammon.html">למשחקים</a></div>')}${RULES}`;
    after = () => {
      document.querySelectorAll('#bgBoard [data-p]').forEach(e => e.onclick = () => onPoint(+e.dataset.p));
      bind('bRoll', rollMine); bind('bUndo', undo); bind('bResign', resign);
      const t = document.getElementById('bTrayMe'); if (t && canOff) t.onclick = () => onPoint(0);
      if (g.status === 'done' && !document.getElementById('bgOver')) showOver(g.winner === me.id, g.result);
    };
  }
  const open = [...root.querySelectorAll('details[open]')].length > 0;
  root.innerHTML = html; if (open) root.querySelectorAll('details').forEach(d => d.open = true);
  if (after) after();
}
function showOver(win, result) {
  const o = document.createElement('div'); o.className = 'bgover'; o.id = 'bgOver';
  o.innerHTML = `<div class="bgbox"><div class="bgbig">${win ? '🏆' : '🎲'}</div><h2>${win ? 'ניצחת!' : 'הפסדת'}</h2>
    <p>${result === 'resign' ? (win ? 'היריב ויתר' : 'ויתרת על המשחק') : (RES_TXT[result] || '')}</p>
    <button class="bgbtn" id="bgOk" type="button" style="width:100%">סגור</button></div>`;
  document.body.append(o); document.getElementById('bgOk').onclick = () => o.remove();
  if (win) confetti();
}

/* ================= הפעלה ================= */
if (!gid) await showList();
else {
  await load();
  setInterval(() => { if (!busy && !document.hidden) load(); }, 2200);
  if (!GT) supabase.channel('bg-' + gid).on('postgres_changes', { event: '*', schema: 'public', table: 'bg_games', filter: 'id=eq.' + gid }, () => { if (!busy) load(); }).subscribe();
}
