// חלונית "קיבלת נקודות בונוס": מופיעה אצל המקבל עד שהוא לוחץ "תודה".
import { supabase, esc, avatar, playChime } from './common.js';

let busy = false;
export function startBonus(me, profiles) {
  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const check = async () => {
    if (busy || document.getElementById('bonusModal')) return;
    busy = true;
    try {
      const { data } = await supabase.from('bonus_points').select('id,points,reason,given_by,created_at')
        .eq('user_id', me.id).eq('seen', false).order('created_at').limit(20);
      if (!data || !data.length) return;
      const total = data.reduce((a, b) => a + b.points, 0);
      const m = document.createElement('div');
      m.className = 'modal'; m.id = 'bonusModal'; m.style.zIndex = 95;
      m.innerHTML = `<div class="modal-card" style="text-align:center;border:5px solid #F59E0B;background:#FFFBEB;max-height:88vh;overflow:auto">
        <div style="font-size:56px;line-height:1">🎉</div>
        <h2 style="margin:8px 0 2px;color:#B45309">קיבלת נקודות בונוס!</h2>
        <div style="font-size:44px;font-weight:900;color:#B45309" dir="ltr">+${total}</div>
        ${data.map(b => { const g = byId[b.given_by]; return `<div style="display:flex;align-items:center;gap:10px;background:#fff;border:2px solid #FDE68A;border-radius:16px;padding:10px;margin:10px 0;text-align:start">${avatar(g, 44)}
          <div style="flex:1;min-width:0"><b>${esc(g?.name || 'מישהו')}</b> נתן/ה לך <b dir="ltr">+${b.points}</b><div style="margin-top:2px">${esc(b.reason)}</div></div></div>`; }).join('')}
        <button class="btn" id="bonusOk" type="button">תודה!</button></div>`;
      document.body.append(m); document.body.style.overflow = 'hidden';
      try { playChime(); } catch (_) {}
      document.getElementById('bonusOk').onclick = async () => {
        m.remove(); document.body.style.overflow = '';
        await supabase.rpc('ack_bonus', { p_ids: data.map(b => b.id) });
      };
    } catch (_) {} finally { busy = false; }
  };
  check();
  setInterval(() => { if (!document.hidden) check(); }, 60000);
}
