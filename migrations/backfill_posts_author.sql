-- ให้โพสต์เก่าที่ยังไม่มี user_id ใช้ admin คนแรกเป็นผู้เขียน (จะได้แสดงชื่อจริงแทน "ผู้เขียน")
UPDATE posts
SET user_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE user_id IS NULL;