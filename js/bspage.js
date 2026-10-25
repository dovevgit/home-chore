import { initPage, supabase, esc, avatar, showToast } from './common.js';
import { guestToken, guestMode, inviteGuest } from './guest.js';

/* ================= הכנה: בן משפחה או אורח ================= */
const GT = guestToken();
let profiles = [], me, gid = new URLSearchParams(location.search).get('g'), gcall = null;
if (GT) { const g = await guestMode('bs', GT); me = g.me; gid = g.ref; gcall = g.call; }
else {
  const r = await initPage({ active: 'games', title: 'צוללות' });
  profiles = r.profiles || [];
  me = profiles.find(p => p.id === r.session.user.id) || { id: r.session.user.id, name: '' };
}
const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
byId[me.id] = byId[me.id] || me;
const root = document.getElementById('bs');
const call = (fn, args) => GT ? gcall(fn, args) : supabase.rpc(fn, args);
const nm = id => (byId[id] && byId[id].name) || 'שחקן';

const N = 10, HEB = 'אבגדהוזחטי'.split('');
const SHIPS = [['נושאת מטוסים', 5], ['סיירת', 4], ['משחתת', 3], ['צוללת', 3], ['סירת טורפדו', 2]];

const RULES = `<details class="bscard bsrules"><summary>איך משחקים צוללות? (החוקים)</summary>
<ol>
<li><b>המטרה:</b> להטביע את כל הספינות של היריב לפני שהוא מטביע את שלך.</li>
<li><b>הצי:</b> לכל שחקן 5 ספינות על לוח של 10×10: נושאת מטוסים (5 משבצות), סיירת (4), משחתת (3), צוללת (3) וסירת טורפדו (2).</li>
<li><b>סידור הצי:</b> בוחרים ספינה, לוחצים על משבצת כדי להניח אותה, ולוחצים על "סובב" כדי להפוך אותה בין אופקי לאנכי. אפשר גם ללחוץ "ערבב" והמחשב מסדר לבד. ספינות לא יכולות לחפוף. הצי של כל שחקן נסתר מהיריב.</li>
<li><b>הקרב:</b> כשהשניים מוכנים, מי שהזמין מתחיל. בכל תור לוחצים על משבצת במכ"ם של היריב כדי לירות.</li>
<li><b>פגיעה:</b> אם פגעת (אש) או הטבעת ספינה, ממשיכים לירות.</li>
<li><b>החטאה:</b> אם החטאת (עיגול לבן), התור עובר ליריב.</li>
<li><b>הטבעה:</b> כשפגעת בכל המשבצות של ספינה, היא טובעת ומופיעה על המכ"ם בצורתה.</li>
<li><b>ניצחון:</b> מי שהטביע את כל 5 הספינות של היריב מנצח. אפשר גם לוותר באמצע.</li>
</ol></details>`;

/* ================= צלילים ================= */
let AC = null;
const soundOn = () => { try { return localStorage.getItem('soundOff') !== '1'; } catch (_) { return true; } };
function ac() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (_) {} return AC; }
function tone(f, d, type = 'sine', v = .18, at = 0, slide = 0) {
  if (!soundOn()) return; const a = ac(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
function noise(d, v = .2, at = 0, lp = 1200) {
  if (!soundOn()) return; const a = ac(); if (!a) return;
  const n = a.sampleRate * d, b = a.createBuffer(1, n, a.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = lp; s.buffer = b; g.gain.value = v; s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + at);
}
const sfx = {
  fire: () => tone(700, .25, 'sawtooth', .08, 0, -520),
  miss: () => { noise(.35, .16, .12, 900); tone(260, .3, 'sine', .1, .12, -140); },
  hit: () => { noise(.5, .35, .1, 1800); tone(120, .5, 'square', .16, .1, -70); },
  sunk: () => { noise(.8, .4, .05, 1400); [392, 330, 262, 196].forEach((f, i) => tone(f, .28, 'triangle', .2, .2 + i * .17)); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .24, 'triangle', .2, i * .13)),
  lose: () => [330, 294, 262, 196].forEach((f, i) => tone(f, .35, 'sawtooth', .1, i * .22)),
  ping: () => tone(1100, .12, 'sine', .08)
};
const playRes = r => (r === 'sunk' ? sfx.sunk : r === 'hit' ? sfx.hit : sfx.miss)();

/* ================= ציור לוחות וספינות ================= */
function shipSvg(name, len, horizontal) {
  const W = len * 100, L = len;
  const hull = '#33475b', deck = '#6f8aa6', light = '#cfe3f5', rust = '#9a3b2f';
  let h = '', top = '', fire = [], smoke = [];
  if (name === 'צוללת') {
    h = `<path d="M10 64 Q10 46 44 46 H${W - 44} Q${W - 8} 46 ${W - 8} 64 Q${W - 8} 82 ${W - 44} 82 H44 Q10 82 10 64Z" fill="${hull}"/><path d="M26 56 H${W - 30}" stroke="${deck}" stroke-width="3" stroke-linecap="round"/>`;
    top = `<rect x="${W * .42}" y="20" width="50" height="30" rx="9" fill="${deck}"/><rect x="${W * .42 + 8}" y="26" width="10" height="8" rx="2" fill="${light}"/><path d="M${W * .42 + 36} 20 V6 H${W * .42 + 52}" stroke="${deck}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    fire = [W * .42 + 24]; smoke = [W * .42 + 24];
  } else {
    h = `<path d="M8 52 H${W - 26} L${W - 4} 38 L${W - 32} 86 H24 Z" fill="${hull}"/><path d="M12 56 H${W - 28}" stroke="${deck}" stroke-width="3" stroke-linecap="round"/>`;
    for (let i = 0; i < L * 2 - 1; i++) h += `<circle cx="${40 + i * ((W - 110) / (L * 2 - 2 || 1))}" cy="68" r="4" fill="${light}" opacity=".7"/>`;
    if (name === 'נושאת מטוסים') {
      top = `<rect x="14" y="36" width="${W - 54}" height="16" rx="3" fill="#55697d"/><path d="M30 44 H${W - 60}" stroke="#fff" stroke-width="3" stroke-dasharray="14 12" opacity=".75"/><rect x="${W * .66}" y="8" width="46" height="30" rx="4" fill="${deck}"/><rect x="${W * .66 + 8}" y="14" width="30" height="8" fill="${light}"/><path d="M${W * .66 + 36} 8 V-6" stroke="${deck}" stroke-width="3"/>`;
      fire = [W * .3, W * .55, W * .8]; smoke = [W * .3, W * .55];
    } else if (name === 'סיירת') {
      top = `<rect x="${W * .52}" y="18" width="78" height="34" rx="5" fill="${deck}"/><rect x="${W * .52 + 10}" y="25" width="58" height="8" fill="${light}"/><rect x="${W * .26}" y="14" width="24" height="38" rx="4" fill="${rust}"/><rect x="${W * .26}" y="10" width="24" height="8" rx="3" fill="#1a1a1a"/><rect x="${W * .39}" y="20" width="24" height="32" rx="4" fill="${rust}"/><rect x="${W * .39}" y="16" width="24" height="8" rx="3" fill="#1a1a1a"/><rect x="${W - 96}" y="38" width="30" height="14" rx="4" fill="${deck}"/><path d="M${W - 70} 44 H${W - 44}" stroke="${deck}" stroke-width="5" stroke-linecap="round"/>`;
      fire = [W * .39 + 12, W * .7]; smoke = [W * .26 + 12, W * .39 + 12];
    } else if (name === 'משחתת') {
      top = `<rect x="${W * .5}" y="22" width="64" height="30" rx="5" fill="${deck}"/><rect x="${W * .5 + 8}" y="28" width="46" height="8" fill="${light}"/><path d="M${W * .5 + 32} 22 V4" stroke="${deck}" stroke-width="3"/><rect x="${W * .26}" y="18" width="22" height="34" rx="4" fill="${rust}"/><rect x="${W * .26}" y="14" width="22" height="8" rx="3" fill="#1a1a1a"/><rect x="${W - 90}" y="38" width="28" height="14" rx="4" fill="${deck}"/><path d="M${W - 66} 44 H${W - 42}" stroke="${deck}" stroke-width="5" stroke-linecap="round"/>`;
      fire = [W * .26 + 11, W * .66]; smoke = [W * .26 + 11, W * .5 + 30];
    } else {
      top = `<rect x="${W * .4}" y="26" width="52" height="26" rx="6" fill="${deck}"/><rect x="${W * .4 + 8}" y="32" width="34" height="8" fill="${light}"/><rect x="${W - 74}" y="40" width="22" height="12" rx="3" fill="${deck}"/><path d="M${W - 54} 46 H${W - 32}" stroke="${deck}" stroke-width="4" stroke-linecap="round"/>`;
      fire = [W * .4 + 26]; smoke = [W * .4 + 26];
    }
  }
  const flames = fire.map(x => `<g class="fl"><path d="M${x - 14} 52 C${x - 18} 34 ${x - 4} 30 ${x - 6} 14 C${x + 4} 24 ${x + 18} 34 ${x + 14} 52Z" fill="#ff7a1a"/><path d="M${x - 7} 52 C${x - 9} 42 ${x} 38 ${x} 28 C${x + 6} 36 ${x + 10} 42 ${x + 7} 52Z" fill="#ffd23f"/></g>`).join('');
  const puffs = smoke.map(x => `<circle class="smk" cx="${x}" cy="10" r="13" fill="#222" opacity=".6"/><circle class="smk" cx="${x + 10}" cy="4" r="10" fill="#444" opacity=".5"/>`).join('');
  const g = `<g transform="rotate(5 ${W / 2} 58)">${h}${top}${flames}${puffs}</g>`;
  const ripple = (y0, ln) => { let d = `M0 ${y0}`; const step = 25; for (let x = 0; x < ln; x += step) d += ` q ${step / 4} -9 ${step / 2} 0 t ${step / 2} 0`; return d; };
  if (horizontal) {
    return `<svg viewBox="0 0 ${W} 100" preserveAspectRatio="none" aria-hidden="true">${g}<path d="${ripple(74, W)} V100 H0 Z" fill="#1b6aa6" opacity=".72"/><path d="${ripple(80, W)} V100 H0 Z" fill="#0f4f86" opacity=".55"/></svg>`;
  }
  const wy = W * .68;
  return `<svg viewBox="0 0 100 ${W}" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(112 0) rotate(90)">${g}</g><path d="${ripple(wy, 100)} V${W} H0 Z" fill="#1b6aa6" opacity=".72"/><path d="${ripple(wy + 12, 100)} V${W} H0 Z" fill="#0f4f86" opacity=".55"/></svg>`;
}

// cfg: {ships:[{i,cells}] שלי/מוסתר, shots:'..mh..', sunk:[{i,cells}], click, selected:Set, bad:Set, lastIdx}
function drawBoard(host, cfg) {
  host.innerHTML = '';
  const cols = document.createElement('div'); cols.className = 'bslab bscols'; HEB.forEach(h => cols.insertAdjacentHTML('beforeend', `<span>${h}</span>`));
  const rows = document.createElement('div'); rows.className = 'bslab bsrows'; for (let i = 1; i <= N; i++) rows.insertAdjacentHTML('beforeend', `<span>${i}</span>`);
  const bd = document.createElement('div'); bd.className = 'bsboard';
  const shipAt = new Map();
  (cfg.ships || []).forEach(s => s.cells.forEach((c, k) => shipAt.set(c, { s, k })));
  const sunkCells = new Set((cfg.sunk || []).flatMap(s => s.cells));
  for (let i = 0; i < 100; i++) {
    const e = document.createElement('button'); e.type = 'button'; e.className = 'bsc'; e.setAttribute('aria-label', `${HEB[i % N]}${Math.floor(i / N) + 1}`);
    const sh = cfg.shots ? cfg.shots[i] : '.';
    const sp = shipAt.get(i);
    if (sunkCells.has(i)) e.classList.add('sunkw');
    else if (sp && sh !== 'h') {
      const h = sp.s.cells.length < 2 || sp.s.cells[1] - sp.s.cells[0] === 1;
      e.classList.add('ship', h ? 's-h' : 's-v'); if (sp.k === 0) e.classList.add('s-a'); if (sp.k === sp.s.cells.length - 1) e.classList.add('s-z');
    }
    if (sh === 'm') e.classList.add('miss');
    if (sh === 'h' && !sunkCells.has(i)) e.classList.add('hit');
    if (cfg.selected && cfg.selected.has(i)) e.classList.add('sel');
    if (cfg.bad && cfg.bad.has(i)) e.classList.add('bad');
    if (cfg.click && sh === '.' ) { e.classList.add('fresh'); }
    if (cfg.click) e.onclick = () => cfg.click(i);
    if (cfg.lastIdx === i) e.classList.add('pop');
    bd.append(e);
  }
  if (cfg.sunk && cfg.sunk.length) {
    const ly = document.createElement('div'); ly.className = 'bslayer';
    cfg.sunk.forEach(x => {
      const horizontal = x.cells.length < 2 || x.cells[1] - x.cells[0] === 1, r = Math.floor(x.cells[0] / N), c = x.cells[0] % N, w = document.createElement('div');
      w.className = 'bswreck'; w.style.gridColumn = `${c + 1} / span ${horizontal ? x.cells.length : 1}`; w.style.gridRow = `${r + 1} / span ${horizontal ? 1 : x.cells.length}`;
      w.innerHTML = shipSvg(SHIPS[x.i][0], x.cells.length, horizontal); ly.append(w);
    });
    bd.append(ly);
  }
  if (cfg.radar) { const sw = document.createElement('div'); sw.className = 'bssweep'; bd.append(sw); }
  host.append(cols, rows, bd);
}
const chips = (list, extra = {}) => list.map(c => `<span class="bssh ${c.dead ? 'dead' : ''}">${Array.from({ length: c.len }, () => '<i></i>').join('')} ${c.name}</span>`).join('');

function confetti() {
  const cs = ['#ffc93c', '#ff5a3c', '#12b5a6', '#6c5ce7', '#2b97dd', '#e8559b'];
  for (let i = 0; i < 90; i++) { const e = document.createElement('i'); e.className = 'bsconf'; e.style.left = Math.random() * 100 + 'vw'; e.style.background = cs[i % cs.length];
    e.style.animationDuration = 2 + Math.random() * 2.2 + 's'; e.style.animationDelay = Math.random() * .6 + 's'; document.body.append(e); setTimeout(() => e.remove(), 5200); }
}

/* ================= רשימה ================= */
async function learn(games) {
  const miss = [...new Set(games.flatMap(g => [g.a_id, g.b_id]))].filter(id => id && !byId[id]);
  if (!miss.length) return;
  const { data } = await supabase.from('profiles').select('id,name,color').in('id', miss);
  (data || []).forEach(p => { byId[p.id] = p; });
}
async function showList() {
  const { data: games } = await supabase.from('bs_games').select('*').order('updated_at', { ascending: false }).limit(30);
  const mine = games || []; await learn(mine);
  const active = mine.filter(g => ['invite', 'setup', 'play'].includes(g.status));
  const busyWith = new Set(active.map(g => g.a_id === me.id ? g.b_id : g.a_id));
  const others = profiles.filter(p => p.is_user !== false && p.id !== me.id);
  const label = g => {
    const iA = g.a_id === me.id;
    if (g.status === 'invite') return iA ? ['ממתין לאישור', ''] : ['הזמנה אליך', 'me'];
    if (g.status === 'setup') { const ready = iA ? g.ready_a : g.ready_b; return ready ? ['מחכים ליריב', ''] : ['סדר את הצי', 'me']; }
    if (g.status === 'play') return g.turn === (iA ? 'a' : 'b') ? ['התור שלך', 'me'] : ['התור שלו/ה', ''];
    if (g.status === 'done') return [g.winner === me.id ? 'ניצחת' : 'הפסדת', ''];
    return ['בוטל', ''];
  };
  const row = g => { const opp = g.a_id === me.id ? g.b_id : g.a_id, [t, c] = label(g);
    return `<a class="bsrow" href="battleship.html?g=${g.id}">${avatar(byId[opp], 40)}<b>${esc(nm(opp))}</b><span class="bstag ${c}">${t}</span></a>`; };
  const done = mine.filter(g => g.status === 'done').slice(0, 5);
  root.innerHTML = `
    <div class="bscard"><h3>משחק חדש. עם מי משחקים?</h3><div class="bspick">
      ${others.map(p => `<button class="bsp" data-id="${p.id}" type="button" ${busyWith.has(p.id) ? 'disabled style="opacity:.4"' : ''}>${avatar(p, 52)}${esc(p.name)}</button>`).join('') || '<p>אין עוד שחקנים</p>'}
    </div></div>
    <div class="bscard"><h3>חבר שהוא לא מהמשפחה?</h3><button class="bsbtn" id="bGuest" type="button" style="width:100%">הזמן אורח בקישור</button></div>
    ${active.length ? `<div class="bscard"><h3>משחקים פעילים</h3>${active.map(row).join('')}</div>` : ''}
    ${done.length ? `<div class="bscard"><h3>משחקים אחרונים</h3>${done.map(row).join('')}</div>` : ''}${RULES}`;
  document.getElementById('bGuest').onclick = () => inviteGuest('bs', d => { location.href = 'battleship.html?g=' + d.ref; });
  root.querySelectorAll('.bsp:not([disabled])').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { data, error } = await supabase.rpc('bs_invite', { p_opp: b.dataset.id });
    if (error) { showToast(/game_exists/.test(error.message) ? 'כבר יש משחק פעיל עם השחקן הזה' : 'ההזמנה נכשלה', true); b.disabled = false; return; }
    location.href = 'battleship.html?g=' + data;
  });
}

/* ================= משחק ================= */
let G = null, FLEET = null, lastKey = '', busy = false;
let plc = [null, null, null, null, null], selShip = 0, orient = [true, true, true, true, true], bad = new Set(), placedSent = false;

async function load() {
  let data = null, fleet = null;
  if (GT) {
    const r = await gcall('bs_state', {});
    if (r.data && r.data.game) { data = r.data.game; fleet = r.data.my_fleet; byId[data.a_id] = byId[data.a_id] || { id: data.a_id, name: r.data.a_name }; }
  } else {
    ({ data } = await supabase.from('bs_games').select('*').eq('id', gid).maybeSingle());
    if (data) {
      await learn([data]);
      const sd = data.a_id === me.id ? 'a' : 'b';
      ({ data: fleet } = await supabase.from('bs_fleets').select('fleet').eq('game_id', gid).eq('side', sd).maybeSingle());
      fleet = fleet ? fleet.fleet : null;
    }
  }
  if (!data) { root.innerHTML = '<p class="bsempty">המשחק לא נמצא</p><a class="bsbtn g" href="battleship.html">חזרה</a>'; return; }
  const key = [data.status, data.turn, data.updated_at, data.ready_a, data.ready_b].join('|');
  const prev = G; G = data; FLEET = fleet;
  if (key === lastKey) return;
  lastKey = key;
  const sd = data.a_id === me.id ? 'a' : 'b';
  if (prev && prev.updated_at !== data.updated_at && data.last_by && data.last_by !== sd && data.last_idx !== prev.last_idx) playRes(data.last_res);
  if (prev && prev.status !== 'done' && data.status === 'done') { data.winner === me.id ? sfx.win() : (data.result === 'resign' ? 0 : sfx.lose()); }
  render();
}

const fleetFromString = f => {
  const ships = [];
  for (let k = 0; k < 5; k++) { const cells = []; for (let i = 0; i < 100; i++) if (f[i] === String(k)) cells.push(i); if (cells.length) ships.push({ i: k, cells }); }
  return ships;
};
const cellsOf = (r, c, len, h) => Array.from({ length: len }, (_, k) => h ? r * N + c + k : (r + k) * N + c);
function randomPlacement() {
  const taken = new Set(), out = [];
  SHIPS.forEach(([_, len], k) => {
    for (let t = 0; t < 500; t++) {
      const h = Math.random() < .5, r = Math.floor(Math.random() * (h ? N : N - len + 1)), c = Math.floor(Math.random() * (h ? N - len + 1 : N));
      const cells = cellsOf(r, c, len, h); if (cells.some(i => taken.has(i))) continue;
      cells.forEach(i => taken.add(i)); out[k] = { r, c, h }; return;
    }
  });
  return out;
}
const placedCells = k => plc[k] ? cellsOf(plc[k].r, plc[k].c, SHIPS[k][1], plc[k].h) : [];
const plcString = () => { const a = Array(100).fill('.'); for (let k = 0; k < 5; k++) placedCells(k).forEach(i => a[i] = String(k)); return a.join(''); };

function render() {
  const g = G, iA = g.a_id === me.id, sd = iA ? 'a' : 'b', oppId = iA ? g.b_id : g.a_id;
  const ready = iA ? g.ready_a : g.ready_b;
  const bar = `<div class="bsbar">${avatar(byId[oppId], 38)}<span>${esc(nm(oppId))}</span><span style="margin-inline-start:auto;font-size:13px;opacity:.85;font-weight:600">${g.status === 'play' ? 'בקרב' : g.status === 'setup' ? 'סידור צי' : ''}</span></div>`;
  let html = '', after = null;

  if (g.status === 'invite') {
    html = `${bar}<div class="bsbanner them">${iA ? `ממתינים ש${esc(nm(oppId))} יאשר/תאשר` : `${esc(nm(oppId))} הזמין/ה אותך לצוללות`}</div>
      <div class="bsbtns">${iA ? '<button class="bsbtn r" id="bCancel" type="button">בטל הזמנה</button>' : '<button class="bsbtn go" id="bYes" type="button">בוא נשחק</button><button class="bsbtn g" id="bNo" type="button">לא עכשיו</button>'}</div>${RULES}`;
    after = () => {
      bind('bCancel', () => act('bs_resign', { p_game: gid }));
      bind('bYes', () => act('bs_respond', { p_game: gid, p_accept: true }));
      bind('bNo', async () => { await act('bs_respond', { p_game: gid, p_accept: false }); location.href = 'battleship.html'; });
    };
  } else if (g.status === 'setup') {
    if (ready) {
      html = `${bar}<div class="bsbanner them">הצי שלך מוכן. ממתינים ש${esc(nm(oppId))} יסיים לסדר</div>
        <div class="bscard"><h2>הצי שלך</h2><div class="bswrap" id="myB"></div></div><div class="bsbtns"><button class="bsbtn r" id="bResign" type="button">ויתור</button></div>${RULES}`;
      after = () => { drawBoard(document.getElementById('myB'), { ships: fleetFromString(FLEET || plcString()) }); bind('bResign', resign); };
    } else {
      const all = plc.every(Boolean), selSet = new Set(placedCells(selShip));
      html = `${bar}<div class="bsbanner you">סדרו את הצי שלכם</div>
        <div class="bscard"><h2>הצי שלך <small>בחרו ספינה ולחצו על משבצת</small></h2><div class="bswrap" id="myB"></div>
          <div class="bsfleet" id="chips">${SHIPS.map(([n, l], k) => `<button type="button" class="bssh ${k === selShip ? 'on' : ''} ${plc[k] ? 'done' : ''}" data-k="${k}">${Array.from({ length: l }, () => '<i></i>').join('')} ${n}${plc[k] ? ' ✓' : ''}</button>`).join('')}</div>
        </div>
        <div class="bsbtns"><button class="bsbtn g" id="bRot" type="button">סובב</button><button class="bsbtn g" id="bShuf" type="button">ערבב</button><button class="bsbtn g" id="bClr" type="button">אפס</button></div>
        <div class="bsbtns"><button class="bsbtn go" id="bReady" type="button" ${all ? '' : 'disabled'}>מוכן, לקרב!</button></div>${RULES}`;
      after = () => {
        const mineShips = plc.map((p, k) => p ? { i: k, cells: placedCells(k) } : null).filter(Boolean);
        drawBoard(document.getElementById('myB'), { ships: mineShips, selected: selSet, bad, click: placeAt });
        document.querySelectorAll('#chips .bssh').forEach(b => b.onclick = () => { selShip = +b.dataset.k; render(); });
        bind('bRot', rotate);
        bind('bShuf', () => { sfx.ping(); plc = randomPlacement(); orient = plc.map(p => p.h); selShip = 0; bad = new Set(); render(); });
        bind('bClr', () => { plc = [null, null, null, null, null]; selShip = 0; bad = new Set(); render(); });
        bind('bReady', async () => {
          if (busy) return; busy = true; ac(); sfx.ping();
          const { error } = await call('bs_place', { p_game: gid, p_fleet: plcString() });
          busy = false; if (error) showToast('שמירת הצי נכשלה, נסו שוב', true);
          lastKey = ''; await load();
        });
      };
    }
  } else {
    // play / done
    const myShots = sd === 'a' ? g.shots_a : g.shots_b, theirShots = sd === 'a' ? g.shots_b : g.shots_a, sunkEnemy = sd === 'a' ? g.sunk_a : g.sunk_b;
    const myShips = fleetFromString(FLEET || '.'.repeat(100));
    const mySunk = myShips.filter(s => s.cells.every(c => theirShots[c] === 'h'));
    const myTurn = g.status === 'play' && g.turn === sd;
    const sunkIdx = new Set((sunkEnemy || []).map(s => s.i)), mySunkIdx = new Set(mySunk.map(s => s.i));
    const lastMine = g.last_by === sd;
    let bn = '', cls = 'them';
    if (g.status === 'done') {
      cls = 'end';
      bn = g.result === 'resign' ? (g.winner === me.id ? `${esc(nm(oppId))} ויתר/ה. ניצחת!` : 'ויתרת על המשחק') : (g.winner === me.id ? 'ניצחת! הטבעת את כל הצי' : `${esc(nm(oppId))} ניצח/ה`);
    } else if (!g.last_res) { bn = myTurn ? 'התור שלך. כוון ויריה!' : `התור של ${esc(nm(oppId))}`; cls = myTurn ? 'you' : 'them'; }
    else if (lastMine) {
      if (g.last_res === 'miss') { bn = `פספסת. התור של ${esc(nm(oppId))}`; cls = 'splash'; }
      else if (g.last_res === 'hit') { bn = 'פגיעה! יורים שוב'; cls = 'boom'; }
      else { bn = 'הטבעת ספינה! יורים שוב'; cls = 'boom'; }
    } else {
      if (g.last_res === 'miss') { bn = `${esc(nm(oppId))} פספס/ה. התור שלך!`; cls = 'you'; }
      else if (g.last_res === 'hit') { bn = `${esc(nm(oppId))} פגע/ה בספינה שלך`; cls = 'boom'; }
      else { bn = `${esc(nm(oppId))} הטביע/ה ספינה שלך`; cls = 'boom'; }
    }
    html = `${bar}<div class="bsbanner ${cls}">${bn}</div>
      <div class="bscard"><h2>המכ"ם של ${esc(nm(oppId))} <small>${5 - sunkIdx.size} ספינות עוד צפות</small></h2><div class="bswrap" id="enB"></div>
        <div class="bsfleet">${chips(SHIPS.map(([name, len], k) => ({ name, len, dead: sunkIdx.has(k) })))}</div></div>
      <div class="bscard"><h2>הצי שלך <small>${5 - mySunkIdx.size} ספינות</small></h2><div style="max-width:280px;margin:0 auto"><div class="bswrap" id="myB"></div></div></div>
      ${g.status === 'play' ? '<div class="bsbtns"><button class="bsbtn r" id="bResign" type="button">ויתור</button></div>' : (GT ? '<p class="bsmsg">תודה ששיחקת!</p>' : '<div class="bsbtns"><a class="bsbtn" href="battleship.html">למשחקים</a></div>')}${RULES}`;
    after = () => {
      drawBoard(document.getElementById('enB'), { shots: myShots, sunk: sunkEnemy, radar: true, click: myTurn ? fireAt : null, lastIdx: lastMine ? g.last_idx : null });
      drawBoard(document.getElementById('myB'), { ships: myShips, shots: theirShots, sunk: mySunk, lastIdx: !lastMine ? g.last_idx : null });
      bind('bResign', resign);
      if (g.status === 'done' && !document.getElementById('bsOver')) showOver(g.winner === me.id, g.result === 'resign');
    };
  }
  root.innerHTML = html; if (after) after();
}
function bind(id, fn) { const e = document.getElementById(id); if (e) e.onclick = fn; }
async function act(fn, args) {
  if (busy) return; busy = true;
  const { error } = await call(fn, args); busy = false;
  if (error) showToast('הפעולה נכשלה', true);
  lastKey = ''; await load();
}
function resign() { if (confirm('לוותר על המשחק?')) act('bs_resign', { p_game: gid }); }

function placeAt(i) {
  const k = selShip, len = SHIPS[k][1];
  // לחיצה על ספינה שכבר מונחת בוחרת אותה
  const hit = plc.findIndex((p, j) => p && placedCells(j).includes(i));
  if (hit >= 0 && hit !== k) { selShip = hit; render(); return; }
  let h = plc[k] ? plc[k].h : orient[k], r = Math.floor(i / N), c = i % N;
  if (h) c = Math.min(c, N - len); else r = Math.min(r, N - len);
  const cells = cellsOf(r, c, len, h), others = new Set(plc.flatMap((p, j) => j !== k && p ? placedCells(j) : []));
  if (cells.some(x => others.has(x))) { bad = new Set(cells); showToast('הספינות לא יכולות לחפוף', true); render(); setTimeout(() => { bad = new Set(); render(); }, 450); return; }
  plc[k] = { r, c, h }; orient[k] = h; bad = new Set(); sfx.ping();
  const next = plc.findIndex(p => !p); if (next >= 0) selShip = next;
  render();
}
function rotate() {
  const k = selShip, len = SHIPS[k][1], p = plc[k];
  if (!p) { orient[k] = !orient[k]; render(); return; }
  const h = !p.h; let r = p.r, c = p.c;
  if (h) c = Math.min(c, N - len); else r = Math.min(r, N - len);
  const cells = cellsOf(r, c, len, h), others = new Set(plc.flatMap((q, j) => j !== k && q ? placedCells(j) : []));
  if (cells.some(x => others.has(x))) { showToast('אין מקום לסובב כאן', true); return; }
  plc[k] = { r, c, h }; orient[k] = h; render();
}
async function fireAt(i) {
  if (busy || !G || G.status !== 'play') return;
  const sd = G.a_id === me.id ? 'a' : 'b'; if (G.turn !== sd) return;
  const mine = sd === 'a' ? G.shots_a : G.shots_b; if (mine[i] !== '.') return;
  busy = true; ac(); sfx.fire();
  const { data, error } = await call('bs_fire', { p_game: gid, p_idx: i });
  busy = false;
  if (error) { showToast(/not_your_turn/.test(error.message) ? 'עדיין לא התור שלך' : 'הירייה נכשלה, נסו שוב', true); lastKey = ''; await load(); return; }
  const res = GT ? data : data;
  setTimeout(() => playRes(res && res.res), 150);
  if (res && res.done) setTimeout(() => { sfx.win(); }, 900);
  lastKey = ''; await load();
}
function showOver(win, resigned) {
  const o = document.createElement('div'); o.className = 'bsover'; o.id = 'bsOver';
  o.innerHTML = `<div class="bsbox"><div class="bsbig">${win ? '🏆' : '🌊'}</div><h2>${win ? 'ניצחת!' : 'הפסדת'}</h2>
    <p>${win ? (resigned ? 'היריב ויתר' : 'הטבעת את כל הצי של היריב') : (resigned ? 'ויתרת על המשחק' : 'כל הספינות שלך טבעו')}</p>
    <button class="bsbtn go" id="bsOk" type="button" style="width:100%">סגור</button></div>`;
  document.body.append(o); document.getElementById('bsOk').onclick = () => o.remove();
  if (win) confetti();
}

/* ================= הפעלה ================= */
if (!gid) await showList();
else {
  await load();
  setInterval(() => { if (!busy && !document.hidden) load(); }, 2800);
  if (!GT) supabase.channel('bs-' + gid).on('postgres_changes', { event: '*', schema: 'public', table: 'bs_games', filter: 'id=eq.' + gid }, () => { if (!busy) load(); }).subscribe();
}
