import { initPage, supabase, esc, avatar, showToast } from './common.js';
import { guestToken, guestMode, inviteGuest } from './guest.js';

const ICO={
 'חי':`<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><path d="M10 26 L14 6 L28 17Z" fill="#FF9F43"/><path d="M54 26 L50 6 L36 17Z" fill="#FF9F43"/><path d="M13 14 L15 9 L22 15Z" fill="#FFC9A0"/><path d="M51 14 L49 9 L42 15Z" fill="#FFC9A0"/><ellipse cx="32" cy="37" rx="24" ry="21" fill="#FFB35C"/><ellipse cx="32" cy="46" rx="11" ry="8" fill="#FFE2C2"/><circle cx="23" cy="34" r="4" fill="#2B2A4C"/><circle cx="41" cy="34" r="4" fill="#2B2A4C"/><circle cx="24.4" cy="32.6" r="1.4" fill="#fff"/><circle cx="42.4" cy="32.6" r="1.4" fill="#fff"/><path d="M29 41 h6 l-3 3.4z" fill="#E8567A"/><path d="M32 44.4 v2.2 M32 46.6 q-3 3 -6 1 M32 46.6 q3 3 6 1" stroke="#2B2A4C" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M8 40 h10 M8 45 l9 -2 M56 40 h-10 M56 45 l-9 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="43" r="4" fill="#FF8FA3" opacity=".55"/><circle cx="48" cy="43" r="4" fill="#FF8FA3" opacity=".55"/></svg>`,
 'צומח':`<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><path d="M32 60 V34" stroke="#2E9E5B" stroke-width="4" stroke-linecap="round"/><path d="M32 52 C20 52 14 44 14 38 C26 38 32 44 32 52Z" fill="#4CCB7C"/><path d="M32 46 C44 46 50 38 50 32 C38 32 32 38 32 46Z" fill="#3DBE6B"/><g fill="#FF7BAC"><circle cx="32" cy="12" r="8"/><circle cx="43" cy="19" r="8"/><circle cx="39" cy="31" r="8"/><circle cx="25" cy="31" r="8"/><circle cx="21" cy="19" r="8"/></g><circle cx="32" cy="22" r="8.5" fill="#FFD23F"/><circle cx="29.5" cy="21" r="1.5" fill="#2B2A4C"/><circle cx="35.5" cy="21" r="1.5" fill="#2B2A4C"/><path d="M29.5 25 q2.5 2.5 5 0" stroke="#2B2A4C" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
 'דומם':`<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><path d="M20 8 H44 a4 4 0 0 1 4 4 V34 H16 V12 a4 4 0 0 1 4 -4Z" fill="#6AA6FF"/><rect x="12" y="32" width="40" height="11" rx="5" fill="#3B82F6"/><rect x="15" y="43" width="6" height="16" rx="3" fill="#2F5FC4"/><rect x="43" y="43" width="6" height="16" rx="3" fill="#2F5FC4"/><circle cx="26" cy="20" r="2.6" fill="#2B2A4C"/><circle cx="38" cy="20" r="2.6" fill="#2B2A4C"/><path d="M27.5 26 q4.5 4.5 9 0" stroke="#2B2A4C" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="21" cy="25" r="2.6" fill="#FF8FA3" opacity=".6"/><circle cx="43" cy="25" r="2.6" fill="#FF8FA3" opacity=".6"/></svg>`,
 'ארץ':`<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="#4FA8FF"/><path d="M14 22 C18 12 30 12 32 18 C34 24 26 26 24 32 C22 38 14 36 14 30Z" fill="#5BD08A"/><path d="M38 34 C46 30 54 34 52 42 C50 50 42 54 38 48 C34 44 34 38 38 34Z" fill="#5BD08A"/><path d="M40 12 C46 12 50 16 48 20 C44 20 40 18 40 12Z" fill="#5BD08A"/><ellipse cx="22" cy="20" rx="6" ry="3.6" fill="#fff" opacity=".45" transform="rotate(-30 22 20)"/><circle cx="26" cy="38" r="2.4" fill="#2B2A4C"/><circle cx="38" cy="26" r="2.4" fill="#2B2A4C"/><path d="M24 46 q8 6 16 -2" stroke="#2B2A4C" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
 'עיר':`<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><circle cx="50" cy="13" r="7" fill="#FFD23F"/><rect x="6" y="30" width="16" height="30" rx="2.5" fill="#F7A6D0"/><rect x="22" y="14" width="20" height="46" rx="2.5" fill="#EC4899"/><rect x="42" y="26" width="16" height="34" rx="2.5" fill="#B84DD6"/><g fill="#FFF3B0"><rect x="10" y="36" width="4" height="4" rx="1"/><rect x="16" y="36" width="3" height="4" rx="1"/><rect x="10" y="46" width="4" height="4" rx="1"/><rect x="16" y="46" width="3" height="4" rx="1"/><rect x="27" y="20" width="4" height="4" rx="1"/><rect x="34" y="20" width="4" height="4" rx="1"/><rect x="27" y="30" width="4" height="4" rx="1"/><rect x="34" y="30" width="4" height="4" rx="1"/><rect x="46" y="32" width="4" height="4" rx="1"/><rect x="52" y="32" width="3" height="4" rx="1"/><rect x="46" y="42" width="4" height="4" rx="1"/><rect x="52" y="42" width="3" height="4" rx="1"/></g><rect x="29" y="46" width="6" height="14" rx="2" fill="#7A2A5C"/></svg>`,
 'מקצוע':`<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><defs><mask id="wm"><rect width="64" height="64" fill="#fff"/><rect x="26" y="0" width="12" height="19" rx="2" fill="#000"/></mask></defs><g transform="rotate(35 32 32)"><rect x="27" y="28" width="10" height="33" rx="5" fill="#9FB4C7"/><rect x="27" y="44" width="10" height="17" rx="5" fill="#14B8A6"/><circle cx="32" cy="19" r="15" fill="#B7C8D8" mask="url(#wm)"/><path d="M19 17 a13 13 0 0 1 5 -9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/><circle cx="26.5" cy="26" r="2.2" fill="#2B2A4C"/><circle cx="37.5" cy="26" r="2.2" fill="#2B2A4C"/><path d="M28.5 30.5 q3.5 3 7 0" stroke="#2B2A4C" stroke-width="1.8" fill="none" stroke-linecap="round"/></g></svg>`
};
const CATS = [['חי', '--c-animal'], ['צומח', '--c-plant'], ['דומם', '--c-thing'], ['ארץ', '--c-country'], ['עיר', '--c-city'], ['מקצוע', '--c-job']];
const GT = guestToken();
let me, profiles = [], gcall = null, gref = null;
if (GT) { const x = await guestMode('game', GT); me = x.me; gcall = x.call; gref = x.ref; }
else { const x = await initPage({ title: 'חי צומח דומם', back: 'index.html' }); me = x.me; profiles = x.profiles; }
const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
if (GT) byId[me.id] = me;
// שמות של שחקנים שאינם ברשימה הרגילה (אורחים)
const learnNames = st => (st?.players || []).forEach(p => { if (p.name && !byId[p.user_id]) byId[p.user_id] = { id: p.user_id, name: p.name, color: '#8E8EA8' }; });
const isGuestId = id => !!ST?.players?.find(p => p.user_id === id && p.guest);
const $ = s => document.querySelector(s);
const G = $('#gm');
const nm = id => esc(byId[id]?.name || 'מישהו');
const av = (id, s = 58) => avatar(byId[id], s);

/* ---- צלילים (נוצרים בדפדפן) ---- */
const SND = { on: (() => { try { return localStorage.getItem('soundOff') !== '1'; } catch (_) { return true; } })(), ctx: null };
function ac() { if (!SND.on) return null; if (!SND.ctx) { try { SND.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } } if (SND.ctx.state === 'suspended') SND.ctx.resume(); return SND.ctx; }
function tone(f, d = .12, type = 'sine', vol = .18, when = 0, to) {
  const c = ac(); if (!c) return; const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02);
}
const sfx = {
  btn() { tone(480, .06, 'triangle', .12); },
  start() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'triangle', .2, i * .09)); },
  tick(i) { tone(420 + (i % 22) * 26, .055, 'square', .07); },
  stop() { tone(220, .22, 'sawtooth', .22, 0, 70); tone(110, .3, 'sine', .3); },
  letter() { [392, 494, 587, 784, 988, 1175].forEach((f, i) => tone(f, .22, 'triangle', .2, i * .08)); },
  ok() { tone(700, .08, 'sine', .2); tone(1050, .18, 'sine', .2, .08); },
  low(n) { const k = 10 - n, f = 640 + k * 75, v = .09 + k * .014; tone(f, .09, 'square', v); if (n <= 5) tone(f * 1.26, .09, 'square', v, .16); if (n <= 3) { tone(f * 1.5, .09, 'square', v, .32); tone(f * .5, .2, 'sawtooth', .1, 0); } },
  end() { tone(880, .9, 'sawtooth', .2, 0, 110); tone(440, .9, 'square', .12, 0, 55); },
  reveal() { for (let i = 0; i < 8; i++) tone(300 + i * 70, .07, 'triangle', .12, i * .045); tone(1050, .3, 'triangle', .18, .4); },
  win() { [523, 523, 523, 659, 523, 659, 784].forEach((f, i) => tone(f, i === 6 ? .5 : .14, 'triangle', .22, i * .14)); tone(130, .5, 'sine', .3, .9); }
};
const sb = document.createElement('button');
sb.className = 'gsnd'; sb.type = 'button'; sb.textContent = SND.on ? 'צליל: פעיל' : 'צליל: כבוי';
sb.onclick = () => { SND.on = !SND.on; try { localStorage.setItem('soundOff', SND.on ? '0' : '1'); } catch (_) {} sb.textContent = SND.on ? 'צליל: פעיל' : 'צליל: כבוי'; if (SND.on) sfx.btn(); };
document.body.append(sb);

function confetti(n = 90) {
  const c = $('#gconf'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const cols = ['#FFC93C', '#FF6B6B', '#12B5A6', '#6C5CE7', '#7ED957', '#3B82F6'];
  const ps = Array.from({ length: n }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, vy: 2 + Math.random() * 3, vx: -1 + Math.random() * 2, s: 6 + Math.random() * 7, r: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  let t = 0;
  (function f() { x.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.y += p.vy; p.x += p.vx; p.r += .1; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }); if (++t < 150) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height); })();
}

/* ---- מצב ---- */
let roomId = GT ? gref : null, ST = null, off = 0, viewKey = '', cnt = null, mySub = false, subRound = -1, ticked = '', lastLow = -1, TIE = null, isGiver = false, errMsg = '';
const sNow = () => Date.now() + off;
const head = () => `<h1 class="gh1"><span>חי</span> <span>צומח</span> <span>דומם</span></h1><div class="gtag">משחק המשפחה</div>`;
const rpc = async (fn, args) => { const { data, error } = GT ? await gcall(fn, args) : await supabase.rpc(fn, args); if (error) throw error; return data; };
const errText = e => {
  const m = String(e?.message || e || '');
  if (m.includes('open_game_exists')) return 'כבר יש משחק פתוח. אפשר להצטרף אליו.';
  if (m.includes('prize_not_allowed')) return 'רק אבא יכול לפתוח משחק עם פרס.';
  if (m.includes('not_host')) return 'רק מנהל המשחק יכול לעשות את זה.';
  if (m.includes('game_over')) return 'המשחק כבר הסתיים.';
  return 'משהו השתבש, נסו שוב';
};
const act = async (fn, args, after) => {
  try { await rpc(fn, args); errMsg = ''; if (after) await after(); } catch (e) { errMsg = errText(e); showToast(errMsg, true); }
  await refresh(true);
};

async function refresh(force) {
  try {
    if (!roomId && !GT) { const cur = await rpc('game_current'); roomId = cur?.room_id || null; }
    if (roomId) {
      const st = await rpc('game_state', { p_room: roomId });
      if (!st || st.room.status === 'closed') { roomId = null; ST = null; } else { off = st.now - Date.now(); ST = st; learnNames(st); }
    } else ST = null;
  } catch (_) { /* נשארים עם המצב האחרון */ }
  render();
}

const playersRow = (list, tags = {}) => `<div class="gplayers">${list.map(p => `<div class="gpl">${av(p.user_id)}<span>${nm(p.user_id)}</span>${tags[p.user_id] || ''}</div>`).join('')}</div>`;
const prizeBadge = r => r.prize > 0 ? `<div style="text-align:center"><span class="gpbadge">פרס למנצח הכללי: ${r.prize} נקודות</span></div>` : '';

function render() {
  const key = computeKey();
  if (key !== viewKey) build(key);
  liveUpdate();
}

function computeKey() {
  if (!ST) return 'none:' + isGiver;
  if (ST.room.status === 'final') TIE = null;
  const r = ST.room, m = ST.me;
  if (TIE && r.host_id === me.id) return 'tie';
  if (!m || m.status === 'left' || m.status === 'declined') return 'out:' + (m?.status || 'none');
  if (m.status === 'pending') return 'pending';
  const elig = m.joined_round <= r.round;
  const sub = (mySub && subRound === r.round) || (ST.submitted || []).includes(me.id);
  if (r.status === 'lobby') return 'lobby:' + ST.players.map(p => p.user_id + p.status).join(',');
  if (r.status === 'wait') return 'wait:' + r.round + ':' + elig;
  if (r.status === 'play') return 'play:' + r.round + ':' + (sNow() < r.play_at ? 'let' : 'form') + ':' + elig + ':' + sub;
  if (r.status === 'reveal') return 'reveal:' + r.round;
  if (r.status === 'win') return 'win:' + r.round;
  if (r.status === 'final') return 'final:' + (r.champ_id || '-');
  return 'x';
}

function build(key) {
  const r = ST?.room, host = r && r.host_id === me.id;
  const set = (html, after) => { viewKey = key; clearInterval(cnt); cnt = null; G.innerHTML = html; if (after) after(); };
  const bind = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };

  if (key.startsWith('none')) {
    if (GT) { set(`${head()}<div class="gcard main"><p class="gsub">המשחק הסתיים</p><p class="ghint">תודה ששיחקת!</p></div>`); return; }
    set(`${head()}<div class="gcard main"><p class="gsub">אין משחק פתוח עכשיו</p>
      ${isGiver ? `<div class="gprize"><label for="gPrize">פרס למנצח הכללי (בנקודות)</label><input id="gPrize" type="number" inputmode="numeric" min="0" max="1000" placeholder="ריק = משחק בלי פרס"></div>` : ''}
      <p class="ghint">פותחים משחק, וכל המשפחה מקבלת הזמנה</p>
      <button class="gbtn go" id="gOpen" type="button">פתח משחק והזמן את המשפחה</button></div>`);
    bind('#gOpen', () => act('game_open', { p_prize: isGiver ? Math.max(0, Math.min(1000, parseInt($('#gPrize')?.value) || 0)) : 0 }));
    return;
  }
  if (key === 'tie') {
    set(`${head()}<div class="gcard main"><p class="gwho" style="font-size:22px">יש תיקו בצמרת!</p>
      <p class="ghint">${r.prize > 0 ? `מי מקבל את הפרס (${r.prize} נקודות)?` : 'מי המנצח הכללי?'}</p>
      <div class="gpick">${TIE.map(id => `<button class="gpl" data-id="${id}" type="button">${av(id)}<span>${nm(id)}</span></button>`).join('')}</div></div>`);
    document.querySelectorAll('.gpick .gpl').forEach(b => b.onclick = async () => {
      const id = b.dataset.id;
      try { await rpc('game_end', { p_room: roomId, p_champ: id }); TIE = null; } catch (e) { showToast(errText(e), true); }
      await refresh(true);
    });
    return;
  }
  if (key.startsWith('out')) {
    const st = ST.me?.status;
    set(`${head()}<div class="gcard main"><p class="gsub">${nm(r.host_id)} פתח/ה משחק חי צומח דומם</p>
      ${st === 'declined' ? '<p class="ghint">המנהל לא אישר את ההצטרפות</p>' : ''}${prizeBadge(r)}
      <button class="gbtn go" id="gJoin" type="button">${st === 'declined' ? 'בקש להצטרף שוב' : 'הצטרף למשחק'}</button></div>`);
    bind('#gJoin', () => act('game_join', { p_room: roomId }));
    return;
  }
  if (key === 'pending') {
    set(`${head()}<div class="gcard main"><p class="gsub">ממתינים שהמנהל יאשר את ההצטרפות שלך</p><div style="display:grid;place-items:center;margin:12px 0">${av(me.id, 72)}</div><p class="ghint">${nm(r.host_id)} קיבל/ה הודעה</p>
      <button class="gbtn ghost" id="gLeave" type="button">ביטול</button></div>`);
    bind('#gLeave', () => act('game_leave', { p_room: roomId }));
    return;
  }
  const elig = ST.me.joined_round <= r.round;
  if (key.startsWith('lobby')) {
    const joined = ST.players.filter(p => p.status === 'joined'), pend = ST.players.filter(p => p.status === 'pending');
    const tags = {}; joined.forEach(p => { tags[p.user_id] = p.user_id === r.host_id ? '<span class="gtag2 mgr">מנהל/ת</span>' : '<span class="gtag2">מחובר/ת</span>'; });
    pend.forEach(p => { tags[p.user_id] = '<span class="gtag2 wait">ממתין/ה לאישור</span>'; });
    set(`${head()}<div class="gcard main"><p class="gsub">${nm(r.host_id)} פתח/ה משחק. מי שמצטרף נכנס!</p>
      ${playersRow(joined.concat(pend), tags)}${prizeBadge(r)}
      ${host ? `<button class="gbtn go" id="gStart" type="button">התחל משחק</button><button class="gbtn ghost" id="gClose" type="button">סגירת המשחק</button>`
             : `<p class="ghint">מחכים שהמנהל יתחיל</p><button class="gbtn ghost" id="gLeave" type="button">יציאה מהמשחק</button>`}
      ${GT ? '' : '<button class="gbtn ghost" id="gGuest" type="button">הזמן אורח בקישור</button>'}</div>`);
    bind('#gGuest', () => inviteGuest('game'));
    bind('#gStart', () => { sfx.start(); act('game_start_round', { p_room: roomId }); });
    bind('#gClose', () => act('game_close', { p_room: roomId }));
    bind('#gLeave', () => act('game_leave', { p_room: roomId }));
    return;
  }
  if (key.startsWith('wait')) {
    if (!elig) { set(`${head()}<div class="gcard main"><p class="gsub">סבב ${r.round} כבר התחיל</p><p class="ghint">מצטרפים בסבב הבא</p></div>`); return; }
    set(`${head()}<div class="gcard main"><p class="gwho">סבב ${r.round}</p><p class="gsub" style="font-size:20px">המשחק התחיל!<br>לחצו <b style="color:var(--gcoral)">סטופ</b> כדי לקבל את האות</p>
      <div class="gwheel" id="gwheel">${'אבגדהוזחטיכלמנסעפצקרשת'.split('').map((_, i, a) => { const t = i / a.length * 2 * Math.PI - Math.PI / 2; return `<i class="d" style="left:${50 + 46 * Math.cos(t)}%;top:${50 + 46 * Math.sin(t)}%"></i>`; }).join('')}<button class="gstop" id="gStop" type="button">סטופ</button></div>
      <p class="ghint">הספירה רצה בשקט, בלי לראות אותיות. מי שלוחץ ראשון עוצר אותה, והאות נבחרת מעצמה</p></div>`, () => {
      sfx.start();
      const dots = [...document.querySelectorAll('#gwheel .d')]; let ci = 0;
      cnt = setInterval(() => { dots.forEach(d => d.classList.remove('on')); dots[ci % dots.length].classList.add('on'); sfx.tick(ci); ci++; }, 160);
    });
    bind('#gStop', async () => {
      $('#gStop').disabled = true;
      try { await rpc('game_stop', { p_room: roomId }); } catch (e) { showToast(errText(e), true); }
      await refresh(true);
    });
    return;
  }
  if (key.startsWith('play')) {
    const phase = key.split(':')[2], sub = key.endsWith('true');
    if (!elig) { set(`${head()}<div class="gcard main"><p class="gsub">סבב ${r.round} רץ עכשיו</p><p class="ghint">מצטרפים בסבב הבא</p></div>`); return; }
    if (phase === 'let') {
      set(`${head()}<div class="gcard main"><p class="gwho">${nm(r.stopper_id)} עצר/ה!</p><div class="gbigl">${esc(r.letter)}</div><p class="gsub">האות של סבב ${r.round}</p></div>`, () => {
        sfx.stop(); setTimeout(() => { sfx.letter(); confetti(40); }, 350);
      });
      return;
    }
    if (sub) {
      set(`<div class="gcard main"><div class="gbar"><div class="glet">${esc(r.letter)}</div><div class="gtimer"><div class="ghint" style="text-align:start;margin:0">אישרת! ממתינים לשאר השחקנים</div><b id="gtm"></b><div class="gtrack"><div class="gfill" id="gfl"></div></div></div></div>
        <p class="ghint" id="gwho2" style="margin-top:14px"></p></div>`);
      return;
    }
    set(`<div class="gcard main"><div class="gbar"><div class="glet">${esc(r.letter)}</div><div class="gtimer"><div class="ghint" style="text-align:start;margin:0">הזמן נגמר בעוד</div><b id="gtm"></b><div class="gtrack"><div class="gfill" id="gfl"></div></div></div></div>
      <div class="gform">${CATS.map(([n, k], i) => `<div class="gfield" style="--k:var(${k})"><label for="gf${i}"><span class="gico">${ICO[n]}</span>${n}</label><input id="gf${i}" autocomplete="off" maxlength="40" placeholder="מתחיל ב-${esc(r.letter)}"></div>`).join('')}</div>
      <p class="ghint" id="gwho2"></p>
      <button class="gbtn go" id="gOk" type="button">אישור</button></div>`);
    bind('#gOk', () => submitMine(false));
    return;
  }
  if (key.startsWith('reveal')) {
    const elig2 = ST.players.filter(p => p.status === 'joined' && p.joined_round <= r.round);
    set(`<div class="gcard"><div class="gbar"><div class="glet">${esc(r.letter)}</div><div><b style="font-size:20px">כל התשובות לאות ${esc(r.letter)}</b></div></div>
      <div class="gcats">${CATS.map(([n, k], i) => `<div class="gcat" style="--k:var(${k})"><h3><span class="gico sm">${ICO[n]}</span>${n}</h3>${elig2.map(p => { const t = (ST.answers?.[p.user_id] || [])[i]; return `<div class="gans">${av(p.user_id, 30)}${t ? `<span class="t">${esc(t)}</span>` : '<span class="t nada">לא ענה/תה</span>'}</div>`; }).join('')}</div>`).join('')}</div></div>
      <div class="gcard"><p class="gwho" style="margin-bottom:6px">${host ? 'מי ניצח/ה בסבב?' : 'המנהל בוחר מנצח לסבב'}</p>
      ${host ? `<div class="gpick">${elig2.map(p => `<button class="gpl" data-id="${p.user_id}" type="button">${av(p.user_id)}<span>${nm(p.user_id)}</span></button>`).join('')}</div>` : '<p class="ghint">מחכים להכרעה…</p>'}</div>`, () => {
      sfx.reveal(); window.scrollTo({ top: 0 });
    });
    document.querySelectorAll('.gpick .gpl').forEach(b => b.onclick = () => { sfx.ok(); act('game_pick_winner', { p_room: roomId, p_winner: b.dataset.id }); });
    return;
  }
  if (key.startsWith('win')) {
    const w = ST.round_winner;
    set(`${head()}<div class="gcard main"><div class="gcrown">⭐</div><p class="gwho">${w ? nm(w) + ' ניצח/ה בסבב ' + r.round : 'סבב ' + r.round + ' נגמר'}</p>
      ${w ? `<div style="display:grid;place-items:center;margin:8px 0">${av(w, 72)}</div>` : ''}
      <p class="ghint">המנצח הכללי יוכרז רק בסיום המשחק</p>${prizeBadge(r)}
      ${host ? `<button class="gbtn go" id="gNext" type="button">סבב הבא</button><button class="gbtn ghost" id="gEnd" type="button">סיום משחק</button>`
             : `<p class="ghint">מחכים שהמנהל ימשיך</p><button class="gbtn ghost" id="gLeave" type="button">יציאה מהמשחק</button>`}</div>`, () => { sfx.ok(); confetti(50); window.scrollTo({ top: 0 }); });
    bind('#gNext', () => act('game_start_round', { p_room: roomId }));
    bind('#gLeave', () => act('game_leave', { p_room: roomId }));
    bind('#gEnd', async () => {
      try {
        const res = await rpc('game_end', { p_room: roomId });
        if (res?.status === 'tie') TIE = res.tops;
      } catch (e) { showToast(errText(e), true); }
      await refresh(true);
    });
    return;
  }
  if (key.startsWith('final')) {
    const ch = r.champ_id, joined = ST.players.filter(p => p.status === 'joined');
    const wins = ST.wins || {}, mx = Math.max(1, ...joined.map(p => wins[p.user_id] || 0));
    const rows = joined.slice().sort((a, b) => (wins[b.user_id] || 0) - (wins[a.user_id] || 0)).map(p => `<div class="gsr">${av(p.user_id, 36)}<span style="width:48px">${nm(p.user_id)}</span><div class="bg"><i style="width:${(wins[p.user_id] || 0) / mx * 100}%"></i></div><span class="n">${wins[p.user_id] || 0}</span></div>`).join('');
    set(`${head()}<div class="gcard main"><div class="gcrown">🏆</div>
      ${ch ? `<p class="gwho" style="font-size:24px">${nm(ch)} המנצח/ת הכללי/ת!</p><div style="display:grid;place-items:center;margin:8px 0">${av(ch, 84)}</div>
        ${r.prize > 0 && !isGuestId(ch) ? `<div style="text-align:center"><span class="gpbadge" style="font-size:20px">+${r.prize} נקודות נכנסו לנקודות של ${nm(ch)}</span></div>` : (r.prize > 0 ? '<p class="ghint">כל הכבוד! הפרס שמור לבני המשפחה</p>' : '<p class="ghint">משחק בלי פרס. כל הכבוד לכולם!</p>')}`
          : '<p class="gwho" style="font-size:22px">המשחק נגמר</p><p class="ghint">לא נבחרו מנצחים בסבבים</p>'}
      <div class="gscore">${rows}</div>
      ${host ? '<button class="gbtn go" id="gClose" type="button">סגירת המשחק</button>' : '<p class="ghint">המנהל יסגור את המשחק</p>'}</div>`, () => { sfx.win(); confetti(140); window.scrollTo({ top: 0 }); });
    bind('#gClose', () => act('game_close', { p_room: roomId }));
  }
}

async function submitMine(auto) {
  if (!ST || (mySub && subRound === ST.room.round)) return;
  mySub = true; subRound = ST.room.round;
  const vals = CATS.map((_, i) => ($('#gf' + i)?.value || '').trim());
  if (!auto) sfx.ok();
  try { await rpc('game_submit', { p_room: roomId, p_answers: vals }); }
  catch (e) { mySub = false; subRound = -1; showToast(errText(e), true); }
  await refresh(true);
}

/* עדכונים חיים בלי לצייר מחדש (שעון, מי אישר, אזהרת סוף זמן) */
function liveUpdate() {
  const r = ST?.room;
  const inPlay = r && r.status === 'play' && sNow() >= r.play_at;
  if (!inPlay) { G.classList.remove('ghurry'); $('#gvig')?.classList.remove('on'); lastLow = -1; return; }
  const left = Math.max(0, Math.ceil((r.ends_at - sNow()) / 1000)), total = 120;
  const tm = $('#gtm'), fl = $('#gfl');
  if (tm) tm.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
  if (fl) { fl.style.width = Math.min(100, left / total * 100) + '%'; fl.classList.toggle('low', left <= 20); }
  const hurry = left <= 10 && left > 0;
  G.classList.toggle('ghurry', hurry); $('#gvig')?.classList.toggle('on', hurry);
  if (hurry && left !== lastLow) { lastLow = left; sfx.low(left); }
  if (left === 0 && lastLow !== 0) { lastLow = 0; sfx.end(); }
  const w2 = $('#gwho2');
  if (w2) {
    const elig = ST.players.filter(p => p.status === 'joined' && p.joined_round <= r.round);
    const done = new Set(ST.submitted || []);
    w2.innerHTML = elig.filter(p => p.user_id !== me.id).map(p => `${nm(p.user_id)}: <span style="color:${done.has(p.user_id) ? 'var(--gteal)' : 'inherit'}">${done.has(p.user_id) ? 'סיים/ה ✓' : 'כותב/ת…'}</span>`).join(' · ');
  }
  const inForm = $('#gOk');
  if (inForm && left === 0 && !(mySub && subRound === r.round)) submitMine(true);
  if (sNow() >= r.ends_at + 3300 && ticked !== roomId + ':' + r.round) {
    ticked = roomId + ':' + r.round;
    rpc('game_tick', { p_room: roomId }).then(() => refresh(true)).catch(() => {});
  }
}

/* ---- הפעלה ---- */
if (!GT) { try { isGiver = (await supabase.rpc('is_bonus_giver')).data === true; } catch (_) {} }
await refresh(true);
setInterval(() => { if (!document.hidden) refresh(); }, 2500);
setInterval(() => { if (ST) { const k = computeKey(); if (k !== viewKey) render(); else liveUpdate(); } }, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(true); });
let rt = null;
if (!GT) supabase.channel('gamepage-' + me.id)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, () => { clearTimeout(rt); rt = setTimeout(() => refresh(true), 150); })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players' }, () => { clearTimeout(rt); rt = setTimeout(() => refresh(true), 150); })
  .subscribe();
