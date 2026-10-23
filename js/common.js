import { supabase } from './supabase.js';
import { ICONS } from './icons.js';
export { supabase };

export const TZ = 'Asia/Jerusalem';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function icon(name, size = 22) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.sparkles}</svg>`;
}

/* ---------- זמן (שעון ישראל) ---------- */
function ilParts(date) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const o = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second };
}
export const ilDate = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
export const ilTime = (date) => { const p = ilParts(date); return String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0'); };
export function dow(dateStr) { const [y, m, d] = dateStr.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
// תאריך ושעה מקומיים בישראל -> רגע מוחלט (Date)
export function toIsraelDate(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const target = Date.UTC(y, m - 1, d, h, mi);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = ilParts(new Date(guess));
    const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - guess;
    guess = target - offset;
  }
  return new Date(guess);
}
// תחילת השבוע: יום שישי 12:00 האחרון (שעון ישראל)
export function weekStart(now = new Date()) {
  const today = ilDate(now);
  let back = (dow(today) - 5 + 7) % 7;
  let dateStr = addDays(today, -back);
  let start = toIsraelDate(dateStr, '12:00');
  if (start > now) { dateStr = addDays(dateStr, -7); start = toIsraelDate(dateStr, '12:00'); }
  return { dateStr, start, end: toIsraelDate(addDays(dateStr, 7), '12:00') };
}

/* ---------- סטטוס נגזר ---------- */
export const STATUS = {
  waiting:  { label: 'ממתין',  cls: 's-waiting',  icon: 'clock' },
  progress: { label: 'בתהליך', cls: 's-progress', icon: 'clock' },
  done:     { label: 'בוצע',   cls: 's-done',     icon: 'check' },
  overdue:  { label: 'באיחור', cls: 's-overdue',  icon: 'triangle-alert' }
};
export function deriveStatus(task, reportCount, now = new Date()) {
  if (reportCount >= (task.times_required || 1)) return 'done';
  const pending = (task.slots || []).slice(reportCount);
  if (pending.some(s => s.due_at && new Date(s.due_at) < now)) return 'overdue';
  return reportCount > 0 ? 'progress' : 'waiting';
}
export const nextSlot = (task, reportCount) => (task.slots || [])[reportCount] || null;

export async function reportCounts(taskIds) {
  const map = {};
  if (!taskIds.length) return map;
  const { data } = await supabase.from('feed').select('task_id').eq('type', 'report').in('task_id', taskIds);
  for (const r of data || []) map[r.task_id] = (map[r.task_id] || 0) + 1;
  return map;
}

/* ---------- צבעי כרטיס לפי קטגוריה ---------- */
export const CARD_COLORS = {
  yellow: { bg: '#FFE9B0', fg: '#B45309', name: 'צהוב (הכלב)' },
  blue:   { bg: '#CFE6FF', fg: '#0A58CA', name: 'כחול (כלים, פח)' },
  purple: { bg: '#E3D8FF', fg: '#5B2FC9', name: 'סגול (חדרים)' },
  orange: { bg: '#FFD9BF', fg: '#B23C00', name: 'כתום (ניקיון)' },
  green:  { bg: '#CDEFD2', fg: '#166534', name: 'ירוק (לימודים)' }
};
export function iconBox(task, size = 46) {
  const c = CARD_COLORS[task.color] || CARD_COLORS.blue;
  return `<span class="ibox" style="width:${size}px;height:${size}px;background:${c.bg};color:${c.fg}">${icon(task.icon || 'sparkles', Math.round(size * 0.52))}</span>`;
}

/* ---------- תמונות בני משפחה (בינתיים: ראשי תיבות) ---------- */
export function avatar(p, size = 36) {
  if (!p) return `<span class="avatar" style="width:${size}px;height:${size}px"></span>`;
  const border = p.color || '#3AB5FF';
  const init = esc((p.name || '?').trim().slice(0, 1));
  return `<span class="avatar" title="${esc(p.name)}" style="width:${size}px;height:${size}px;border-color:${border};font-size:${Math.round(size * 0.46)}px">${init}</span>`;
}

/* ---------- מעטפת העמוד: כותרת, תפריט תחתון, מגירה ---------- */
export async function initPage({ active = '', title = '', back = null, menu = true } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('login.html'); await new Promise(() => {}); }
  const { data: profiles } = await supabase.from('profiles').select('*').eq('active', true).order('created_at');
  const me = (profiles || []).find(p => p.id === session.user.id) || null;
  const isAdmin = me?.role === 'admin';

  const header = document.createElement('header');
  header.className = 'bar';
  header.innerHTML = back
    ? `<a class="iconbtn" href="${back}" aria-label="חזרה">${icon('arrow-right', 26)}</a><h1>${esc(title)}</h1><span class="iconbtn ghost"></span>`
    : `<h1>${esc(title)}</h1>${menu ? `<button class="iconbtn" id="menuBtn" aria-label="תפריט">${icon('menu', 26)}</button>` : ''}`;
  document.body.prepend(header);

  if (!back) {
    const drawer = document.createElement('div');
    drawer.className = 'drawer hidden';
    drawer.innerHTML = `<div class="drawer-bg"></div><nav class="drawer-panel">
      <a href="index.html">${icon('house')} בית</a>
      <a href="tasks.html?me=1">${icon('list-checks')} המשימות שלי</a>
      ${isAdmin ? `<a href="admin.html">${icon('settings')} ניהול</a>` : ''}
      <button id="logout" type="button">${icon('log-out')} התנתקות</button></nav>`;
    document.body.append(drawer);
    document.getElementById('menuBtn')?.addEventListener('click', () => drawer.classList.remove('hidden'));
    drawer.querySelector('.drawer-bg').addEventListener('click', () => drawer.classList.add('hidden'));
    drawer.querySelector('#logout').addEventListener('click', async () => { await supabase.auth.signOut(); location.replace('login.html'); });

    const nav = document.createElement('nav');
    nav.className = 'tabbar';
    nav.innerHTML = `
      <a href="index.html" class="${active === 'home' ? 'on' : ''}">${icon('house', 26)}<span>בית</span></a>
      <a href="tasks.html" class="${active === 'tasks' ? 'on' : ''}">${icon('list-checks', 26)}<span>משימות</span></a>
      <span class="soon" title="בקרוב">${icon('history', 26)}<span>היסטוריה</span></span>`;
    document.body.append(nav);
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  return { session, me, profiles: profiles || [], isAdmin };
}
