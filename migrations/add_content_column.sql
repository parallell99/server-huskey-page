-- เพิ่ม column content ในตาราง comments (ถ้ายังไม่มี)
-- รัน SQL นี้ใน Supabase Dashboard → SQL Editor

-- ตรวจสอบและเพิ่ม column content
DO $$ 
BEGIN
    -- ถ้าไม่มี column content ให้เพิ่ม
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'content'
    ) THEN
        -- ตรวจสอบว่ามี column อะไรที่เก็บ comment text อยู่แล้วหรือไม่
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'comments' 
            AND column_name = 'comment'
        ) THEN
            -- ถ้ามี column 'comment' ให้ rename เป็น 'content'
            ALTER TABLE comments RENAME COLUMN comment TO content;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'comments' 
            AND column_name = 'text'
        ) THEN
            -- ถ้ามี column 'text' ให้ rename เป็น 'content'
            ALTER TABLE comments RENAME COLUMN text TO content;
        ELSE
            -- ถ้าไม่มีเลย ให้เพิ่ม column ใหม่
            ALTER TABLE comments ADD COLUMN content TEXT;
            -- อัปเดตให้ NOT NULL หลังจากมีข้อมูลแล้ว
            -- ALTER TABLE comments ALTER COLUMN content SET NOT NULL;
        END IF;
    END IF;
END $$;

-- ตรวจสอบผลลัพธ์
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'comments'
ORDER BY ordinal_position;
