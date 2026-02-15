-- ตาราง notifications สำหรับแจ้งเตือน "บทความใหม่" และ "มีคนคอมเม้นในบทความ"
-- ใช้กับ Supabase (PostgreSQL)

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('new_article', 'comment')),
    text TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON notifications(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

COMMENT ON TABLE notifications IS 'แจ้งเตือน: new_article = มีบทความใหม่, comment = มีคนคอมเม้นในบทความ';
