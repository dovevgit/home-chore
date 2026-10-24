// "אני לא בבית": פונקציות משותפות לדף הבית ולדף "אני לא בבית".
import { supabase, esc, icon, avatar } from './common.js';

export const OUT_REASONS = ['לינה אצל חברה', 'טיול', 'בילוי', 'אחר'];
export const dmy = d => d.split('-').reverse().join('.');
export const telOf = v => String(v || '').replace(/[^\d+]/g, '');
export const outDates = o => o.start_date === o.end_date ? dmy(o.start_date) : `${dmy(o.start_date)} עד ${dmy(o.end_date)}`;
export const contactsOf = o => {
  const c = Array.isArray(o.contacts) ? o.contacts.filter(x => x && x.phone) : [];
  if (!c.length && o.phone) c.push({ name: o.with_whom || '', phone: o.phone });   // רשומות מהגרסה הקודמת
  return c;
};

export function outCardHtml(o, byId, today, canAct = false) {
  const p = byId[o.user_id];
  const when = o.start_date > today ? `מתחיל ב-${dmy(o.start_date)}` : outDates(o);
  const contacts = contactsOf(o);
  return `<div class="card outinfo" style="margin-bottom:8px"><div class="outhead">${avatar(p, 44)}<div><b>${esc(p?.name || '')} · ${esc(o.reason)}</b><small>${when}</small></div></div>
    <div class="outrow"><span>איפה</span><b>${esc(o.place)}</b></div>
    ${o.address ? `<div class="outrow"><span>כתובת</span><b>${esc(o.address)}</b></div>` : ''}
    ${contacts.map(c => `<div class="outrow"><span>${esc(c.name || 'איש קשר')}</span><b dir="ltr">${esc(c.phone)}</b><a class="ibtn call sm" href="tel:${esc(telOf(c.phone))}" aria-label="חיוג">${icon('phone', 18)}</a></div>`).join('')}
    ${o.note ? `<div class="outrow"><span>הערה</span><b>${esc(o.note)}</b></div>` : ''}
    ${canAct ? `<div class="outbtns" style="flex-wrap:wrap">
      <button class="btn small" style="flex:1;margin:0" data-oa="back" data-id="${o.id}" type="button">חזרתי הביתה</button>
      <button class="btn small secondary" style="flex:1;margin:0" data-oa="edit" data-id="${o.id}" type="button">עריכה</button>
      <button class="btn small secondary" style="flex:1;margin:0;color:#B91C1C;border-color:#EF4444" data-oa="del" data-id="${o.id}" type="button">מחיקה</button></div>` : ''}</div>`;
}

export async function outAction(kind, o, ctx) {
  if (kind === 'back') await supabase.from('outings').update({ returned_at: new Date().toISOString() }).eq('id', o.id);
  else if (kind === 'del') { if (!confirm('למחוק?')) return; await supabase.from('outings').delete().eq('id', o.id); }
  else if (kind === 'edit') return openOutForm(ctx.host, { me: ctx.me, existing: o, today: ctx.today, onDone: ctx.onDone });
  ctx.host.modal.classList.add('hidden'); await ctx.onDone();
}

export function showOutDetails(host, o, ctx) {
  const canAct = o.user_id === ctx.me?.id || ctx.isAdmin;
  host.card.innerHTML = `<button type="button" class="modal-x" id="ox" aria-label="סגירה">${icon('x', 20)}</button><h2 style="margin:0 0 10px">לא בבית</h2>
    ${outCardHtml(o, ctx.byId, ctx.today, canAct)}`;
  host.modal.classList.remove('hidden');
  host.card.querySelector('#ox').onclick = () => host.modal.classList.add('hidden');
  host.card.querySelectorAll('[data-oa]').forEach(b => b.onclick = () => outAction(b.dataset.oa, o, ctx));
}

export function openOutForm(host, { me, existing, today, onDone }) {
  const o = existing;
  const r = o || { reason: OUT_REASONS[0], start_date: today, end_date: today, place: '', address: '', note: '' };
  let reason = OUT_REASONS.includes(r.reason) ? r.reason : 'אחר';
  let contacts = o ? contactsOf(o).map(c => ({ ...c })) : [];
  if (!contacts.length) contacts = [{ name: '', phone: '' }];
  const c = host.card;
  const drawContacts = () => {
    c.querySelector('#oCs').innerHTML = contacts.map((x, i) => `<div class="crow"><input data-cn="${i}" maxlength="40" placeholder="שם (למשל אמא של דנה)" value="${esc(x.name)}"><input data-cp="${i}" type="tel" inputmode="tel" dir="ltr" maxlength="30" placeholder="טלפון" value="${esc(x.phone)}">
      ${contacts.length > 1 ? `<button type="button" class="ibtn danger sm" data-cx="${i}" aria-label="הסרה">${icon('x', 16)}</button>` : ''}</div>`).join('') +
      (contacts.length < 4 ? '<button type="button" class="btn secondary small" id="oAddC" style="margin-top:6px">+ עוד איש קשר</button>' : '');
    c.querySelectorAll('[data-cn]').forEach(el => el.oninput = () => contacts[el.dataset.cn].name = el.value);
    c.querySelectorAll('[data-cp]').forEach(el => el.oninput = () => contacts[el.dataset.cp].phone = el.value);
    c.querySelectorAll('[data-cx]').forEach(el => el.onclick = () => { contacts.splice(+el.dataset.cx, 1); drawContacts(); });
    const add = c.querySelector('#oAddC'); if (add) add.onclick = () => { contacts.push({ name: '', phone: '' }); drawContacts(); };
  };
  c.innerHTML = `<button type="button" class="modal-x" id="ox" aria-label="סגירה">${icon('x', 20)}</button>
    <h2 style="margin:0 0 6px">${o ? 'עדכון' : 'אני לא בבית'}</h2>
    <label>לאן / למה</label><div class="who" id="oRs">${OUT_REASONS.map(x => `<button type="button" class="whochip ${x === reason ? 'on' : ''}" data-r="${x}">${x}</button>`).join('')}</div>
    <div class="grid2"><div><label for="oFrom">מתאריך</label><input id="oFrom" type="date" value="${r.start_date}" dir="ltr"></div>
    <div><label for="oTo">עד תאריך</label><input id="oTo" type="date" value="${r.end_date}" dir="ltr"></div></div>
    <label for="oPlace">שם החברה (או המקום)</label><input id="oPlace" maxlength="100" value="${esc(r.place)}">
    <label for="oAddr">כתובת</label><input id="oAddr" maxlength="200" value="${esc(r.address || '')}" placeholder="רחוב, מספר, עיר">
    <label>טלפונים למקרה חירום (עם שם)</label><div id="oCs"></div>
    <label for="oNote">הערה (לא חובה)</label><input id="oNote" maxlength="200" value="${esc(r.note || '')}">
    <p class="error" id="oErr" role="alert"></p>
    <button class="btn" id="oSave" type="button">שמירה</button>`;
  host.modal.classList.remove('hidden');
  drawContacts();
  c.querySelector('#ox').onclick = () => host.modal.classList.add('hidden');
  c.querySelector('#oRs').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; reason = b.dataset.r; c.querySelectorAll('#oRs .whochip').forEach(x => x.classList.toggle('on', x === b)); };
  c.querySelector('#oSave').onclick = async () => {
    const q = id => c.querySelector(id).value.trim();
    const cs = contacts.map(x => ({ name: x.name.trim(), phone: x.phone.trim() })).filter(x => x.name || x.phone);
    const row = { reason, start_date: q('#oFrom'), end_date: q('#oTo'), place: q('#oPlace'), address: q('#oAddr') || null, note: q('#oNote') || null, contacts: cs, phone: null, with_whom: null };
    const err = m => { c.querySelector('#oErr').textContent = m; };
    if (!row.start_date || !row.end_date) return err('צריך לבחור תאריכים');
    if (row.end_date < row.start_date) return err('תאריך הסיום לפני תאריך ההתחלה');
    if (!row.place) return err('צריך לכתוב את שם החברה או המקום');
    if (reason === 'לינה אצל חברה' && !row.address) return err('בלינה אצל חברה צריך גם כתובת');
    if (!cs.length || cs.some(x => !x.name || x.phone.replace(/\D/g, '').length < 7)) return err('צריך לפחות איש קשר אחד עם שם וטלפון תקין');
    c.querySelector('#oSave').disabled = true;
    const res = o ? await supabase.from('outings').update(row).eq('id', o.id) : await supabase.from('outings').insert({ ...row, user_id: me.id });
    if (res.error) { c.querySelector('#oSave').disabled = false; return err('השמירה נכשלה: ' + res.error.message); }
    host.modal.classList.add('hidden'); await onDone();
  };
}
