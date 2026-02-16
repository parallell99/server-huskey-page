# Database Migrations

## สร้างตาราง Likes และ Comments

### วิธีที่ 1: ใช้ Supabase Dashboard (แนะนำ)

1. เปิด Supabase Dashboard → SQL Editor
2. Copy SQL จากไฟล์ `create_likes_comments_tables.sql`
3. Paste และรันใน SQL Editor

### วิธีที่ 2: ใช้ psql หรือ Database Client

```bash
psql <your-connection-string> -f migrations/create_likes_comments_tables.sql
```

### SQL ที่ต้องรัน:

```sql
-- สร้างตาราง likes
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- สร้างตาราง comments
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
```

### ตรวจสอบว่าสร้างสำเร็จ:

```sql
-- ตรวจสอบตาราง
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('likes', 'comments');

-- ตรวจสอบ structure
\d likes
\d comments
```
