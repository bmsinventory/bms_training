-- ═══════════════════════════════════════════════════════════
--  BMS Quiz & Certificate System – Supabase Schema
--  Version: 1.0.0
--  Run once in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. COURSES (หลักสูตร)
-- ─────────────────────────────────────────
create table if not exists courses (
  id              uuid primary key default uuid_generate_v4(),
  name            text    not null,
  description     text    not null default '',
  pass_percent    integer not null default 80,   -- เกณฑ์ผ่าน (%)
  questions_count integer not null default 10,   -- จำนวนข้อที่สุ่มต่อการสอบ
  max_attempts    integer not null default 0,    -- 0 = ไม่จำกัดจำนวนครั้ง
  time_limit_min  integer not null default 0,    -- 0 = ไม่จำกัดเวลา (นาที)
  is_active       boolean not null default true,
  category_id     integer,                        -- FK ไปยัง training categories.id
  cert_template   text,                           -- HTML template ใบรับรอง
  cover_url       text,                           -- รูป thumbnail
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- 2. QUESTIONS (ข้อสอบ)
-- ─────────────────────────────────────────
create table if not exists questions (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references courses(id) on delete cascade,
  question    text    not null,
  explanation text    not null default '',  -- คำอธิบายเฉลย
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- 3. CHOICES (ตัวเลือกคำตอบ)
-- ─────────────────────────────────────────
create table if not exists choices (
  id          uuid primary key default uuid_generate_v4(),
  question_id uuid references questions(id) on delete cascade,
  choice_text text    not null,
  is_correct  boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- 4. QUIZ ATTEMPTS (การสอบแต่ละครั้ง)
-- ─────────────────────────────────────────
create table if not exists quiz_attempts (
  id           uuid primary key default uuid_generate_v4(),
  course_id    uuid references courses(id),
  full_name    text    not null,
  email        text    not null,
  department   text    not null default '',
  position     text    not null default '',
  score        integer,
  total        integer,
  percent      numeric(5,2),
  status       text check (status in ('started','PASS','FAIL')),
  question_ids uuid[],                     -- ข้อที่สุ่มได้ (เรียงตามที่ออก)
  started_at   timestamptz default now(),
  completed_at timestamptz,
  ip_address   text,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- 5. QUIZ ANSWERS (คำตอบแต่ละข้อ)
-- ─────────────────────────────────────────
create table if not exists quiz_answers (
  id          uuid primary key default uuid_generate_v4(),
  attempt_id  uuid references quiz_attempts(id) on delete cascade,
  question_id uuid references questions(id),
  choice_id   uuid references choices(id),
  is_correct  boolean not null default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- 6. CERTIFICATES (ใบรับรอง)
-- ─────────────────────────────────────────
create table if not exists certificates (
  id          uuid primary key default uuid_generate_v4(),
  attempt_id  uuid references quiz_attempts(id) on delete cascade unique,
  cert_id     text not null unique,   -- เช่น BMS-2024-001234
  full_name   text not null,
  email       text not null,
  course_id   uuid references courses(id),
  course_name text not null,
  score       integer not null,
  total       integer not null,
  percent     numeric(5,2) not null,
  issued_at   timestamptz default now(),
  pdf_url     text,                   -- URL ไฟล์ PDF ใน Supabase Storage
  is_revoked  boolean not null default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- 7. SETTINGS (ตั้งค่าระบบ)
-- ─────────────────────────────────────────
create table if not exists settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- 8. EMAIL LOGS (บันทึกการส่งอีเมล)
-- ─────────────────────────────────────────
create table if not exists email_logs (
  id         uuid primary key default uuid_generate_v4(),
  attempt_id uuid references quiz_attempts(id),
  cert_id    text,
  to_email   text not null,
  subject    text not null,
  status     text not null check (status in ('sent','failed')),
  error      text,
  sent_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- 9. AUDIT LOGS (บันทึกการใช้งาน Admin)
-- ─────────────────────────────────────────
create table if not exists audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  admin_id   uuid,
  action     text not null,
  entity     text,
  entity_id  text,
  details    jsonb,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- 10. INDEXES
-- ─────────────────────────────────────────
create index if not exists idx_questions_course    on questions(course_id);
create index if not exists idx_choices_question    on choices(question_id);
create index if not exists idx_attempts_course     on quiz_attempts(course_id);
create index if not exists idx_attempts_email      on quiz_attempts(email);
create index if not exists idx_attempts_status     on quiz_attempts(status);
create index if not exists idx_answers_attempt     on quiz_answers(attempt_id);
create index if not exists idx_certs_cert_id       on certificates(cert_id);
create index if not exists idx_certs_email         on certificates(email);
create index if not exists idx_certs_attempt       on certificates(attempt_id);
create index if not exists idx_email_logs_attempt  on email_logs(attempt_id);

-- ─────────────────────────────────────────
-- 11. DEFAULT SETTINGS
-- ─────────────────────────────────────────
insert into settings (key, value) values
  ('site_name',       'BMS Training'),
  ('org_name',        'บริษัท บีเอ็มเอส เมดิคอล จำกัด'),
  ('cert_title',      'ใบรับรองการผ่านการทดสอบ'),
  ('cert_prefix',     'BMS'),
  ('email_subject',   'ใบรับรองผ่านการทดสอบ – BMS Training'),
  ('email_from_name', 'BMS Training System'),
  ('email_from',      'noreply@bms-training.com'),
  ('resend_api_key',  ''),
  ('verify_base_url', 'https://your-domain.vercel.app/verify')
on conflict (key) do nothing;

-- ─────────────────────────────────────────
-- 12. STORAGE BUCKET สำหรับ PDF ใบรับรอง
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', true, 10485760, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;

-- ─────────────────────────────────────────
-- 13. STORAGE POLICIES
-- ─────────────────────────────────────────
drop policy if exists "cert public read"   on storage.objects;
drop policy if exists "cert anon upload"   on storage.objects;

create policy "cert public read"
  on storage.objects for select
  using (bucket_id = 'certificates');

create policy "cert anon upload"
  on storage.objects for insert
  with check (bucket_id = 'certificates');

create policy "cert anon update"
  on storage.objects for update
  using (bucket_id = 'certificates');

-- ─────────────────────────────────────────
-- 14. ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table courses       enable row level security;
alter table questions     enable row level security;
alter table choices       enable row level security;
alter table quiz_attempts enable row level security;
alter table quiz_answers  enable row level security;
alter table certificates  enable row level security;
alter table settings      enable row level security;
alter table email_logs    enable row level security;
alter table audit_logs    enable row level security;

-- courses: อ่านได้ทุกคน เขียนได้ทุกคน (auth อยู่ที่ app layer)
create policy "all access courses"
  on courses for all using (true) with check (true);

-- questions: อ่าน/เขียนได้ทุกคน
create policy "all access questions"
  on questions for all using (true) with check (true);

-- choices: อ่าน/เขียนได้ทุกคน
create policy "all access choices"
  on choices for all using (true) with check (true);

-- Public: สร้างการสอบใหม่
create policy "public insert attempts"
  on quiz_attempts for insert with check (true);

-- Public: อ่านผลสอบของตัวเอง
create policy "public read attempts"
  on quiz_attempts for select using (true);

-- Public: อัปเดตผลสอบ (Edge Function จะใช้ service_role ดีกว่า)
create policy "public update attempts"
  on quiz_attempts for update using (true);

-- Public: บันทึกคำตอบ
create policy "public insert answers"
  on quiz_answers for insert with check (true);

-- Public: อ่านคำตอบ
create policy "public read answers"
  on quiz_answers for select using (true);

-- Public: อ่านใบรับรอง (สำหรับ verify)
create policy "public read certs"
  on certificates for select using (is_revoked = false);

-- Public: สร้างใบรับรอง (Edge Function)
create policy "public insert certs"
  on certificates for insert with check (true);

-- Public: อัปเดตใบรับรอง (อัปโหลด PDF URL)
create policy "public update certs"
  on certificates for update using (true);

-- settings: อ่าน/เขียนได้ทุกคน
create policy "all access settings"
  on settings for all using (true) with check (true);

-- Public: อ่าน email_logs
create policy "public read email_logs"
  on email_logs for select using (true);

-- Public: สร้าง email_log
create policy "public insert email_logs"
  on email_logs for insert with check (true);

-- ─────────────────────────────────────────
-- 15. TRIGGER: auto-update updated_at
-- ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_courses_updated_at
  before update on courses
  for each row execute function update_updated_at();

create trigger trg_questions_updated_at
  before update on questions
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────
-- 16. FUNCTION: Generate unique cert_id
-- ─────────────────────────────────────────
create or replace function generate_cert_id(prefix text default 'BMS')
returns text as $$
declare
  year_str text := to_char(now(), 'YYYY');
  seq      bigint;
  cert     text;
begin
  select coalesce(max(
    cast(regexp_replace(cert_id, '^[A-Z]+-\d{4}-', '') as bigint)
  ), 0) + 1
  into seq
  from certificates
  where cert_id like prefix || '-' || year_str || '-%';

  cert := prefix || '-' || year_str || '-' || lpad(seq::text, 6, '0');
  return cert;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────
-- 17. SAMPLE DATA (ตัวอย่างข้อสอบ)
-- ─────────────────────────────────────────
do $$
declare
  course_id uuid;
  q1_id uuid; q2_id uuid; q3_id uuid; q4_id uuid; q5_id uuid;
  q6_id uuid; q7_id uuid; q8_id uuid; q9_id uuid; q10_id uuid;
  q11_id uuid; q12_id uuid;
begin
  -- สร้างหลักสูตรตัวอย่าง
  insert into courses (name, description, pass_percent, questions_count, is_active)
  values ('ความปลอดภัยในการทำงาน (Basic Safety)', 'หลักสูตรพื้นฐานด้านความปลอดภัยสำหรับพนักงานใหม่', 80, 10, true)
  returning id into course_id;

  -- ข้อสอบตัวอย่าง 12 ข้อ
  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'ข้อใดคืออุปกรณ์ป้องกันส่วนบุคคล (PPE) ที่ต้องสวมใส่ขณะปฏิบัติงานในคลังสินค้า?',
   'อุปกรณ์ป้องกันส่วนบุคคลพื้นฐานสำหรับคลังสินค้า ได้แก่ หมวกนิรภัย รองเท้าเซฟตี้ และเสื้อสะท้อนแสง', 1)
  returning id into q1_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'เมื่อเกิดเพลิงไหม้ในอาคาร สิ่งแรกที่ควรทำคืออะไร?',
   'เมื่อเกิดเพลิงไหม้ ให้กดสัญญาณแจ้งเตือนทันที แล้วอพยพออกจากอาคารตามเส้นทางหนีไฟ', 2)
  returning id into q2_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'น้ำหนักสูงสุดที่พนักงาน 1 คนยกได้โดยไม่ใช้เครื่องมือช่วยตามมาตรฐานความปลอดภัยคือเท่าใด?',
   'มาตรฐานสากลกำหนดน้ำหนักสูงสุดที่บุคคลควรยกโดยไม่มีเครื่องช่วยไม่เกิน 23 กิโลกรัม', 3)
  returning id into q3_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'สัญลักษณ์ใดบนสินค้าหมายถึง "ห้ามวางซ้อน"?',
   'สัญลักษณ์ห้ามวางซ้อนคือภาพลูกศรชี้ขึ้น 2 ทิศทาง หรือภาพกล่องมีเครื่องหมายกากบาท', 4)
  returning id into q4_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'เมื่อพบสินค้าเสียหายในคลัง ควรปฏิบัติอย่างไร?',
   'ต้องรายงานให้หัวหน้างานทราบทันที และแยกสินค้าออกจากสินค้าปกติเพื่อตรวจสอบ', 5)
  returning id into q5_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'อุณหภูมิห้องเย็นสำหรับยา/วัคซุนควรอยู่ในช่วงใด?',
   'ห้องเย็นสำหรับยาและวัคซีนต้องควบคุมอุณหภูมิระหว่าง 2-8 องศาเซลเซียส', 6)
  returning id into q6_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'FIFO ย่อมาจากอะไรและมีความสำคัญอย่างไร?',
   'FIFO = First In First Out คือการจ่ายสินค้าที่รับเข้ามาก่อนออกก่อน เพื่อป้องกันสินค้าหมดอายุ', 7)
  returning id into q7_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'เครื่องหมาย GHS บนสารเคมีหมายถึงอะไร?',
   'GHS (Globally Harmonized System) คือระบบสากลในการจำแนกและติดฉลากสารเคมีเพื่อความปลอดภัย', 8)
  returning id into q8_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'ในกรณีที่มีเหตุฉุกเฉิน สิ่งที่ต้องทำเป็นอันดับแรกคืออะไร?',
   'สิ่งแรกที่ต้องทำในเหตุฉุกเฉินคือแจ้งผู้รับผิดชอบและโทรขอความช่วยเหลือ', 9)
  returning id into q9_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'การจัดเก็บ Lot แบบ FEFO หมายความว่าอะไร?',
   'FEFO = First Expired First Out คือการจ่ายสินค้าที่หมดอายุก่อนออกก่อน เหมาะสำหรับยาและอาหาร', 10)
  returning id into q10_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'ข้อใดคือขั้นตอนที่ถูกต้องในการใช้รถ Forklift?',
   'ก่อนใช้รถ Forklift ต้องตรวจสอบสภาพรถ สวมเข็มขัดนิรภัย และมีใบขับขี่รถ Forklift', 11)
  returning id into q11_id;

  insert into questions (id, course_id, question, explanation, sort_order) values
  (uuid_generate_v4(), course_id, 'เส้นทางอพยพหนีไฟควรติดเครื่องหมายอย่างไร?',
   'เส้นทางอพยพต้องมีป้ายสีเขียวแสดงทิศทาง มีแสงสว่างฉุกเฉิน และปราศจากสิ่งกีดขวาง', 12)
  returning id into q12_id;

  -- ตัวเลือกสำหรับแต่ละข้อ
  -- Q1
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q1_id, 'เสื้อผ้าทั่วไปและรองเท้าแตะ', false, 1),
  (q1_id, 'หมวกนิรภัย รองเท้าเซฟตี้ และเสื้อสะท้อนแสง', true, 2),
  (q1_id, 'แว่นตาอย่างเดียว', false, 3),
  (q1_id, 'ถุงมือและหมวกเท่านั้น', false, 4);

  -- Q2
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q2_id, 'รีบดับไฟด้วยตนเอง', false, 1),
  (q2_id, 'รอดูสถานการณ์ก่อน', false, 2),
  (q2_id, 'กดสัญญาณแจ้งเตือนและอพยพออกทันที', true, 3),
  (q2_id, 'โทรบอกเพื่อนร่วมงานก่อน', false, 4);

  -- Q3
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q3_id, '10 กิโลกรัม', false, 1),
  (q3_id, '23 กิโลกรัม', true, 2),
  (q3_id, '50 กิโลกรัม', false, 3),
  (q3_id, 'ไม่มีการกำหนด', false, 4);

  -- Q4
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q4_id, 'ลูกศรชี้ขึ้น', false, 1),
  (q4_id, 'กล่องมีเครื่องหมายกากบาทหรือลูกศรชี้ขึ้น 2 ทิศ', true, 2),
  (q4_id, 'เครื่องหมายน้ำ', false, 3),
  (q4_id, 'เครื่องหมายระวังแตก', false, 4);

  -- Q5
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q5_id, 'เก็บไว้กับสินค้าปกติ', false, 1),
  (q5_id, 'ทิ้งทันที', false, 2),
  (q5_id, 'แยกและรายงานหัวหน้างาน', true, 3),
  (q5_id, 'ไม่ต้องทำอะไร', false, 4);

  -- Q6
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q6_id, '0-4 องศาเซลเซียส', false, 1),
  (q6_id, '2-8 องศาเซลเซียส', true, 2),
  (q6_id, '10-15 องศาเซลเซียส', false, 3),
  (q6_id, 'ต่ำกว่า 0 องศาเซลเซียส', false, 4);

  -- Q7
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q7_id, 'First In Fast Out', false, 1),
  (q7_id, 'First In First Out – สินค้าที่รับก่อนจ่ายก่อน', true, 2),
  (q7_id, 'Free In Free Out', false, 3),
  (q7_id, 'Fixed Inventory for Operations', false, 4);

  -- Q8
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q8_id, 'ระบบจำแนกสารเคมีสากลเพื่อความปลอดภัย', true, 1),
  (q8_id, 'ชื่อบริษัทผลิตสารเคมี', false, 2),
  (q8_id, 'รหัสสีของสารเคมี', false, 3),
  (q8_id, 'เกรดคุณภาพของสารเคมี', false, 4);

  -- Q9
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q9_id, 'วิ่งออกไปให้ไวที่สุด', false, 1),
  (q9_id, 'แจ้งผู้รับผิดชอบและโทรขอความช่วยเหลือ', true, 2),
  (q9_id, 'ถ่ายรูปไว้ก่อน', false, 3),
  (q9_id, 'รอให้สถานการณ์สงบ', false, 4);

  -- Q10
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q10_id, 'First Excellent First Out', false, 1),
  (q10_id, 'สินค้าที่หมดอายุก่อนจ่ายออกก่อน', true, 2),
  (q10_id, 'First Entry Final Output', false, 3),
  (q10_id, 'Fixed Expiry for Operations', false, 4);

  -- Q11
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q11_id, 'ขับทันทีโดยไม่ต้องตรวจสอบ', false, 1),
  (q11_id, 'ตรวจสอบสภาพ สวมเข็มขัด มีใบขับขี่', true, 2),
  (q11_id, 'ให้คนอื่นตรวจสอบแทน', false, 3),
  (q11_id, 'ใช้ได้โดยไม่ต้องมีใบขับขี่', false, 4);

  -- Q12
  insert into choices (question_id, choice_text, is_correct, sort_order) values
  (q12_id, 'ป้ายสีแดงและไม่มีแสงสว่าง', false, 1),
  (q12_id, 'ป้ายสีเขียว มีแสงฉุกเฉิน ไม่มีสิ่งกีดขวาง', true, 2),
  (q12_id, 'ป้ายสีเหลืองที่เปลี่ยนทุกปี', false, 3),
  (q12_id, 'ไม่จำเป็นต้องมีป้าย', false, 4);

end $$;

-- ─────────────────────────────────────────
-- DONE – Run this script in Supabase SQL Editor
-- ─────────────────────────────────────────
