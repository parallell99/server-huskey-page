-- เพิ่ม column content ในตาราง comments
-- รัน SQL นี้ใน Supabase Dashboard → SQL Editor

-- ขั้นตอนที่ 1: เพิ่ม column content (nullable ก่อน)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT;

-- ขั้นตอนที่ 2: ถ้ามีข้อมูลเก่าใน column อื่น ให้ copy มา (ถ้าตารางมี column comment หรือ text)
-- ถ้าตารางมี column 'comment' หรือ 'text' อยู่แล้ว ให้ uncomment บรรทัดนี้:
-- UPDATE comments SET content = COALESCE(comment, text, '') WHERE content IS NULL;

-- ขั้นตอนที่ 3: ตั้งค่า default value สำหรับข้อมูลใหม่
ALTER TABLE comments ALTER COLUMN content SET DEFAULT '';

-- ขั้นตอนที่ 4: อัปเดตข้อมูลเก่าที่เป็น NULL ให้เป็น empty string
UPDATE comments SET content = '' WHERE content IS NULL;

-- ขั้นตอนที่ 5: ตั้งค่า NOT NULL (หลังจากอัปเดตข้อมูลแล้ว)
ALTER TABLE comments ALTER COLUMN content SET NOT NULL;

-- ตรวจสอบผลลัพธ์
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'comments'
ORDER BY ordinal_position;
