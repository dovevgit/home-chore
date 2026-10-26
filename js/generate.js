// יצירת משימות היום והשבוע מתוך ההגדרות (template -> occurrence).
// זו אותה לוגיקה ש-n8n יריץ אוטומטית בהמשך. כרגע המנהל מפעיל אותה בכפתור.
// בטוחה להרצה חוזרת: אינדקס ייחודי (template_id, occurrence_date) מונע כפילות.
import { supabase, ilDate, addDays, dow, toIsraelDate, weekStart } from './common.js';

export function dueAt(t, date, time, ws) {
  if (t.repeat === 'weekly') {
    for (let k = 0; k <= 7; k++) {
      const d = addDays(ws.dateStr, k);
      if (dow(d) === t.weekday) {
        const inst = toIsraelDate(d, time);
        if (inst > ws.start) return inst.toISOString();
      }
    }
  }
  return toIsraelDate(date, time).toISOString();
}

// משימה יומית שנוצרת באמצע היום: חזרות ששעתן כבר עברה לא נוצרות להיום (כדי שלא יופיע איחור מיידי).
export function keepFuture(t, slots, now = new Date()) {
  if (t.repeat !== 'daily') return slots;
  return slots.filter(s => new Date(s.due_at) > now).map((s, i) => ({ ...s, n: i + 1 }));
}

export async function generateOccurrences(createdBy) {
  const now = new Date();
  const today = ilDate(now);
  const ws = weekStart(now);
  const { data: templates, error } = await supabase.from('tasks').select('*').eq('kind', 'template').eq('active', true);
  if (error) throw error;
  let created = 0, skipped = 0, past = 0;
  // מחליפים שההורים בחרו מראש ליום מסוים (התנגשות יומן)
  const ov = {};
  try {
    const { data: cs } = await supabase.from('task_conflicts').select('template_id,slot_n,date,substitute_id').eq('ref_kind', 'template').eq('status', 'resolved').gte('date', today);
    for (const c of cs || []) if (c.substitute_id) ov[c.template_id + '|' + c.slot_n + '|' + c.date] = c.substitute_id;
  } catch (e) { /* בלי הרשאה או בלי הטבלה: ממשיכים רגיל */ }
  const lastDay = addDays(ws.dateStr, 7); // יום שישי הבא: כל השבוע מוצג מראש
  const days = [];
  for (let d = today; d <= lastDay; d = addDays(d, 1)) days.push(d);
  for (const t of templates || []) {
    if (t.repeat !== 'daily' && t.repeat !== 'weekly') continue;
    for (const date of (t.repeat === 'daily' ? days : [ws.dateStr])) {
      const all = (t.slots || []).map((s, i) => {
        const due = dueAt(t, date, s.due_time, ws);
        return {
          n: i + 1, assignee_id: ov[t.id + '|' + (i + 1) + '|' + ilDate(new Date(due))] || s.exc?.[dow(ilDate(new Date(due)))] || s.assignee_id, due_at: due,
          reminded: false, overdue_notified: false, penalized: false
        };
      });
      const slots = keepFuture(t, all, now);
      if (!slots.length) { past++; continue; }
      const row = {
        kind: 'occurrence', template_id: t.id, subject_id: t.subject_id, title: t.title, description: t.description,
        tips: t.tips, room: t.room, icon: t.icon, color: t.color, points: t.points, requires_photo: t.requires_photo,
        times_required: t.repeat === 'daily' ? slots.length : t.times_required, repeat: t.repeat, weekday: t.weekday, late_fraction: t.late_fraction,
        penalty_points: t.penalty_points, remind_before_minutes: t.remind_before_minutes,
        reminder_text: t.reminder_text, overdue_text: t.overdue_text, slots, occurrence_date: date, created_by: createdBy
      };
      const { error: e } = await supabase.from('tasks').insert(row);
      if (!e) created++;
      else if (e.code === '23505') skipped++;
      else throw e;
    }
  }
  return { created, skipped, past };
}

export function buildSlots(t, date, ws) {
  return (t.slots || []).map((s, i) => ({
    n: i + 1, assignee_id: s.exc?.[dow(date)] || s.assignee_id, due_at: dueAt(t, date, s.due_time, ws),
    reminded: false, overdue_notified: false, penalized: false
  }));
}

const COPY = ['subject_id','room','title','description','tips','icon','color','points','requires_photo','times_required','late_fraction',
  'penalty_points','remind_before_minutes','reminder_text','overdue_text'];

// אחרי עריכת הגדרה: מעדכן את המשימות של היום/השבוע שנוצרו ממנה.
// חזרה שכבר דווחה לא משתנה בשעה ובאחראי (כדי לא לשבש היסטוריה).
export async function syncOccurrences(template) {
  const ws = weekStart(new Date());
  const { data: occs } = await supabase.from('tasks').select('id,occurrence_date,slots').eq('template_id', template.id).gte('occurrence_date', ws.dateStr);
  let updated = 0;
  for (const o of occs || []) {
    const { count } = await supabase.from('feed').select('id', { count: 'exact', head: true }).eq('type', 'report').eq('task_id', o.id);
    const patch = {};
    for (const k of COPY) patch[k] = template[k];
    if (!count) {
      const s = keepFuture(template, buildSlots(template, o.occurrence_date, ws));
      if (s.length) { patch.slots = s; patch.times_required = template.repeat === 'daily' ? s.length : template.times_required; }
      else { delete patch.times_required; }
      patch.weekday = template.weekday;
    }
    const { error } = await supabase.from('tasks').update(patch).eq('id', o.id);
    if (!error) updated++;
  }
  return updated;
}
