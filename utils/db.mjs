import * as pg from "pg"
const { Pool } = pg.defaults;

// สร้าง connection pool สำหรับ PostgreSQL Supabase
const connectionPool = new Pool({
  connectionString: process.env.CONNECTION_STRING,
//   ssl: {
//     rejectUnauthorized: false, // ยอมรับ self-signed certificate สำหรับ Supabase
//   },
});

connectionPool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

connectionPool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
});

export default connectionPool;