-- เก็บผู้ทำกิจกรรม (ผู้โพสต์/คอมเมนต์/ไลค์) เพื่อ join เอา name จาก users มาแสดง
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_actor_user_id ON notifications(actor_user_id);

COMMENT ON COLUMN notifications.actor_user_id IS 'ผู้ทำกิจกรรม (author/commenter/liker) สำหรับ join เอา name จาก users';
