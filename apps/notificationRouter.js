import express from "express";
import connectionPool from "../utils/db.mjs";

const notificationRouter = express.Router();

// สร้างตาราง notifications ถ้ายังไม่มี (รันครั้งเดียว)
const ensureNotificationsTable = async () => {
  await connectionPool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('new_article', 'comment')),
      text TEXT NOT NULL,
      post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await connectionPool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);`);
  await connectionPool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON notifications(post_id);`);
  await connectionPool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);`);
};

// GET /notifications - ดึงรายการแจ้งเตือนจาก DB (Supabase/Postgres)
notificationRouter.get("/", async (req, res) => {
  try {
    const query = `
      SELECT id, type, text, post_id, created_at
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const result = await connectionPool.query(query);
    const list = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      text: row.text,
      post_id: row.post_id,
      postId: row.post_id,
      created_at: row.created_at,
      createdAt: row.created_at,
    }));
    res.status(200).json(list);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    if (err.code === "42P01") {
      try {
        await ensureNotificationsTable();
        const retryResult = await connectionPool.query(`
          SELECT id, type, text, post_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 100
        `);
        const list = retryResult.rows.map((row) => ({
          id: row.id,
          type: row.type,
          text: row.text,
          post_id: row.post_id,
          postId: row.post_id,
          created_at: row.created_at,
          createdAt: row.created_at,
        }));
        return res.status(200).json(list);
      } catch (setupErr) {
        console.error("Auto-create notifications table failed:", setupErr);
        return res.status(500).json({
          message: "ตาราง notifications ยังไม่มี และสร้างอัตโนมัติไม่ได้ กรุณารัน server/migrations/create_notifications_table.sql ใน Supabase SQL Editor",
          error: setupErr.message,
        });
      }
    }
    res.status(500).json({
      message: "Failed to load notifications",
      error: err.message,
    });
  }
});

export default notificationRouter;
