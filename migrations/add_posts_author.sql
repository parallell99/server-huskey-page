-- เพิ่ม user_id ในตาราง posts เพื่อเก็บว่าบทความนี้เขียนโดยใคร
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
COMMENT ON COLUMN posts.user_id IS 'ผู้เขียนบทความ (อ้างอิง users.id)';

-- ถ้าตาราง posts ยังไม่มี created_at ให้เพิ่ม (ใช้สำหรับแสดงวันที่โพสต์)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
