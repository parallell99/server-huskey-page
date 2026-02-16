import supabase, { createSupabaseClient, supabaseAdmin } from "../config/supabase.mjs";
import connectionPool from "../utils/db.mjs";

class AuthService {
  // ตรวจสอบว่า username มีอยู่แล้วหรือไม่
  async checkUsernameExists(username) {
    const query = `SELECT * FROM users WHERE username = $1`;
    const values = [username];
    const { rows } = await connectionPool.query(query, values);
    return rows.length > 0;
  }

  // สร้าง user ใน Supabase Auth (เชื่อมต่อ Supabase โดยตรง)
  async signUp(email, password, options = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options.data || {},
        emailRedirectTo: options.emailRedirectTo,
      },
    });
    return { data, error };
  }

  // สร้าง user ใน database
  async createUser(userId, username, name, role = "user") {
    const query = `
      INSERT INTO users (id, username, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [userId, username, name, role];
    const { rows } = await connectionPool.query(query, values);
    return rows[0];
  }

  // Login user
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  // ดึงข้อมูล user จาก token
  async getUserByToken(token) {
    const { data, error } = await supabase.auth.getUser(token);
    return { data, error };
  }

  // ดึงข้อมูล user จาก database
  async getUserById(userId) {
    const query = `SELECT * FROM users WHERE id = $1`;
    const values = [userId];
    const { rows } = await connectionPool.query(query, values);
    return rows[0];
  }

  // ตรวจสอบรหัสผ่านเดิม
  async verifyOldPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { isValid: !error, error };
  }

  // อัปเดตรหัสผ่าน (ใช้ Admin API เพื่อหลีกเลี่ยง "Auth session missing!")
  async updatePasswordByUserId(userId, newPassword) {
    if (!supabaseAdmin?.auth?.admin) {
      return {
        error: {
          message:
            "Server auth admin not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env and restart.",
        },
      };
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    return { error };
  }

  // อัปเดตข้อมูล user ใน database (name, username, profile_pic)
  async updateUser(userId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }
    if (updates.profilePic !== undefined) {
      fields.push(`profile_pic = $${paramIndex++}`);
      values.push(updates.profilePic);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(userId);
    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    try {
      const { rows } = await connectionPool.query(query, values);
      return rows[0];
    } catch (err) {
      console.error("authService.updateUser DB error:", err.message, "code:", err.code);
      throw err;
    }
  }
}

export default new AuthService();
