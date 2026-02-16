-- เพิ่ม type 'like' ใน notifications (สำหรับ admin แสดงคนมา like)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_article', 'comment', 'like'));
