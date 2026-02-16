-- เพิ่ม column content ในตาราง comments
-- รัน SQL นี้ใน Supabase Dashboard → SQL Editor

-- เพิ่ม column content (ถ้ายังไม่มี)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT;

-- ถ้ามีข้อมูลเก่าใน column อื่น ให้ copy มา
-- UPDATE comments SET content = COALESCE(comment, text, '') WHERE content IS NULL;

-- ตั้งค่า NOT NULL (หลังจากมีข้อมูลแล้ว)
-- ALTER TABLE comments ALTER COLUMN content SET NOT NULL;
