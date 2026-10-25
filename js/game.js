// חלוניות המשחק בכל האפליקציה: הזמנה למשחק ואישור הצטרפות (למנהל).
import { supabase, esc, avatar, playChime, showToast } from './common.js';

export function startGame(me, profiles) {
  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const onGamePage = /game\.html/.test(location.pathname);
  let busy = false, timer = null;
  const dismissed = () => { try { return sessionStorage.getItem('gameDismiss') || ''; } catch (_) { return ''; } };
  const dismiss = id => { try { sessionStorage.setItem('gameDismiss', id); } catch (_) {} };

  const popup = (id, html) => {
    if (document.getElementById(id)) return null;
    const m = document.createElement('div');
    m.className = 'modal'; m.id = id; m.style.zIndex = 96;
    m.innerHTML = `<div class="modal-card" style="text-align:center;border:5px solid #6C5CE7;background:#F5F3FF">${html}</div>`;
    document.body.append(m);
    try { playChime(); } catch (_) {}
    return m;
  };
  const drop = id => document.getElementById(id)?.remove();
  const btn = (idv, label, ghost) => `<button class="btn${ghost ? ' secondary' : ''}" id="${idv}" type="button" style="margin-top:10px">${label}</button>`;

  async function check() {
    if (busy) return;
    busy = true;
    try {
      const { data: cur } = await supabase.rpc('game_current');
      // הזמנה
      const inviteId = 'gInvite';
      const needInvite = cur && cur.host_id !== me.id && !cur.my_status && cur.status !== 'final' && dismissed() !== cur.room_id && !onGamePage;
      if (!needInvite) drop(inviteId);
      else {
        const host = byId[cur.host_id];
        const m = popup(inviteId, `<div style="display:grid;place-items:center">${avatar(host, 84)}</div>
          <h2 style="margin:12px 0 4px;color:#4B3DB8">${esc(host?.name || 'מישהו')} הזמין/ה אתכם לשחק</h2>
          <p style="font-size:22px;font-weight:800;margin:0 0 6px">חי צומח דומם</p>
          ${cur.prize > 0 ? `<p style="font-weight:800;color:#B45309;margin:0 0 8px">הפרס למנצח: ${cur.prize} נקודות</p>` : ''}
          ${btn('gInvYes', 'הצטרף למשחק')}${btn('gInvNo', 'לא עכשיו', true)}`);
        if (m) {
          m.querySelector('#gInvYes').onclick = async () => {
            const { error } = await supabase.rpc('game_join', { p_room: cur.room_id });
            drop(inviteId);
            if (error) showToast('ההצטרפות נכשלה', true); else location.href = 'game.html';
          };
          m.querySelector('#gInvNo').onclick = () => { dismiss(cur.room_id); drop(inviteId); };
        }
      }
      // אישור הצטרפות (למנהל)
      const pend = cur && cur.host_id === me.id ? (cur.pending || []) : [];
      document.querySelectorAll('[id^="gJoin-"]').forEach(e => { if (!pend.some(p => 'gJoin-' + p.user_id === e.id)) e.remove(); });
      pend.forEach(p => {
        const u = byId[p.user_id] || { id: p.user_id, name: p.name }, id = 'gJoin-' + p.user_id;
        const m = popup(id, `<div style="display:grid;place-items:center">${avatar(u, 84)}</div>
          <h2 style="margin:12px 0 4px;color:#4B3DB8">${esc(u?.name || p.name || 'מישהו')} הצטרף/ה למשחק</h2>
          <p style="margin:0 0 6px">לאשר שיצטרף/ה? מי שמאושר באמצע סבב מתחיל מהסבב הבא.</p>
          ${btn(id + 'y', 'אשר')}${btn(id + 'n', 'דחה', true)}`);
        if (m) {
          const answer = async ok => { drop(id); const { error } = await supabase.rpc('game_approve', { p_room: cur.room_id, p_user: p.user_id, p_ok: ok }); if (error) showToast('הפעולה נכשלה', true); };
          m.querySelector('#' + CSS.escape(id + 'y')).onclick = () => answer(true);
          m.querySelector('#' + CSS.escape(id + 'n')).onclick = () => answer(false);
        }
      });
    } catch (_) { /* בדיקה הבאה תנסה שוב */ }
    busy = false;
  }

  // הזמנות לדמקה
  async function checkCk() {
    try {
      const { data } = await supabase.from('checkers_games').select('id,white_id').eq('black_id', me.id).eq('status', 'invite');
      const list = (data || []).filter(g => !(/checkers\.html/.test(location.pathname) && location.search.includes(g.id)));
      document.querySelectorAll('[id^="ckInv-"]').forEach(e => { if (!list.some(g => 'ckInv-' + g.id === e.id)) e.remove(); });
      list.forEach(g => {
        const u = byId[g.white_id], id = 'ckInv-' + g.id;
        const m = popup(id, `<div style="display:grid;place-items:center">${avatar(u, 84)}</div>
          <h2 style="margin:12px 0 4px;color:#4B3DB8">${esc(u?.name || 'מישהו')} הזמין/ה אותך לשחק</h2>
          <p style="font-size:22px;font-weight:800;margin:0 0 6px">דמקה</p>
          ${btn(id + 'y', 'בוא נשחק')}${btn(id + 'n', 'לא עכשיו', true)}`);
        if (m) {
          m.querySelector('#' + CSS.escape(id + 'y')).onclick = async () => {
            drop(id); const { error } = await supabase.rpc('checkers_respond', { p_game: g.id, p_accept: true });
            if (error) showToast('הפעולה נכשלה', true); else location.href = 'checkers.html?g=' + g.id;
          };
          m.querySelector('#' + CSS.escape(id + 'n')).onclick = async () => { drop(id); await supabase.rpc('checkers_respond', { p_game: g.id, p_accept: false }); };
        }
      });
    } catch (_) {}
  }

  // הזמנות לצוללות
  async function checkBs() {
    try {
      const { data } = await supabase.from('bs_games').select('id,a_id').eq('b_id', me.id).eq('status', 'invite');
      const list = (data || []).filter(g => !(/battleship\.html/.test(location.pathname) && location.search.includes(g.id)));
      document.querySelectorAll('[id^="bsInv-"]').forEach(e => { if (!list.some(g => 'bsInv-' + g.id === e.id)) e.remove(); });
      list.forEach(g => {
        const u = byId[g.a_id], id = 'bsInv-' + g.id;
        const m = popup(id, `<div style="display:grid;place-items:center">${avatar(u, 84)}</div>
          <h2 style="margin:12px 0 4px;color:#4B3DB8">${esc(u?.name || 'מישהו')} הזמין/ה אותך לשחק</h2>
          <p style="font-size:22px;font-weight:800;margin:0 0 6px">צוללות</p>
          ${btn(id + 'y', 'בוא נשחק')}${btn(id + 'n', 'לא עכשיו', true)}`);
        if (m) {
          m.querySelector('#' + CSS.escape(id + 'y')).onclick = async () => {
            drop(id); const { error } = await supabase.rpc('bs_respond', { p_game: g.id, p_accept: true });
            if (error) showToast('הפעולה נכשלה', true); else location.href = 'battleship.html?g=' + g.id;
          };
          m.querySelector('#' + CSS.escape(id + 'n')).onclick = async () => { drop(id); await supabase.rpc('bs_respond', { p_game: g.id, p_accept: false }); };
        }
      });
    } catch (_) {}
  }

  // הזמנות לשש בש
  async function checkBg() {
    try {
      const { data } = await supabase.from('bg_games').select('id,a_id').eq('b_id', me.id).eq('status', 'invite');
      const list = (data || []).filter(g => !(/backgammon\.html/.test(location.pathname) && location.search.includes(g.id)));
      document.querySelectorAll('[id^="bgInv-"]').forEach(e => { if (!list.some(g => 'bgInv-' + g.id === e.id)) e.remove(); });
      list.forEach(g => {
        const u = byId[g.a_id], id = 'bgInv-' + g.id;
        const m = popup(id, `<div style="display:grid;place-items:center">${avatar(u, 84)}</div>
          <h2 style="margin:12px 0 4px;color:#4B3DB8">${esc(u?.name || 'מישהו')} הזמין/ה אותך לשחק</h2>
          <p style="font-size:22px;font-weight:800;margin:0 0 6px">שש בש</p>
          ${btn(id + 'y', 'בוא נשחק')}${btn(id + 'n', 'לא עכשיו', true)}`);
        if (m) {
          m.querySelector('#' + CSS.escape(id + 'y')).onclick = async () => {
            drop(id); const { error } = await supabase.rpc('bg_respond', { p_game: g.id, p_accept: true });
            if (error) showToast('הפעולה נכשלה', true); else location.href = 'backgammon.html?g=' + g.id;
          };
          m.querySelector('#' + CSS.escape(id + 'n')).onclick = async () => { drop(id); await supabase.rpc('bg_respond', { p_game: g.id, p_accept: false }); };
        }
      });
    } catch (_) {}
  }


  check(); checkCk(); checkBs(); checkBg();
  timer = setInterval(() => { if (!document.hidden) check(); checkCk(); checkBs(); checkBg(); }, 25000);
  let rt = null;
  const soon = () => { clearTimeout(rt); rt = setTimeout(check, 200); };
  supabase.channel('game-' + me.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, soon)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players' }, soon)
    .subscribe();
  supabase.channel('ck-inv-' + me.id).on('postgres_changes', { event: '*', schema: 'public', table: 'checkers_games' }, () => setTimeout(checkCk, 200)).subscribe();
  supabase.channel('bg-inv-' + me.id).on('postgres_changes', { event: '*', schema: 'public', table: 'bg_games' }, () => setTimeout(checkBg, 200)).subscribe();
  supabase.channel('bs-inv-' + me.id).on('postgres_changes', { event: '*', schema: 'public', table: 'bs_games' }, () => setTimeout(checkBs, 200)).subscribe();
}
