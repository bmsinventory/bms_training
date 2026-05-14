-- ═══════════════════════════════════════════════════════════
--  Migration: เชื่อม quiz courses กับ training categories
--  Run in Supabase SQL Editor (หลังรัน schema.sql แล้ว)
-- ═══════════════════════════════════════════════════════════

-- เพิ่ม category_id ใน quiz courses เพื่อลิงก์กับ training categories
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS category_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);

-- training_base_url = URL ของระบบลงทะเบียน (quiz จะ link กลับมาหน้านี้)
-- ค่า default สำหรับ local dev — เปลี่ยนใน Quiz Admin → Settings เมื่อ deploy จริง
INSERT INTO settings (key, value)
VALUES ('training_base_url', 'http://localhost:5500')
ON CONFLICT (key) DO NOTHING;
