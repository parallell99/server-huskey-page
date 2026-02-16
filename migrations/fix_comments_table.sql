-- ตรวจสอบ schema ของตาราง comments
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'comments';

-- ถ้าไม่มี column content ให้เพิ่ม
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'content'
    ) THEN
        -- ตรวจสอบว่ามี column อะไรบ้าง
        -- ถ้ามี column 'comment' หรือ 'text' ให้ rename
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'comments' AND column_name = 'comment'
        ) THEN
            ALTER TABLE comments RENAME COLUMN comment TO content;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'comments' AND column_name = 'text'
        ) THEN
            ALTER TABLE comments RENAME COLUMN text TO content;
        ELSE
            -- ถ้าไม่มีเลย ให้เพิ่ม column ใหม่
            ALTER TABLE comments ADD COLUMN content TEXT NOT NULL DEFAULT '';
            -- อัปเดตข้อมูลเก่า (ถ้ามี)
            -- UPDATE comments SET content = COALESCE(comment, text, '') WHERE content = '';
        END IF;
    END IF;
END $$;
