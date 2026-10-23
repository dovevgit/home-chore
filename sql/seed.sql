-- נתוני דוגמה ל-Milestone 1. מריצים ב-SQL Editor אחרי schema.sql.
-- בני משפחה אמיתיים נוצרים דרך Authentication > Users ואז שורת profiles (כמו שעשינו לאבא).
insert into public.profiles (name, role, is_user, color)
select 'טוי', 'member', false, '#3AB5FF'
where not exists (select 1 from public.profiles where name = 'טוי' and is_user = false);

-- משימות להיום (שעון ישראל)
insert into public.tasks (kind, title, description, points, times_required, repeat, occurrence_date)
select 'occurrence', t.title, t.descr, t.points, t.times, 'once',
       (now() at time zone 'Asia/Jerusalem')::date
from (values
  ('להוציא את טוי', 'טיול קצר בחוץ', 10, 3),
  ('לעשות כלים', 'לשטוף ולסדר במייבש', 15, 1),
  ('לרוקן את הפח', 'להחליף שקית ולהוציא לפח הגדול', 10, 1),
  ('לסדר את החדר', 'רצפה פנויה, מיטה מסודרת', 20, 1)
) as t(title, descr, points, times)
where not exists (
  select 1 from public.tasks x
  where x.title = t.title and x.occurrence_date = (now() at time zone 'Asia/Jerusalem')::date
);
