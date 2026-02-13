-- ⚡ QUICK FIX: เพิ่ม column content ในตาราง comments
-- Copy SQL นี้ไปรันใน Supabase Dashboard → SQL Editor

-- เพิ่ม column content (nullable ก่อน)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT;

-- อัปเดตข้อมูลเก่าที่เป็น NULL ให้เป็น empty string
UPDATE comments SET content = '' WHERE content IS NULL;

-- ตั้งค่า NOT NULL (หลังจากอัปเดตข้อมูลแล้ว)
ALTER TABLE comments ALTER COLUMN content SET NOT NULL;

-- ✅ เสร็จแล้ว! ลองสร้าง comment อีกครั้ง
