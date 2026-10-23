// נקודות שבועיות: מחושבות מהדיווחים ומהגדרות המשימה, לא נשמרות בטבלה.
import { supabase, weekStart, pointsFor } from './common.js';

// מחזיר { pointsByUser: {userId: n}, reports }
export async function weeklyPoints(now = new Date()) {
  const ws = weekStart(now);
  const { data: reps } = await supabase.from('feed').select('*').eq('type', 'report')
    .gte('created_at', ws.start.toISOString()).lt('created_at', ws.end.toISOString());
  const ids = [...new Set((reps || []).map(r => r.task_id))];
  const tasks = ids.length ? (await supabase.from('tasks').select('*').in('id', ids)).data || [] : [];
  const tById = Object.fromEntries(tasks.map(t => [t.id, t]));
  const pointsByUser = {};
  for (const r of reps || []) {
    const t = tById[r.task_id]; if (!t) continue;
    const slot = (t.slots || [])[(r.payload?.slot_n || 1) - 1];
    pointsByUser[r.user_id] = (pointsByUser[r.user_id] || 0) + pointsFor(t, slot, new Date(r.created_at)).points;
  }
  return { pointsByUser, ws };
}
