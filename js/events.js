// בדיקת התנגשות בין שיבוץ משימה לבין פעילויות בלוח השנה.
import { supabase, ilDate, addDays, dow } from './common.js';

export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const hm = t => String(t || '').slice(0, 5);

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
      let day = null;
      if (e.repeat === 'weekly') {
        if (repeat === 'once' ? dow(date) === e.weekday : repeat === 'weekly' ? weekday === e.weekday : true) day = `יום ${WEEKDAYS[e.weekday]}`;
      } else if (e.event_date >= today) {
        const ok = repeat === 'once' ? e.event_date === date
          : repeat === 'weekly' ? dow(e.event_date) === weekday && e.event_date <= addDays(today, 14)
          : e.event_date <= horizon;
        if (ok) day = e.event_date.split('-').reverse().join('.');
      }
      if (day) out.add(`${name(s.assignee_id)} בפעילות "${e.title}" (${day}, ${hm(e.start_time)}–${hm(e.end_time)}), והמשימה נקבעה ל-${s.time}`);
    }
  }
  return [...out];
}
