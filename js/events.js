// בדיקת התנגשות בין שיבוץ משימה לבין פעילויות בלוח השנה.
import { supabase, ilDate, addDays, dow } from './common.js';

export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const hm = t => String(t || '').slice(0, 5);

// האם פעילות e מתנגשת עם שיבוץ לפי סוג החזרה. מחזיר טקסט של היום (למשל "יום שלישי") או null.
function hitDay(e, { repeat, weekday, date }, today, horizon) {
  if (e.repeat === 'weekly') {
    if (repeat === 'once' ? dow(date) === e.weekday : repeat === 'weekly' ? weekday === e.weekday : true) return `יום ${WEEKDAYS[e.weekday]}`;
    return null;
  }
  if (e.event_date >= today) {
    const ok = repeat === 'once' ? e.event_date === date
      : repeat === 'weekly' ? dow(e.event_date) === weekday && e.event_date <= addDays(today, 14)
      : e.event_date <= horizon;
    if (ok) return e.event_date.split('-').reverse().join('.');
  }
  return null;
}

export async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*');
  return error || !data ? [] : data;
}

// מי פנוי בשעה מסוימת: מחזיר {userId: null | {title, day, from, to}}
export function availability(events, { repeat, weekday, date }, time, userIds) {
  const today = ilDate(new Date()), horizon = addDays(today, 7), out = {};
  for (const id of userIds) {
    out[id] = null;
    for (const e of events.filter(x => x.user_id === id)) {
      if (!(hm(e.start_time) <= time && time < hm(e.end_time))) continue;
      const day = hitDay(e, { repeat, weekday, date }, today, horizon);
      if (day) { out[id] = { title: e.title, day, from: hm(e.start_time), to: hm(e.end_time) }; break; }
    }
  }
  return out;
}

// repeat: 'once' | 'weekly' | 'daily'. slots: [{assignee_id, time:'HH:MM'}]. מחזיר מערך הודעות (ריק = אין התנגשות).
export async function findConflicts({ repeat, weekday, date, slots }, profiles) {
  const ids = [...new Set(slots.map(s => s.assignee_id))];
  const { data, error } = await supabase.from('events').select('*').in('user_id', ids);
  if (error || !data) return [];
  const today = ilDate(new Date()), horizon = addDays(today, 7);
  const name = id => profiles.find(p => p.id === id)?.name || '';
  const out = new Set();
  for (const s of slots) {
    for (const e of data.filter(x => x.user_id === s.assignee_id)) {
      if (!(hm(e.start_time) <= s.time && s.time < hm(e.end_time))) continue;
      const day = hitDay(e, { repeat, weekday, date }, today, horizon);
      if (day) out.add(`${name(s.assignee_id)} בפעילות "${e.title}" (${day}, ${hm(e.start_time)}–${hm(e.end_time)}), והמשימה נקבעה ל-${s.time}`);
    }
  }
  return [...out];
}
