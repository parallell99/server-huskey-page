import pkg from "pg";
const { Pool } = pkg;

// สร้าง connection pool สำหรับ PostgreSQL Supabase
const pool = new Pool({
  connectionString: process.env.CONNECTION_STRING,
//   ssl: {
//     rejectUnauthorized: false, // ยอมรับ self-signed certificate สำหรับ Supabase
//   },
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
});

export default pool;