-- הבית שלנו: schema.sql
-- להרצה ב-Supabase: SQL Editor > New query > הדבק > Run
-- אפשר להריץ שוב: הקובץ בנוי כך שלא ייכשל על דברים שכבר קיימים.

-- ========== טבלאות ==========

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),   -- למשתמש מחובר: זהה ל-id ב-Auth
  name text not null,
  role text not null default 'member' check (role in ('admin','member')),
  is_user boolean not null default true,           -- false עבור טוי
  avatar_path text,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('template','occurrence')),
  template_id uuid references public.tasks(id),
  subject_id uuid references public.profiles(id),
  title text not null,
  description text,
  tips text,
  icon text,
  color text,
  points integer not null default 0 check (points >= 0),
  requires_photo boolean not null default false,
  times_required integer not null default 1 check (times_required >= 1),
  repeat text not null default 'daily' check (repeat in ('daily','weekly','once')),
  weekday integer check (weekday between 0 and 6),
  late_fraction numeric not null default 0.5 check (late_fraction between 0 and 1),
  penalty_points integer not null default 0 check (penalty_points >= 0),
  remind_before_minutes integer,
  reminder_text text,
  overdue_text text,
  slots jsonb not null default '[]'::jsonb,
  occurrence_date date,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- מונע יצירה כפולה של אותה משימה ליום
create unique index if not exists tasks_template_day_uniq
  on public.tasks (template_id, occurrence_date)
  where template_id is not null;
create index if not exists tasks_occurrence_date_idx on public.tasks (occurrence_date);

create table if not exists public.feed (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('report','chat','system','penalty','champion')),
  user_id uuid references public.profiles(id),
  task_id uuid references public.tasks(id),
  body text,
  photo_path text,
  payload jsonb,
  created_at timestamptz not null default now()    -- שעת שרת = שעת הביצוע
);
create index if not exists feed_created_at_idx on public.feed (created_at);
create index if not exists feed_task_id_idx on public.feed (task_id);

-- ========== פונקציית עזר: האם המשתמש המחובר הוא מנהל ==========
-- security definer כדי שלא תיווצר לולאה בהרשאות של profiles
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ========== הרשאות (Grants) ==========
-- "Automatically expose new tables" כבוי, לכן מגדירים במפורש.
-- אנונימי: אין גישה לכלום.
revoke all on public.profiles, public.tasks, public.feed from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert on public.feed to authenticated;   -- הוספה בלבד

grant all on public.profiles, public.tasks, public.feed to service_role;  -- n8n

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.feed enable row level security;

-- profiles: קריאה לכל מחובר, כתיבה למנהל
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- tasks: קריאה לכל מחובר, כתיבה למנהל
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks
  for select to authenticated using (true);

drop policy if exists tasks_admin_write on public.tasks;
create policy tasks_admin_write on public.tasks
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- feed: קריאה לכל מחובר. הוספה רק של report/chat בשם עצמי.
-- אין update ואין delete לאף משתמש (גם לא מנהל) מהממשק.
drop policy if exists feed_read on public.feed;
create policy feed_read on public.feed
  for select to authenticated using (true);

drop policy if exists feed_insert_own on public.feed;
create policy feed_insert_own on public.feed
  for insert to authenticated
  with check (type in ('report','chat') and user_id = auth.uid());

-- ========== Storage: bucket פרטי ל-photos ==========
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');

-- העלאה רק לתיקייה שלי: reports/{user_id}/...
drop policy if exists photos_upload_own on storage.objects;
create policy photos_upload_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and name like 'reports/' || auth.uid()::text || '/%'
  );

-- תמונות פרופיל: מנהל בלבד, avatars/...
drop policy if exists photos_avatars_admin on storage.objects;
create policy photos_avatars_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and name like 'avatars/%' and public.is_admin());

-- ========== Realtime: רק feed ==========
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feed'
  ) then
    alter publication supabase_realtime add table public.feed;
  end if;
end $$;
