-- เพิ่ม column profile_pic ในตาราง users
-- รันใน Supabase SQL Editor ถ้าเกิด error 42703 (column does not exist)

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT;
