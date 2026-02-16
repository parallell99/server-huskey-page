-- เพิ่ม user_id สำหรับแจ้งเตือนแบบเฉพาะคน (เช่น comment ที่ส่งให้คนที่เคยคอมเมนต์ในบทความนั้น)
-- NULL = แจ้งทุกคน (broadcast), มีค่า = แจ้งเฉพาะ user นั้น

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

COMMENT ON COLUMN notifications.user_id IS 'recipient: NULL = broadcast to all, set = only this user';
