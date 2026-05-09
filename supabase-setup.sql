-- ═══════════════════════════════════════════
--  WMS Training System – Supabase Setup
--  Run once in Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1) TABLES

create table if not exists locations (
  id         serial primary key,
  code       text    not null unique,
  name       text    not null,
  created_at timestamptz default now()
);

create table if not exists categories (
  id          serial primary key,
  name        text    not null,
  description text    not null default '',
  icon        text    not null default 'box',
  color       text    not null default 'blue',
  site        text    not null default 'theme_1',
  created_at  timestamptz default now()
);

create table if not exists sessions (
  id          serial primary key,
  cat_id      integer references categories(id) on delete cascade,
  name        text    not null,
  date        date    not null,
  time_start  text    not null default '09:00',
  time_end    text    not null default '16:00',
  venue       text    not null default '',
  trainer     text    not null default '',
  capacity    integer not null default 20,
  site        text    not null default 'theme_1',
  created_at  timestamptz default now()
);

create table if not exists registrations (
  id            serial primary key,
  session_id    integer references sessions(id) on delete cascade,
  prefix        text    not null default '',
  fname         text    not null,
  lname         text    not null,
  position      text    not null default '',
  dept          text    not null default '',
  reg_date      date    not null default current_date,
  attended      boolean not null default false,
  attended_time text,
  created_at    timestamptz default now()
);

create table if not exists master_items (
  id          serial primary key,
  type        text    not null,  -- 'trainer' | 'venue' | 'dept' | 'prefix'
  value       text    not null,
  sort_order  integer not null default 0,
  site        text    not null default 'theme_1',
  unique(type, value, site)
);

create table if not exists admin_users (
  id            serial primary key,
  username      text    not null unique,
  password_hash text    not null,
  created_at    timestamptz default now()
);

create table if not exists login_verify (
  id           serial primary key,
  fname        text    not null,
  lname        text    not null,
  dept         text    not null default '',
  position     text    not null default '',
  login_status text    not null default 'pending',  -- 'has_login' | 'no_login' | 'disabled' | 'pending'
  notes        text    not null default '',
  site         text    not null default 'theme_1',
  created_at   timestamptz default now(),
  unique(fname, lname, dept, site)
);

-- 2) ADD MISSING COLUMNS (safe to run on existing DB)
alter table categories   add column if not exists site       text not null default 'theme_1';
alter table categories   add column if not exists banner_url text;
alter table sessions     add column if not exists site text not null default 'theme_1';
alter table master_items add column if not exists site text not null default 'theme_1';

-- 3a) STORAGE BUCKET for category banners
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('category-banners', 'category-banners', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "banner public read"   on storage.objects;
drop policy if exists "banner anon upload"   on storage.objects;
drop policy if exists "banner anon update"   on storage.objects;
drop policy if exists "banner anon delete"   on storage.objects;

create policy "banner public read"  on storage.objects for select using (bucket_id='category-banners');
create policy "banner anon upload"  on storage.objects for insert with check (bucket_id='category-banners');
create policy "banner anon update"  on storage.objects for update using (bucket_id='category-banners');
create policy "banner anon delete"  on storage.objects for delete using (bucket_id='category-banners');

-- 3) ROW LEVEL SECURITY (allow anon key full access – app handles auth)
alter table locations     enable row level security;
alter table categories    enable row level security;
alter table sessions      enable row level security;
alter table registrations enable row level security;
alter table master_items  enable row level security;
alter table admin_users   enable row level security;
alter table login_verify  enable row level security;

drop policy if exists "public_all" on locations;
drop policy if exists "public_all" on categories;
drop policy if exists "public_all" on sessions;
drop policy if exists "public_all" on registrations;
drop policy if exists "public_all" on master_items;
drop policy if exists "public_all" on admin_users;
drop policy if exists "public_all" on login_verify;

create policy "public_all" on locations     for all using (true) with check (true);
create policy "public_all" on categories    for all using (true) with check (true);
create policy "public_all" on sessions      for all using (true) with check (true);
create policy "public_all" on registrations for all using (true) with check (true);
create policy "public_all" on master_items  for all using (true) with check (true);
create policy "public_all" on admin_users   for all using (true) with check (true);
create policy "public_all" on login_verify  for all using (true) with check (true);

-- 4) SEED DATA (ข้อมูลตั้งต้น)
insert into master_items (type, value, sort_order, site) values
  ('prefix',  'นาย',      0, 'theme_1'),
  ('prefix',  'นาง',      1, 'theme_1'),
  ('prefix',  'นางสาว',   2, 'theme_1'),
  ('prefix',  'ดร.',      3, 'theme_1'),
  ('trainer', 'ทีม WMS Support',    0, 'theme_1'),
  ('trainer', 'คุณสมชาย ใจดี',     1, 'theme_1'),
  ('trainer', 'คุณวิไล รักษา',     2, 'theme_1'),
  ('trainer', 'คุณรัตนา เก่งกว่า', 3, 'theme_1'),
  ('venue',   'ห้องอบรม A',          0, 'theme_1'),
  ('venue',   'ห้องอบรม B',          1, 'theme_1'),
  ('venue',   'ห้องประชุมใหญ่',      2, 'theme_1'),
  ('venue',   'ออนไลน์ (Zoom)',      3, 'theme_1'),
  ('dept',    'คลังสินค้า',           0, 'theme_1'),
  ('dept',    'จัดซื้อ',              1, 'theme_1'),
  ('dept',    'ขนส่ง / โลจิสติกส์',  2, 'theme_1'),
  ('dept',    'บัญชี / การเงิน',      3, 'theme_1'),
  ('dept',    'ไอที',                  4, 'theme_1'),
  ('dept',    'ฝ่ายผลิต',             5, 'theme_1'),
  ('dept',    'ทรัพยากรบุคคล',       6, 'theme_1')
on conflict do nothing;
