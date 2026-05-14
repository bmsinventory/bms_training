-- ═══════════════════════════════════════════════════════════
--  FIX: เพิ่ม RLS policies สำหรับ Admin + category_id
--  รันในไฟล์เดียวกันได้เลย (ปลอดภัย ซ้ำได้)
-- ═══════════════════════════════════════════════════════════

-- ─── 1. เพิ่ม category_id ใน courses (ถ้ายังไม่มี) ─────────
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);

-- ─── 2. RLS policies สำหรับ courses (Admin CRUD) ───────────
DROP POLICY IF EXISTS "admin all courses"   ON courses;
DROP POLICY IF EXISTS "public read active courses" ON courses;

-- Admin: ทำได้ทุกอย่าง (insert/update/delete/select)
CREATE POLICY "admin all courses"
  ON courses FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. RLS policies สำหรับ questions (Admin CRUD) ──────────
DROP POLICY IF EXISTS "admin all questions"         ON questions;
DROP POLICY IF EXISTS "public read active questions" ON questions;

CREATE POLICY "admin all questions"
  ON questions FOR ALL USING (true) WITH CHECK (true);

-- ─── 4. RLS policies สำหรับ choices (Admin CRUD) ───────────
DROP POLICY IF EXISTS "admin all choices"  ON choices;
DROP POLICY IF EXISTS "public read choices" ON choices;

CREATE POLICY "admin all choices"
  ON choices FOR ALL USING (true) WITH CHECK (true);

-- ─── 5. RLS policies สำหรับ settings (Admin read/write) ─────
DROP POLICY IF EXISTS "admin all settings"  ON settings;
DROP POLICY IF EXISTS "public read settings" ON settings;

CREATE POLICY "admin all settings"
  ON settings FOR ALL USING (true) WITH CHECK (true);

-- ─── 6. RLS policies สำหรับ audit_logs ──────────────────────
DROP POLICY IF EXISTS "admin all audit_logs" ON audit_logs;

CREATE POLICY "admin all audit_logs"
  ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ─── 7. training_base_url setting (สำหรับ quiz ลิงก์กลับ) ───
INSERT INTO settings (key, value)
VALUES ('training_base_url', 'http://localhost:5500')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
--  เสร็จแล้ว! ตอนนี้ Quiz Admin สามารถ:
--  - เพิ่ม/แก้ไข/ลบ หลักสูตร (courses)
--  - เพิ่ม/แก้ไข/ลบ ข้อสอบ (questions & choices)
--  - เชื่อม category_id กับ training categories
--  - บันทึก settings ได้
-- ═══════════════════════════════════════════════════════════
