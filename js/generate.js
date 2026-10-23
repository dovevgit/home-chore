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

export async function generateOccurrences(createdBy) {
  const now = new Date();
  const today = ilDate(now);
  const ws = weekStart(now);
  const { data: templates, error } = await supabase.from('tasks').select('*').eq('kind', 'template').eq('active', true);
  if (error) throw error;
  let created = 0, skipped = 0;
  for (const t of templates || []) {
    if (t.repeat !== 'daily' && t.repeat !== 'weekly') continue;
    const date = t.repeat === 'daily' ? today : ws.dateStr;
    const slots = (t.slots || []).map((s, i) => ({
      n: i + 1, assignee_id: s.assignee_id, due_at: dueAt(t, date, s.due_time, ws),
      reminded: false, overdue_notified: false, penalized: false
    }));
    const row = {
      kind: 'occurrence', template_id: t.id, subject_id: t.subject_id, title: t.title, description: t.description,
      tips: t.tips, icon: t.icon, color: t.color, points: t.points, requires_photo: t.requires_photo,
      times_required: t.times_required, repeat: t.repeat, weekday: t.weekday, late_fraction: t.late_fraction,
      penalty_points: t.penalty_points, remind_before_minutes: t.remind_before_minutes,
      reminder_text: t.reminder_text, overdue_text: t.overdue_text, slots, occurrence_date: date, created_by: createdBy
    };
    const { error: e } = await supabase.from('tasks').insert(row);
    if (!e) created++;
    else if (e.code === '23505') skipped++;
    else throw e;
  }
  return { created, skipped };
}

export function buildSlots(t, date, ws) {
  return (t.slots || []).map((s, i) => ({
    n: i + 1, assignee_id: s.assignee_id, due_at: dueAt(t, date, s.due_time, ws),
    reminded: false, overdue_notified: false, penalized: false
  }));
}

const COPY = ['subject_id','title','description','tips','icon','color','points','requires_photo','times_required','late_fraction',
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
      patch.slots = buildSlots(template, o.occurrence_date, ws);
      patch.weekday = template.weekday;
    }
    const { error } = await supabase.from('tasks').update(patch).eq('id', o.id);
    if (!error) updated++;
  }
  return updated;
}
