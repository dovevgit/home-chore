// "הודעה חשובה": החלונית הגדולה והכתומה שקופצת אצל הנמענים עד שעונים.
import { supabase, esc, icon, avatar, ilDate, ilTime, signedUrls, shrinkImage, showToast } from './common.js';

const CSS = `
.impov{position:fixed;inset:0;z-index:500;background:rgba(40,20,0,.55);backdrop-filter:blur(2px);animation:impfade .25s ease}
.impbox{position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);left:12px;right:12px;max-width:520px;margin:0 auto;display:flex;flex-direction:column;background:#FFF7ED;border:6px solid #FF8A00;border-radius:28px;overflow:hidden;box-shadow:0 0 0 4px rgba(255,138,0,.30),0 18px 50px rgba(0,0,0,.45);animation:imppop .35s cubic-bezier(.2,1.3,.4,1),impglow 2.2s ease-in-out infinite .4s}
.imphead{flex:none;display:flex;align-items:center;justify-content:center;gap:10px;padding:14px 12px;background:linear-gradient(135deg,#FF9F1C,#F97316);color:#fff;font-size:22px;font-weight:800;position:relative}
.imphead .impbell{display:inline-flex;animation:impring 1.6s ease-in-out infinite;transform-origin:50% 10%}
.imphead .impback{position:absolute;inset-inline-start:10px;top:50%;transform:translateY(-50%);border:0;background:rgba(255,255,255,.25);color:#fff;border-radius:999px;padding:6px 12px;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer}
.impbody{flex:1;overflow:auto;padding:16px 14px;-webkit-overflow-scrolling:touch}
.impcard{background:#fff;border:3px solid #FFC078;border-radius:22px;padding:16px 12px;text-align:center;margin-bottom:14px;box-shadow:0 6px 16px rgba(249,115,22,.15)}
.impcard .avatar{border-width:5px!important;box-shadow:0 0 0 4px #FFE2BF}
.impwho{font-size:24px;font-weight:800;color:#9A3412;margin-top:10px}
.impsub{font-size:18px;color:#C2410C;font-weight:700;margin:2px 0 12px}
.impbtn{display:block;width:100%;border:0;border-radius:16px;padding:14px;font-weight:800;font-size:19px;font-family:inherit;color:#fff;background:linear-gradient(135deg,#FF9F1C,#F97316);box-shadow:0 5px 0 #C2410C;cursor:pointer}
.impbtn:active{transform:translateY(3px);box-shadow:0 2px 0 #C2410C}
.impbtn:disabled{opacity:.6}
.impbtn.alt{background:#fff;color:#C2410C;border:3px solid #FF8A00;box-shadow:none;font-size:16px;padding:10px}
.imptitle{text-align:center;font-size:19px;font-weight:800;color:#9A3412;margin:0 0 12px}
.impwhohead{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.impwhohead b{font-size:20px;color:#9A3412}.impwhohead small{display:block;color:#C2410C;font-weight:700}
.impmsg{background:#fff;border:2px solid #FFD2A1;border-radius:18px;padding:10px 12px;margin-bottom:10px}
.impmsg time{display:block;font-size:13px;color:#B45309;margin-bottom:4px}
.impmsg p{margin:0;font-size:19px;line-height:1.45;white-space:pre-wrap;word-break:break-word;color:#1F2937}
.impmsg img.impimg{display:block;max-width:100%;max-height:300px;border-radius:14px;margin:6px 0;cursor:zoom-in}
.impquote{background:#FFF1DD;border-inline-start:4px solid #FF8A00;border-radius:10px;padding:6px 10px;margin-bottom:8px;font-size:14px;color:#7C2D12}
.impreply{margin-top:14px;border-top:3px dashed #FFC078;padding-top:12px}
.impreply textarea{width:100%;box-sizing:border-box;min-height:84px;border:3px solid #FFC078;border-radius:16px;padding:10px;font-size:18px;font-family:inherit;resize:none;background:#fff}
.impreply textarea:focus{outline:none;border-color:#FF8A00}
.imptools{display:flex;gap:8px;margin:8px 0;align-items:center}
.imptool{border:2px solid #FFC078;background:#fff;color:#C2410C;border-radius:14px;padding:8px 12px;font-weight:700;font-size:15px;font-family:inherit;display:inline-flex;gap:6px;align-items:center;cursor:pointer}
.imppv{position:relative;display:inline-block}.imppv img{width:70px;height:70px;object-fit:cover;border-radius:12px;border:2px solid #FFC078}
.imppv button{position:absolute;top:-8px;inset-inline-end:-8px;width:26px;height:26px;border-radius:50%;border:0;background:#C2410C;color:#fff;font-size:16px;line-height:1;cursor:pointer}
.toast{z-index:700!important}
.impzoom{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:10px}
.impzoom img{max-width:100%;max-height:100%;border-radius:12px}
.impnote{font-size:13px;color:#9A3412;text-align:center;margin:6px 0 10px}
@keyframes imppop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes impfade{from{opacity:0}to{opacity:1}}
@keyframes impglow{0%,100%{box-shadow:0 0 0 4px rgba(255,138,0,.30),0 18px 50px rgba(0,0,0,.45)}50%{box-shadow:0 0 0 9px rgba(255,138,0,.45),0 18px 50px rgba(0,0,0,.45)}}
@keyframes impring{0%,60%,100%{transform:rotate(0)}10%{transform:rotate(18deg)}20%{transform:rotate(-16deg)}30%{transform:rotate(12deg)}40%{transform:rotate(-8deg)}50%{transform:rotate(4deg)}}
`;

export const impWhen = iso => { const d = new Date(iso); return `${ilDate(d) === ilDate(new Date()) ? 'היום' : ilDate(d).split('-').reverse().join('.')} · ${ilTime(d)}`; };

export function startImportant(me, profiles) {
  if (!me || me.is_user === false || window.__impStarted) return;
  window.__impStarted = true;
  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);

  /* מצב תצוגה מקדימה (מנהלים): חלונית לדוגמה על גבי הדף, בלי לשלוח או לשמור כלום */
  let preview = null, pvUnread = [], pvMsgs = [];
  try { const raw = sessionStorage.getItem('impPreview'); if (raw) { sessionStorage.removeItem('impPreview'); preview = JSON.parse(raw); } } catch (_) {}
  if (preview) {
    const texts = ['היי! זו הודעה לדוגמה, כך תיראה הודעה חשובה אצל הנמען.', 'עוד הודעה לדוגמה: מתי חוזרים הביתה?'];
    (preview.senders || []).forEach((sid, i) => {
      const at = new Date(Date.now() - 60000 * (i + 1)).toISOString();
      pvUnread.push({ id: 'pv-' + sid, sender_id: sid, created_at: at });
      pvMsgs.push({ id: 'pv-' + sid, sender_id: sid, body: texts[i % texts.length], photo_path: null, parent_id: null, created_at: at });
    });
  }
  let ov = null, view = 'list', curSender = null, shownIds = '', busy = false, photoBlob = null, photoUrl = null, unread = [];

  const close = () => { if (ov) { ov.remove(); ov = null; document.body.style.overflow = ''; } view = 'list'; curSender = null; shownIds = ''; };
  const ensure = () => {
    if (ov) return ov;
    ov = document.createElement('div'); ov.className = 'impov';
    document.body.append(ov); document.body.style.overflow = 'hidden';
    return ov;
  };
  const frame = (inner, back) => {
    ensure().innerHTML = `<div class="impbox"><div class="imphead">${back ? '<button class="impback" id="impBack" type="button">חזרה</button>' : ''}<span class="impbell">${icon('bell', 28)}</span><span>הודעה חשובה</span></div><div class="impbody" id="impBody">${inner}</div></div>`;
    ov.querySelector('#impBack')?.addEventListener('click', () => { view = 'list'; curSender = null; shownIds = ''; renderList(); });
    return ov.querySelector('#impBody');
  };

  function groups() {
    const g = new Map();
    unread.forEach(u => { if (!g.has(u.sender_id)) g.set(u.sender_id, []); g.get(u.sender_id).push(u); });
    return [...g.entries()];
  }
  function renderList() {
    const gs = groups(); if (!gs.length) { close(); return; }
    const body = frame(`${gs.length > 1 ? '<p class="imptitle">יש לך הודעות חשובות</p>' : ''}${gs.map(([sid, arr]) => {
      const p = byId[sid];
      return `<div class="impcard">${avatar(p, 96)}<div class="impwho">${esc(p?.name || 'מישהו')}</div>
        <div class="impsub">יש לך הודעה חדשה${arr.length > 1 ? ` (${arr.length})` : ''}</div>
        <button class="impbtn" type="button" data-s="${sid}">קרא הודעה</button></div>`;
    }).join('')}<p class="impnote">החלונית תישאר עד שתענו לכל ההודעות</p>`);
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => openConv(b.dataset.s));
  }

  async function openConv(sid, keepText) {
    const mine = unread.filter(u => u.sender_id === sid); if (!mine.length) { view = 'list'; renderList(); return; }
    const ids = mine.map(u => u.id);
    const { data: msgs, error } = preview ? { data: pvMsgs.filter(m => ids.includes(m.id)), error: null } : await supabase.from('important_msgs').select('id,sender_id,body,photo_path,parent_id,created_at').in('id', ids).order('created_at');
    if (error || !msgs) { showToast('לא הצלחנו לטעון את ההודעה', true); return; }
    msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const pids = [...new Set(msgs.map(m => m.parent_id).filter(Boolean))];
    const parents = pids.length && !preview ? ((await supabase.from('important_msgs').select('id,body,photo_path').in('id', pids)).data || []) : [];
    const pById = Object.fromEntries(parents.map(p => [p.id, p]));
    const urls = await signedUrls(msgs.map(m => m.photo_path));
    if (!preview) supabase.from('important_reads').upsert(ids.map(id => ({ msg_id: id, user_id: me.id, done: false })), { onConflict: 'msg_id,user_id', ignoreDuplicates: true }).then(() => {}, () => {});
    const keep = keepText ? ov?.querySelector('#impText')?.value || '' : '';
    view = 'conv'; curSender = sid; shownIds = ids.join(',');
    const p = byId[sid];
    const body = frame(`<div class="impwhohead">${avatar(p, 60)}<div><b>${esc(p?.name || 'מישהו')}</b><small>שלח/ה לך הודעה חשובה</small></div></div>
      ${msgs.map(m => {
        const q = m.parent_id && pById[m.parent_id];
        return `<div class="impmsg"><time>${impWhen(m.created_at)}</time>
          ${q ? `<div class="impquote">בתגובה להודעה שלך: ${esc((q.body || '📷 תמונה').slice(0, 80))}</div>` : ''}
          ${m.photo_path && urls[m.photo_path] ? `<img class="impimg" src="${urls[m.photo_path]}" alt="תמונה">` : ''}
          ${m.body ? `<p>${esc(m.body)}</p>` : ''}</div>`;
      }).join('')}
      <div class="impreply">
        <textarea id="impText" maxlength="1000" placeholder="כתבו תשובה ל${esc(p?.name || '')}...">${esc(keep)}</textarea>
        <div class="imptools">
          <button class="imptool" id="impCam" type="button">${icon('camera', 20)} צילום</button>
          <button class="imptool" id="impGal" type="button">${icon('image', 20)} תמונה</button>
          <span id="impPv"></span>
        </div>
        <input type="file" id="impFileC" accept="image/*" capture="environment" hidden>
        <input type="file" id="impFileG" accept="image/*" hidden>
        <button class="impbtn" id="impSend" type="button">שליחת תשובה</button>
        <p class="impnote">התשובה נשלחת רק ל${esc(p?.name || '')}</p>
        <button class="impbtn alt" id="impDone" type="button">קראתי, בלי תשובה</button>
      </div>`, true);
    const showPv = () => { $('impPv').innerHTML = photoUrl ? `<span class="imppv"><img src="${photoUrl}" alt=""><button type="button" id="impRm" aria-label="הסרה">×</button></span>` : ''; $('impRm')?.addEventListener('click', () => { photoBlob = null; photoUrl = null; showPv(); }); };
    const $ = id => ov.querySelector('#' + id);
    showPv();
    body.querySelectorAll('.impimg').forEach(im => im.onclick = () => { const z = document.createElement('div'); z.className = 'impzoom'; z.innerHTML = `<img src="${im.src}" alt="">`; z.onclick = () => z.remove(); document.body.append(z); });
    $('impCam').onclick = () => $('impFileC').click(); $('impGal').onclick = () => $('impFileG').click();
    for (const id of ['impFileC', 'impFileG']) $(id).onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { photoBlob = await shrinkImage(f); photoUrl = URL.createObjectURL(photoBlob); showPv(); } catch (_) { showToast('התמונה לא נטענה', true); }
    };
    const finish = async (reply) => {
      if (busy) return;
      const txt = $('impText').value.trim();
      if (reply && !txt && !photoBlob) { showToast('כתבו תשובה או צרפו תמונה', true); return; }
      busy = true; $('impSend').disabled = true; $('impDone').disabled = true;
      try {
        if (preview) {
          pvUnread = pvUnread.filter(u => u.sender_id !== sid);
          showToast('זו הייתה תצוגה בלבד, לא נשלח ולא נשמר כלום');
          busy = false; view = 'list'; curSender = null; shownIds = ''; photoBlob = null; photoUrl = null;
          await check(true); return;
        }
        if (reply) {
          let path = null;
          if (photoBlob) {
            path = `reports/${me.id}/imp-${crypto.randomUUID()}.jpg`;
            const up = await supabase.storage.from('photos').upload(path, photoBlob, { contentType: 'image/jpeg', upsert: false });
            if (up.error) throw new Error('upload');
          }
          const ins = await supabase.from('important_msgs').insert({ to_users: [sid], body: txt || null, photo_path: path, parent_id: ids[ids.length - 1] });
          if (ins.error) throw new Error('send');
        }
        const dn = await supabase.from('important_reads').upsert(ids.map(id => ({ msg_id: id, user_id: me.id, done: true })), { onConflict: 'msg_id,user_id' });
        if (dn.error) throw new Error('done');
        photoBlob = null; photoUrl = null;
        showToast(reply ? 'התשובה נשלחה' : 'סומן כנקרא');
        busy = false; view = 'list'; curSender = null; shownIds = '';
        await check(true);
      } catch (_) { busy = false; showToast('הפעולה נכשלה, נסו שוב', true); const s = ov?.querySelector('#impSend'); if (s) { s.disabled = false; ov.querySelector('#impDone').disabled = false; } }
    };
    $('impSend').onclick = () => finish(true);
    $('impDone').onclick = () => finish(false);
  }

  async function check(force) {
    if (busy) return;
    const { data, error } = preview ? { data: pvUnread, error: null } : await supabase.rpc('my_unread_important');
    if (error) return;
    unread = data || [];
    if (!unread.length) { close(); return; }
    if (view === 'conv' && curSender) {
      const ids = unread.filter(u => u.sender_id === curSender).map(u => u.id).join(',');
      if (!ids) { view = 'list'; curSender = null; shownIds = ''; renderList(); }
      else if (ids !== shownIds) openConv(curSender, true);
      return;
    }
    if (force || !ov || view === 'list') renderList();
  }

  check();
  if (!preview) try {
    supabase.channel('imp-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'important_msgs' }, p => { if ((p.new?.to_users || []).includes(me.id)) check(); })
      .subscribe();
  } catch (_) {}
  setInterval(() => { if (!document.hidden) check(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}
