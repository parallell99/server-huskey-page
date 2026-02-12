import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./utils/db.mjs";
import postRouter from "./apps/postRouter.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
// ✅ ใส่ CORS ตรงนี้ (หลังสร้าง app และก่อน routes)
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Frontend local (Vite)
      "http://localhost:3000", // Frontend local (React แบบอื่น)
      "https://husky-page.vercel.app", // Frontend ที่ Deploy แล้ว
      // ✅ ให้เปลี่ยน https://your-frontend.vercel.app เป็น URL จริงของ Frontend ที่ deploy แล้ว
    ],
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "OK" });
});

app.use("/posts",postRouter);







app.post("/register", async (req,res) =>{
  const { name,username,email,password} = req.body
  const query = `INSERT INTO users (name,username,email,password) VALUES ($1,$2,$3,$4) RETURNING *`
  const values = [name,username,email,password]
  try {
    const result = await pool.query(query,values)
    res.status(201).json(result.rows[0])
  }
  catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post("/login", async (req,res) =>{
  const { email,password} = req.body
  const query = `SELECT * FROM users WHERE email = $1 AND password = $2`
  const values = [email,password]
  try {
    const result = await pool.query(query,values)
    res.status(200).json(result.rows[0])
  }
  catch (error) {
    res.status(500).json({ message: error.message })
  }
})




// app.get("/status", async (req,res) =>{
//   const query = `SELECT * FROM status`
//   try {
//     const result = await pool.query(query)
//     res.status(200).json(result.rows)
//   }
//   catch (error) {
//     res.status(500).json({ message: error.message })
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});