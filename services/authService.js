import supabase, { createSupabaseClient } from "../config/supabase.mjs";
import connectionPool from "../utils/db.mjs";

class AuthService {
  // ตรวจสอบว่า username มีอยู่แล้วหรือไม่
  async checkUsernameExists(username) {
    const query = `SELECT * FROM users WHERE username = $1`;
    const values = [username];
    const { rows } = await connectionPool.query(query, values);
    return rows.length > 0;
  }

  // สร้าง user ใน Supabase Auth
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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

  // อัปเดตรหัสผ่าน
  async updatePassword(token, newPassword) {
    const supabaseWithToken = createSupabaseClient(token);
    const { error } = await supabaseWithToken.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }
}

export default new AuthService();
