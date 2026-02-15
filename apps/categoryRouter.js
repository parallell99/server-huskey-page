import express from "express";
import connectionPool from "../utils/db.mjs";
import protectAdmin from "../middleware/protectAdmin.mjs";

const categoryRouter = express.Router();

const ensureCategoriesTable = async () => {
  await connectionPool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  try {
    await connectionPool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower ON categories(LOWER(TRIM(name)));`
    );
  } catch (_) {}
};

// GET /categories - ดึงรายการ categories (ไม่ต้อง login)
categoryRouter.get("/", async (req, res) => {
  try {
    const result = await connectionPool.query(
      `SELECT id, name FROM categories ORDER BY name ASC`
    );
    const list = result.rows.map((row) => ({ id: row.id, name: row.name }));
    return res.status(200).json(list);
  } catch (err) {
    const tableMissing = err.code === "42P01" || (err.message && /relation "categories" does not exist/i.test(err.message));
    if (tableMissing) {
      console.error("GET /categories table missing or error:", err.code, err.message);
      try {
        await ensureCategoriesTable();
        const retry = await connectionPool.query(
          `SELECT id, name FROM categories ORDER BY name ASC`
        );
        const list = retry.rows.map((row) => ({ id: row.id, name: row.name }));
        return res.status(200).json(list);
      } catch (e) {
        console.error("GET /categories ensure table failed:", e);
        return res.status(500).json({
          message: "ตาราง categories ยังไม่มี กรุณารัน server/migrations/create_categories_table.sql ใน Supabase SQL Editor",
          error: e.message,
        });
      }
    }
    console.error("GET /categories error:", err);
    return res.status(500).json({ message: "Failed to load categories", error: err.message });
  }
});

// GET /categories/:id - ดึง category เดียว
categoryRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await connectionPool.query(
      `SELECT id, name FROM categories WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    const row = result.rows[0];
    res.status(200).json({ id: row.id, name: row.name });
  } catch (err) {
    console.error("GET /categories/:id error:", err);
    res.status(500).json({ message: "Failed to load category", error: err.message });
  }
});

// POST /categories - สร้าง category (ต้องเป็น admin)
categoryRouter.post("/", protectAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }
    const result = await connectionPool.query(
      `INSERT INTO categories (name) VALUES ($1) RETURNING id, name`,
      [String(name).trim()]
    );
    const row = result.rows[0];
    res.status(201).json({ id: row.id, name: row.name });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Category name already exists" });
    }
    if (err.code === "42P01") {
      try {
        await ensureCategoriesTable();
        const result = await connectionPool.query(
          `INSERT INTO categories (name) VALUES ($1) RETURNING id, name`,
          [String(req.body.name).trim()]
        );
        const row = result.rows[0];
        return res.status(201).json({ id: row.id, name: row.name });
      } catch (e) {
        return res.status(500).json({ message: "Failed to create category", error: e.message });
      }
    }
    console.error("POST /categories error:", err);
    res.status(500).json({ message: "Failed to create category", error: err.message });
  }
});

// PUT /categories/:id - แก้ไข category (ต้องเป็น admin)
categoryRouter.put("/:id", protectAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }
    const result = await connectionPool.query(
      `UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name`,
      [String(name).trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    const row = result.rows[0];
    res.status(200).json({ id: row.id, name: row.name });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Category name already exists" });
    }
    console.error("PUT /categories/:id error:", err);
    res.status(500).json({ message: "Failed to update category", error: err.message });
  }
});

// DELETE /categories/:id - ลบ category (ต้องเป็น admin)
categoryRouter.delete("/:id", protectAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await connectionPool.query(
      `SELECT id FROM categories WHERE id = $1`,
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    await connectionPool.query(`DELETE FROM categories WHERE id = $1`, [id]);
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({
        message: "Cannot delete category: it is used by one or more posts",
      });
    }
    console.error("DELETE /categories/:id error:", err);
    res.status(500).json({ message: "Failed to delete category", error: err.message });
  }
});

export default categoryRouter;
