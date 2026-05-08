-- ═══════════════════════════════════════════
--  WMS Training System – Supabase Setup
--  Run once in Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1) TABLES
create table if not exists categories (
  id          serial primary key,
  name        text    not null,
  description text    not null default '',
  icon        text    not null default 'box',
  color       text    not null default 'blue',
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
  unique(type, value)
);

-- 2) ROW LEVEL SECURITY (allow anon key full access – app handles auth)
alter table categories    enable row level security;
alter table sessions      enable row level security;
alter table registrations enable row level security;
alter table master_items  enable row level security;

drop policy if exists "public_all" on categories;
drop policy if exists "public_all" on sessions;
drop policy if exists "public_all" on registrations;
drop policy if exists "public_all" on master_items;

create policy "public_all" on categories    for all using (true) with check (true);
create policy "public_all" on sessions      for all using (true) with check (true);
create policy "public_all" on registrations for all using (true) with check (true);
create policy "public_all" on master_items  for all using (true) with check (true);

-- 3) SEED DATA (ข้อมูลตั้งต้น)
insert into master_items (type, value, sort_order) values
  ('prefix',  'นาย',      0),
  ('prefix',  'นาง',      1),
  ('prefix',  'นางสาว',   2),
  ('prefix',  'ดร.',      3),
  ('trainer', 'ทีม WMS Support',    0),
  ('trainer', 'คุณสมชาย ใจดี',     1),
  ('trainer', 'คุณวิไล รักษา',     2),
  ('trainer', 'คุณรัตนา เก่งกว่า', 3),
  ('venue',   'ห้องอบรม A',          0),
  ('venue',   'ห้องอบรม B',          1),
  ('venue',   'ห้องประชุมใหญ่',      2),
  ('venue',   'ออนไลน์ (Zoom)',      3),
  ('dept',    'คลังสินค้า',           0),
  ('dept',    'จัดซื้อ',              1),
  ('dept',    'ขนส่ง / โลจิสติกส์',  2),
  ('dept',    'บัญชี / การเงิน',      3),
  ('dept',    'ไอที',                  4),
  ('dept',    'ฝ่ายผลิต',             5),
  ('dept',    'ทรัพยากรบุคคล',       6)
on conflict (type, value) do nothing;
