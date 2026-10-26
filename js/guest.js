// אורחים בקישור: כניסה בשם בלי הרשמה, ויצירת קישור הזמנה על ידי בן משפחה.
import { supabase, esc, showToast } from './common.js';

export const guestToken = () => new URLSearchParams(location.search).get('t');

const KIND_PAGE = { checkers: 'checkers.html', game: 'game.html', bs: 'battleship.html', poker: 'poker.html', bg: 'backgammon.html', bj: 'blackjack.html', st: 'stratego.html' };
const KIND_NAME = { checkers: 'דמקה', game: 'חי צומח דומם', bs: 'צוללות', poker: 'פוקר', bg: 'שש בש', bj: '21', st: 'סטרטגו' };

const callRpc = (token, fn, args) => supabase.rpc('guest_call', { p_token: token, p_fn: fn, p_args: args || {} });

function box(html) {
  const host = document.getElementById('gm') || document.getElementById('ck') || document.getElementById('bs') || document.getElementById('bgm') || document.getElementById('pk') || document.getElementById('bjm') || document.getElementById('st') || document.body;
  host.innerHTML = `<div style="max-width:420px;margin:30px auto 0;background:#fff;border-radius:22px;padding:22px;text-align:center;box-shadow:0 4px 18px rgba(13,110,253,.18);border:3px solid #E3ECFF;color:#2B2A4C">${html}</div>`;
  return host;
}

// מכין דף אורח: כותרת, בדיקת הקישור, ובקשת שם. מחזיר {me, ref, call}
export async function guestMode(kind, token) {
  const header = document.createElement('header');
  header.className = 'bar';
  header.innerHTML = `<span class="iconbtn ghost"></span><h1>${esc(KIND_NAME[kind])}</h1><span class="iconbtn ghost"></span>`;
  document.body.prepend(header);

  const { data: info, error } = await supabase.rpc('guest_info', { p_token: token });
  if (error || !info) {
    box('<h2 style="margin:0 0 8px">הקישור לא תקף</h2><p style="margin:0;opacity:.8">ייתכן שהקישור פג תוקף. בקשו קישור חדש מהמשפחה.</p>');
    await new Promise(() => {});
  }
  if (info.kind !== kind) { location.replace(KIND_PAGE[info.kind] + '?t=' + encodeURIComponent(token)); await new Promise(() => {}); }

  if (!info.entered) {
    let saved = ''; try { saved = localStorage.getItem('guestName') || ''; } catch (_) {}
    await new Promise(resolve => {
      box(`<h2 style="margin:0 0 6px">ברוכים הבאים!</h2>
        <p style="margin:0 0 14px;opacity:.85">הוזמנת לשחק ${esc(KIND_NAME[kind])}. איך קוראים לך?</p>
        <input id="gName" maxlength="20" placeholder="השם שלך" value="${esc(saved)}" style="width:100%;padding:14px;font:inherit;font-size:18px;border:2px solid #cfd8ea;border-radius:14px;text-align:center">
        <button id="gGo" type="button" style="margin-top:14px;width:100%;padding:14px;border:0;border-radius:14px;background:#6C5CE7;color:#fff;font:inherit;font-weight:800;font-size:18px;cursor:pointer">בואו נשחק</button>
        <p id="gErr" style="color:#c0392b;min-height:20px;margin:10px 0 0"></p>`);
      const go = async () => {
        const name = document.getElementById('gName').value.trim();
        const err = document.getElementById('gErr');
        if (!name) { err.textContent = 'כתבו שם כדי להמשיך'; return; }
        document.getElementById('gGo').disabled = true;
        const { error: e2 } = await supabase.rpc('guest_enter', { p_token: token, p_name: name });
        if (e2) {
          err.textContent = /table_full/.test(e2.message) ? 'השולחן מלא' : /closed/.test(e2.message) ? 'השולחן נסגר' : /no_room|game_over/.test(e2.message) ? 'המשחק כבר הסתיים' : /bad_link/.test(e2.message) ? 'הקישור לא תקף' : 'ההצטרפות נכשלה, נסו שוב';
          document.getElementById('gGo').disabled = false; return;
        }
        try { localStorage.setItem('guestName', name); } catch (_) {}
        info.name = name; resolve();
      };
      document.getElementById('gGo').onclick = go;
      document.getElementById('gName').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
    document.getElementById('gm') && (document.getElementById('gm').innerHTML = '');
  }
  return { me: { id: info.pid, name: info.name }, ref: info.ref, call: (fn, args) => callRpc(token, fn, args) };
}

// בן משפחה: יוצר קישור לאורח ומציג חלונית שיתוף
export async function inviteGuest(kind, onClose) {
  const { data, error } = await supabase.rpc('guest_create', { p_kind: kind });
  if (error) {
    showToast(/no_game|not_in_game|no_table/.test(error.message) ? 'אפשר להזמין אורח רק כשאתם בתוך משחק או שולחן פתוח' : /too_many/.test(error.message) ? 'יצרתם יותר מדי קישורים להיום' : 'יצירת הקישור נכשלה', true);
    return null;
  }
  const u = new URL(KIND_PAGE[kind], location.href); u.search = ''; u.hash = ''; u.searchParams.set('t', data.token);
  const link = u.href, msg = `הוזמנת לשחק ${KIND_NAME[kind]} איתנו! הקישור למשחק:\n${link}`;
  const m = document.createElement('div');
  m.className = 'modal'; m.style.zIndex = 99;
  m.innerHTML = `<div class="modal-card" style="text-align:center">
    <h2 style="margin:0 0 6px">קישור לאורח</h2>
    <p style="margin:0 0 10px;opacity:.85">שלחו את הקישור לחבר. הוא יכתוב שם וישחק בלי להירשם. הקישור תקף 3 ימים.</p>
    <input id="glLink" readonly value="${esc(link)}" style="width:100%;padding:10px;font:inherit;font-size:13px;direction:ltr;border:2px solid #cfd8ea;border-radius:12px">
    <button class="btn" id="glWa" type="button" style="margin-top:10px">שלח בוואטסאפ</button>
    <button class="btn secondary" id="glCopy" type="button" style="margin-top:8px">העתק קישור</button>
    ${navigator.share ? '<button class="btn secondary" id="glShare" type="button" style="margin-top:8px">שיתוף באפליקציה אחרת</button>' : ''}
    <button class="btn secondary" id="glClose" type="button" style="margin-top:8px">סגור</button></div>`;
  document.body.append(m);
  const $ = id => m.querySelector(id);
  $('#glWa').onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  $('#glCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(link); showToast('הקישור הועתק'); }
    catch (_) { $('#glLink').select(); document.execCommand && document.execCommand('copy'); showToast('הקישור הועתק'); }
  };
  if ($('#glShare')) $('#glShare').onclick = () => navigator.share({ text: msg }).catch(() => {});
  $('#glClose').onclick = () => { m.remove(); if (onClose) onClose(data); };
  return data;
}
