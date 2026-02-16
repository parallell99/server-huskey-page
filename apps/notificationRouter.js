import express from "express";
import connectionPool from "../utils/db.mjs";
import optionalAuth from "../middleware/optionalAuth.mjs";

const notificationRouter = express.Router();

// สร้างตาราง notifications ถ้ายังไม่มี (ใช้ตอน retry เมื่อ table ไม่มี)
const ensureNotificationsTable = async () => {
  await connectionPool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('new_article', 'comment', 'like')),
      text TEXT NOT NULL,
      post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await connectionPool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);`);
  await connectionPool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON notifications(post_id);`);
  await connectionPool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);`);
  try {
    await connectionPool.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL
    `);
    await connectionPool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`);
  } catch (e) {
    // ignore
  }
  try {
    await connectionPool.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL
    `);
    await connectionPool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_actor_user_id ON notifications(actor_user_id);`);
  } catch (e) {
    // ignore
  }
};

// GET /notifications - ดึงรายการแจ้งเตือน และ join users เพื่อส่ง name (actor) จากตาราง users
notificationRouter.get("/", optionalAuth, async (req, res) => {
  const mapRows = (rows) =>
    rows.map((row) => ({
      id: row.id,
      type: row.type,
      text: row.text,
      post_id: row.post_id,
      postId: row.post_id,
      user_id: row.user_id ?? undefined,
      created_at: row.created_at,
      createdAt: row.created_at,
      name: row.actor_name ?? undefined,
      actor_name: row.actor_name ?? undefined,
    }));

  try {
    const userId = req.user?.id ?? null;
    let isAdmin = false;
    if (userId) {
      const roleRow = await connectionPool.query(`SELECT role FROM users WHERE id = $1`, [userId]);
      isAdmin = roleRow.rows[0]?.role === "admin";
    }

    const queryWithUserAndActor = userId
      ? `SELECT n.id, n.type, n.text, n.post_id, n.user_id, n.created_at,
         COALESCE(u.name, u.username) AS actor_name
         FROM notifications n
         LEFT JOIN users u ON n.actor_user_id = u.id
         WHERE n.user_id IS NULL OR n.user_id = $1
         ORDER BY n.created_at DESC LIMIT 100`
      : `SELECT n.id, n.type, n.text, n.post_id, n.user_id, n.created_at,
         COALESCE(u.name, u.username) AS actor_name
         FROM notifications n
         LEFT JOIN users u ON n.actor_user_id = u.id
         WHERE n.user_id IS NULL
         ORDER BY n.created_at DESC LIMIT 100`;
    const queryAdminAllWithActor = `SELECT n.id, n.type, n.text, n.post_id, n.user_id, n.created_at,
         COALESCE(u.name, u.username) AS actor_name
         FROM notifications n
         LEFT JOIN users u ON n.actor_user_id = u.id
         ORDER BY n.created_at DESC LIMIT 100`;
    const queryWithUserNoActor = userId
      ? `SELECT id, type, text, post_id, user_id, created_at FROM notifications WHERE user_id IS NULL OR user_id = $1 ORDER BY created_at DESC LIMIT 100`
      : `SELECT id, type, text, post_id, user_id, created_at FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 100`;
    const queryAdminAllNoActor = `SELECT id, type, text, post_id, user_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 100`;
    const queryFallback = `SELECT id, type, text, post_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 100`;

    const queryToRun = isAdmin ? queryAdminAllWithActor : queryWithUserAndActor;
    const queryParams = isAdmin ? [] : (userId ? [userId] : []);

    let result;
    try {
      result = await connectionPool.query(queryToRun, queryParams);
    } catch (colErr) {
      if (colErr.code === "42703") {
        try {
          await connectionPool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL;`);
          result = await connectionPool.query(queryToRun, queryParams);
        } catch (alterErr) {
          try {
            result = await connectionPool.query(isAdmin ? queryAdminAllNoActor : queryWithUserNoActor, isAdmin ? [] : (userId ? [userId] : []));
          } catch (e2) {
            result = await connectionPool.query(queryFallback);
          }
        }
      } else {
        try {
          result = await connectionPool.query(isAdmin ? queryAdminAllNoActor : queryWithUserNoActor, isAdmin ? [] : (userId ? [userId] : []));
        } catch (e2) {
          result = await connectionPool.query(queryFallback);
        }
      }
    }
    const list = mapRows(result.rows);
    return res.status(200).json(list);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    if (err.code === "42P01") {
      try {
        await ensureNotificationsTable();
        const fallback = await connectionPool.query(`SELECT id, type, text, post_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 100`);
        return res.status(200).json(mapRows(fallback.rows));
      } catch (setupErr) {
        console.error("Auto-create notifications table failed:", setupErr);
        return res.status(500).json({
          message: "ตาราง notifications ยังไม่มี และสร้างอัตโนมัติไม่ได้ กรุณารัน server/migrations/create_notifications_table.sql ใน Supabase SQL Editor",
          error: setupErr.message,
        });
      }
    }
    try {
      const fallback = await connectionPool.query(`SELECT id, type, text, post_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 100`);
      return res.status(200).json(mapRows(fallback.rows));
    } catch (fallbackErr) {
      return res.status(500).json({
        message: "Failed to load notifications",
        error: err.message,
      });
    }
  }
});

// ดึงข้อมูล like ทั้งหมด (หรือแบบ paginated/filter สามารถเพิ่ม query params ได้)
notificationRouter.get('/likes', async (req, res) => {
  try {
    // สามารถรับ query string เช่น ?postId=... , ?userId=... , ?limit=20 ได้
    const { postId, userId, limit, offset } = req.query;

    let baseQuery = `SELECT id, post_id, user_id, created_at FROM likes`;
    const conditions = [];
    const params = [];
    let i = 1;

    if (postId) {
      conditions.push(`post_id = $${i++}`);
      params.push(postId);
    }
    if (userId) {
      conditions.push(`user_id = $${i++}`);
      params.push(userId);
    }

    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    baseQuery += ' ORDER BY created_at DESC';

    if (limit) {
      baseQuery += ` LIMIT $${i++}`;
      params.push(parseInt(limit, 10));
    }
    if (offset) {
      baseQuery += ` OFFSET $${i++}`;
      params.push(parseInt(offset, 10));
    }

    const result = await connectionPool.query(baseQuery, params);
    res.json({
      likes: result.rows
    });
  } catch (err) {
    console.error("Error fetching likes:", err);
    res.status(500).json({
      message: "Failed to load likes",
      error: err.message,
    });
  }
});


export default notificationRouter;
