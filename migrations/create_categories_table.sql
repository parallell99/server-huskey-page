-- ตาราง categories สำหรับ Supabase (PostgreSQL)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(LOWER(TRIM(name)));
COMMENT ON TABLE categories IS 'หมวดหมู่บทความ ใช้ร่วมกับ posts.category_id';
