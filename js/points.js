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
  try {
    const { data: rp } = await supabase.rpc('request_points', { p_since: ws.start.toISOString(), p_until: ws.end.toISOString() });
    for (const r of rp || []) pointsByUser[r.user_id] = (pointsByUser[r.user_id] || 0) + Number(r.pts);
  } catch (_) {}
  return { pointsByUser, ws };
}

// נקודות מצטברות מתחילת הדרך (לחנות): דיווחים + בקשות מיוחדות. מחזיר { earnedByUser }
export async function lifetimePoints() {
  const reps = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('feed').select('user_id,task_id,payload,created_at').eq('type', 'report').order('created_at').range(from, from + 999);
    if (error || !data || !data.length) break;
    reps.push(...data);
    if (data.length < 1000) break;
  }
  const ids = [...new Set(reps.map(r => r.task_id).filter(Boolean))];
  const tasks = [];
  for (let i = 0; i < ids.length; i += 80) {
    const { data } = await supabase.from('tasks').select('*').in('id', ids.slice(i, i + 80));
    tasks.push(...(data || []));
  }
  const tById = Object.fromEntries(tasks.map(t => [t.id, t]));
  const earnedByUser = {};
  for (const r of reps) {
    const t = tById[r.task_id]; if (!t) continue;
    const slot = (t.slots || [])[(r.payload?.slot_n || 1) - 1];
    earnedByUser[r.user_id] = (earnedByUser[r.user_id] || 0) + pointsFor(t, slot, new Date(r.created_at)).points;
  }
  try {
    const { data: rp } = await supabase.rpc('request_points', { p_since: '2000-01-01T00:00:00Z', p_until: '2100-01-01T00:00:00Z' });
    for (const r of rp || []) earnedByUser[r.user_id] = (earnedByUser[r.user_id] || 0) + Number(r.pts);
  } catch (_) {}
  return { earnedByUser };
}
