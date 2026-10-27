import { initPage, supabase, esc, avatar, showToast } from './common.js';
import { guestToken, guestMode, inviteGuest } from './guest.js';
import { gameSplash } from './gamesplash.js';
gameSplash('checkers-splash.jpg');
import { legalMoves, applyMove, colorOf, counts } from './checkers-rules.js';

const GT = guestToken();
let profiles = [], me, gid = new URLSearchParams(location.search).get('g'), gcall = null;
if (GT) { const g = await guestMode('checkers', GT); me = g.me; gid = g.ref; gcall = g.call; }
else {
  const r = await initPage({ active: 'games', title: 'דמקה' });
  profiles = r.profiles || [];
  me = profiles.find(p => p.id === r.session.user.id) || { id: r.session.user.id, name: '' };
}
const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
byId[me.id] = byId[me.id] || me;
const root = document.getElementById('ck');
// קריאה לשרת: אורח עובר דרך guest_call, בן משפחה ישירות
const call = (fn, args) => GT ? gcall(fn, args) : supabase.rpc(fn, args);
const CROWN = '<svg viewBox="0 0 24 24"><path d="M3 18h18l1-10-5 4-5-8-5 8-5-4z" fill="#FFC93C" stroke="#B07A00" stroke-width="1.2" stroke-linejoin="round"/></svg>';

const RULES = `<details class="ckcard ckrules"><summary>איך משחקים דמקה? (החוקים)</summary>
<ol>
<li><b>המטרה:</b> לאכול את כל הכלים של היריב, או לחסום אותו כך שלא יוכל לזוז.</li>
<li><b>מי מתחיל:</b> מי שהזמין משחק בלבן ומתחיל. בכל תור זזים כלי אחד.</li>
<li><b>חייל רגיל:</b> זז צעד אחד באלכסון קדימה, למשבצת חומה ריקה.</li>
<li><b>אכילה:</b> קופצים מעל כלי של היריב שנמצא צמוד באלכסון, אל המשבצת הריקה שמאחוריו. החייל אוכל גם אחורה.</li>
<li><b>חובה לאכול:</b> אם אפשר לאכול, חייבים. אם יש כמה אפשרויות אכילה, בוחרים איזו שרוצים.</li>
<li><b>כמה אכילות ברצף:</b> אחרי שאכלת, אם אפשר להמשיך לאכול עם אותו כלי, חייבים להמשיך באותו תור. המשבצות המסומנות מראות לאן אפשר להמשיך.</li>
<li><b>מלך:</b> חייל שמגיע לשורה האחרונה של היריב הופך למלך (עם כתר). מלך זז באלכסון כמה משבצות שרוצה, ואוכל גם ממרחק, כל עוד המשבצת שמאחורי הכלי הנאכל ריקה.</li>
<li><b>קידום באמצע אכילה:</b> חייל שהגיע לשורה האחרונה תוך כדי אכילה הופך למלך וממשיך לאכול באותו תור.</li>
<li><b>תיקו:</b> אפשר להציע תיקו ליריב. המשחק נגמר בתיקו גם אחרי 15 מהלכים של כל שחקן שבהם רק מלכים זזו ואף אחד לא נאכל.</li>
<li><b>איך מזיזים:</b> לוחצים על הכלי ואז על המשבצת שאליה רוצים להגיע. נקודות ירוקות מראות מהלכים אפשריים, ומשבצת צהובה מסמנת כלי שחייבים לאכול איתו.</li>
</ol></details>`;
const nm = id => (byId[id] && byId[id].name) || 'שחקן';

// צלילים קטנים
let AC = null;
function beep(freq, dur, type = 'sine', vol = .15, at = 0) {
  try {
    if (localStorage.getItem('soundOff') === '1') return;
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + .02);
  } catch (_) {}
}
const sMove = () => beep(300, .09, 'triangle', .2);
const sCap = () => { beep(220, .1, 'square', .12); beep(150, .14, 'square', .12, .08); };
const sWin = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, .2, 'triangle', .18, i * .12));

/* ================= רשימה ================= */
async function showList() {
  const { data: games } = await supabase.from('checkers_games').select('*').order('updated_at', { ascending: false }).limit(30);
  const mine = games || [];
  await learn(mine);
  const active = mine.filter(g => g.status === 'invite' || g.status === 'play');
  const busyWith = new Set(active.map(g => g.white_id === me.id ? g.black_id : g.white_id));
  const others = (profiles || []).filter(p => p.is_user !== false && p.id !== me.id);
  const label = g => {
    if (g.status === 'invite') return g.white_id === me.id ? ['ממתין לאישור', ''] : ['הזמנה אליך', 'me'];
    if (g.status === 'play') { const my = (g.white_id === me.id) === (g.turn === 'w'); return my ? ['התור שלך', 'me'] : ['התור שלו/ה', '']; }
    if (g.status === 'done') return [g.result === 'draw' ? 'תיקו' : g.winner === me.id ? 'ניצחת' : 'הפסדת', ''];
    return ['בוטל', ''];
  };
  const row = g => {
    const opp = g.white_id === me.id ? g.black_id : g.white_id, [t, c] = label(g);
    return `<a class="ckrow" href="checkers.html?g=${g.id}">${avatar(byId[opp], 40)}<b>${esc(nm(opp))}</b><span class="cktag ${c}">${t}</span></a>`;
  };
  const clrAt = (() => { try { return +localStorage.getItem('clr_checkers') || 0; } catch (_) { return 0; } })();
  const done = mine.filter(g => g.status === 'done' && new Date(g.updated_at || g.created_at || 0).getTime() > clrAt).slice(0, 5);
  root.innerHTML = `
    <div class="ckcard"><h3>משחק חדש. עם מי משחקים?</h3><div class="ckpick">
      ${others.map(p => `<button class="ckp" data-id="${p.id}" type="button" ${busyWith.has(p.id) ? 'disabled style="opacity:.4"' : ''}>${avatar(p, 52)}${esc(p.name)}</button>`).join('') || '<p class="ckempty">אין עוד שחקנים</p>'}
    </div></div>
    <div class="ckcard"><h3>חבר שהוא לא מהמשפחה?</h3><button class="ckbtn" id="bGuest" type="button">הזמן אורח בקישור</button></div>
    ${active.length ? `<div class="ckcard"><h3>משחקים פעילים</h3>${active.map(row).join('')}</div>` : ''}
    ${done.length ? `<div class="ckcard"><h3>משחקים אחרונים<button class="ckclr" id="ckClr" type="button" style="border:0;background:transparent;font:inherit;font-size:13px;font-weight:700;color:inherit;opacity:.7;cursor:pointer;text-decoration:underline">נקה רשימה</button></h3>${done.map(row).join('')}</div>` : ''}${RULES}`;
  const clrB = document.getElementById('ckClr');
  if (clrB) clrB.onclick = () => { try { localStorage.setItem('clr_checkers', String(Date.now())); } catch (_) {} clrB.closest('.ckcard').remove(); };
  document.getElementById('bGuest').onclick = () => inviteGuest('checkers', d => { location.href = 'checkers.html?g=' + d.ref; });
  root.querySelectorAll('.ckp:not([disabled])').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { data, error } = await supabase.rpc('checkers_invite', { p_opp: b.dataset.id });
    if (error) { showToast(/game_exists/.test(error.message) ? 'כבר יש משחק פעיל עם השחקן הזה' : 'ההזמנה נכשלה', true); b.disabled = false; return; }
    location.href = 'checkers.html?g=' + data;
  });
}

// שמות של שחקנים שאינם ברשימה הרגילה (אורחים)
async function learn(games) {
  const miss = [...new Set(games.flatMap(g => [g.white_id, g.black_id]))].filter(id => id && !byId[id]);
  if (!miss.length) return;
  const { data } = await supabase.from('profiles').select('id,name,color').in('id', miss);
  (data || []).forEach(p => { byId[p.id] = p; });
}

/* ================= משחק ================= */
let G = null, sel = [], lastKey = '', busy = false;

async function load() {
  let data = null;
  if (GT) {
    const r = await gcall('checkers_state', {});
    data = r.data && r.data.game; if (data) { byId[data.white_id] = byId[data.white_id] || { id: data.white_id, name: r.data.white_name }; }
  } else {
    ({ data } = await supabase.from('checkers_games').select('*').eq('id', gid).maybeSingle());
    if (data) await learn([data]);
  }
  if (!data) { root.innerHTML = '<p class="ckempty">המשחק לא נמצא</p><a class="ckbtn g" style="display:block;text-align:center;text-decoration:none" href="checkers.html">חזרה</a>'; return; }
  const key = [data.status, data.board, data.turn, data.draw_offer, data.updated_at].join('|');
  const prev = G; G = data;
  if (key === lastKey) return;
  lastKey = key;
  if (prev && prev.board !== data.board) {
    sel = [];
    const mineMove = (prev.turn === 'w') === (data.white_id === me.id);
    if (!mineMove) { (counts(prev.board).w + counts(prev.board).W + counts(prev.board).b + counts(prev.board).B) !== (counts(data.board).w + counts(data.board).W + counts(data.board).b + counts(data.board).B) ? sCap() : sMove(); }
  }
  if (prev && prev.status === 'play' && data.status === 'done' && data.winner === me.id) sWin();
  render();
}

function render() {
  const g = G, iW = g.white_id === me.id, myCol = iW ? 'w' : 'b', oppId = iW ? g.black_id : g.white_id;
  const myTurn = g.status === 'play' && g.turn === myCol;
  const legal = myTurn ? legalMoves(g.board, myCol) : [];
  const last = (g.last_path || '').split(',').filter(Boolean).map(Number);
  const cand = sel.length ? legal.filter(m => sel.every((s, i) => m.path[i] === s)) : [];
  const nexts = new Set(sel.length ? cand.map(m => m.path[sel.length]).filter(v => v !== undefined) : []);
  const origins = new Set(legal.map(m => m.path[0]));
  const forcedCap = legal.some(m => m.captured.length);

  let msg = '';
  if (g.status === 'invite') msg = iW ? `ממתינים ש${nm(oppId)} יאשר/תאשר` : `${nm(oppId)} הזמין/ה אותך לשחק`;
  else if (g.status === 'play') msg = myTurn ? (sel.length ? 'בחר/י לאן ממשיכים' : forcedCap ? 'חובה לאכול!' : 'התור שלך') : `התור של ${nm(oppId)}`;
  else if (g.status === 'done') msg = g.result === 'draw' ? 'המשחק הסתיים בתיקו' : g.winner === me.id ? (g.result === 'resign' ? `${nm(oppId)} ויתר/ה. ניצחת!` : 'ניצחת! כל הכבוד') : (g.result === 'resign' ? 'ויתרת על המשחק' : `${nm(oppId)} ניצח/ה`);
  else msg = 'ההזמנה בוטלה';

  const flip = !iW;
  let cells = '';
  for (let k = 0; k < 64; k++) {
    const i = flip ? 63 - k : k, r = Math.floor(i / 8), c = i % 8, dark = (r + c) % 2 === 1, ch = g.board[i];
    const cls = ['cks', dark ? 'ckd' : 'ckl'];
    if (last.includes(i)) cls.push('last');
    if (sel.includes(i)) cls.push('sel');
    else if (myTurn && !sel.length && origins.has(i) && forcedCap) cls.push('mov');
    if (nexts.has(i)) cls.push('go');
    const pc = ch !== '.' ? `<div class="ckpc ${colorOf(ch)}">${ch === 'W' || ch === 'B' ? CROWN : ''}</div>` : '';
    cells += `<div class="${cls.join(' ')}" data-i="${i}">${pc}</div>`;
  }
  const bar = (id, mineBar) => `<div class="ckbar ${g.status === 'play' && (g.turn === (id === g.white_id ? 'w' : 'b')) ? 'turn' : ''}">${avatar(byId[id], 38)}<span>${esc(mineBar ? 'אני' : nm(id))}</span><span class="ckdot">${id === g.white_id ? 'לבן' : 'שחור'}</span></div>`;

  let btns = '';
  if (g.status === 'invite') btns = iW ? `<button class="ckbtn r" id="bCancel" type="button">בטל הזמנה</button>` : `<button class="ckbtn ok" id="bYes" type="button">בוא נשחק</button><button class="ckbtn g" id="bNo" type="button">לא עכשיו</button>`;
  else if (g.status === 'play') {
    if (g.draw_offer && g.draw_offer !== me.id) btns = `<button class="ckbtn ok" id="bDrawYes" type="button">מאשר/ת תיקו</button><button class="ckbtn g" id="bDrawNo" type="button">לא</button>`;
    else btns = `<button class="ckbtn g" id="bDraw" type="button" ${g.draw_offer === me.id ? 'disabled' : ''}>${g.draw_offer === me.id ? 'הצעת תיקו נשלחה' : 'הצע תיקו'}</button><button class="ckbtn r" id="bResign" type="button">ויתור</button>`;
  } else btns = GT ? '<p class="ckmsg">תודה ששיחקת!</p>' : `<a class="ckbtn" style="text-align:center;text-decoration:none" href="checkers.html">למשחקים</a>`;

  root.innerHTML = `${bar(oppId, false)}<div class="ckboard" id="bd">${cells}</div>${bar(me.id, true)}<div class="ckmsg">${msg}</div><div class="ckbtns">${btns}</div>${RULES}`;
  root.querySelectorAll('.cks').forEach(el => el.onclick = () => tap(+el.dataset.i));
  const $ = id => document.getElementById(id);
  const rpc = async (fn, args) => { if (busy) return; busy = true; const { error } = await call(fn, args); busy = false; if (error) showToast('הפעולה נכשלה', true); await load(); };
  if ($('bCancel')) $('bCancel').onclick = () => rpc('checkers_resign', { p_game: gid });
  if ($('bYes')) $('bYes').onclick = () => rpc('checkers_respond', { p_game: gid, p_accept: true });
  if ($('bNo')) $('bNo').onclick = async () => { await rpc('checkers_respond', { p_game: gid, p_accept: false }); location.href = 'checkers.html'; };
  if ($('bDraw')) $('bDraw').onclick = () => rpc('checkers_draw', { p_game: gid, p_action: 'offer' });
  if ($('bDrawYes')) $('bDrawYes').onclick = () => rpc('checkers_draw', { p_game: gid, p_action: 'accept' });
  if ($('bDrawNo')) $('bDrawNo').onclick = () => rpc('checkers_draw', { p_game: gid, p_action: 'decline' });
  if ($('bResign')) $('bResign').onclick = () => { if (confirm('לוותר על המשחק?')) rpc('checkers_resign', { p_game: gid }); };
}

async function tap(i) {
  const g = G; if (!g || g.status !== 'play' || busy) return;
  const myCol = g.white_id === me.id ? 'w' : 'b';
  if (g.turn !== myCol) return;
  const legal = legalMoves(g.board, myCol);
  const origins = new Set(legal.map(m => m.path[0]));
  if (!sel.length || (sel.length === 1 && origins.has(i))) {
    if (origins.has(i)) { sel = [i]; render(); }
    else if (colorOf(g.board[i]) === myCol && legal.some(m => m.captured.length)) showToast('חובה לאכול');
    else { sel = []; render(); }
    return;
  }
  const cand = legal.filter(m => sel.every((s, k) => m.path[k] === s));
  if (!cand.some(m => m.path[sel.length] === i)) { sel = []; render(); return; }
  sel = sel.concat(i);
  const next = cand.filter(m => m.path[sel.length - 1] === i);
  const done = next.find(m => m.path.length === sel.length);
  if (!done) { render(); return; }
  // המהלך הושלם
  const { board, reset } = applyMove(g.board, done);
  const oppCol = myCol === 'w' ? 'b' : 'w';
  const quiet = reset ? 0 : (g.quiet || 0) + 1;
  let result = null;
  if (!legalMoves(board, oppCol).length) result = 'win'; else if (quiet >= 30) result = 'draw';
  const path = done.path.join(',');
  busy = true;
  (done.captured.length ? sCap : sMove)();
  G = { ...g, board, turn: oppCol, last_path: path, quiet, draw_offer: null, status: result ? 'done' : 'play', winner: result === 'win' ? me.id : null, result };
  sel = []; render();
  const { error } = await call('checkers_move', { p_game: gid, p_board: board, p_path: path, p_quiet: quiet, p_result: result });
  busy = false;
  if (error) showToast('המהלך לא נשמר. נסו שוב', true);
  else if (result === 'win') sWin();
  lastKey = ''; await load();
}

/* ================= הפעלה ================= */
if (!gid) await showList();
else {
  await load();
  setInterval(() => { if (!busy && !document.hidden) load(); }, 3500);
  if (!GT) supabase.channel('ck-' + gid).on('postgres_changes', { event: '*', schema: 'public', table: 'checkers_games', filter: 'id=eq.' + gid }, () => { if (!busy) load(); }).subscribe();
}
