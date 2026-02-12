import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./utils/db.mjs";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// ✅ ใส่ CORS ตรงนี้ (หลังสร้าง app และก่อน routes)
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Frontend local (Vite)
      "http://localhost:3000", // Frontend local (React แบบอื่น)
      "https://your-frontend.vercel.app", // Frontend ที่ Deploy แล้ว
      // ✅ ให้เปลี่ยน https://your-frontend.vercel.app เป็น URL จริงของ Frontend ที่ deploy แล้ว
    ],
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "OK" });
});

// routes อื่นๆ
// app.post("/assignments", ...)

app.get("/post", async (req,res) =>{
  const query = `SELECT * FROM posts`
  try {
    const result = await pool.query(query)
    res.status(200).json(result.rows)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})


app.post("/post", async (req,res) =>{
  const { title,image,description,content,category_id,status_id} = req.body
  const query = `INSERT INTO posts (title,image,description,content,category_id,status_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`
  const values = [title,image,description,content,category_id,status_id]
  try {
    const result = await pool.query(query,values)
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.get("/post/:id", async (req,res) =>{
  const { id } = req.params
  const query = `SELECT * FROM posts WHERE id = $1`
  const values = [id]
  try {
    const result = await pool.query(query,values)
    if (result.rows.length === 0) {
      res.status(404).json({ message: "Server could not find a requested post" });
    } else {
      res.status(200).json(result.rows[0]);
    }
  }
  catch (error) {
    res.status(500).json({ message: "Server could not read post because database connection" })
  }
})

app.put("/post/:id", async (req,res) =>{
  const { id } = req.params
  const { title,image,description,content,category_id,status_id} = req.body
  const query = `UPDATE posts SET title = $1, image = $2, description = $3, content = $4, category_id = $5, status_id = $6 WHERE id = $7 RETURNING *`
  const values = [title,image,description,content,category_id,status_id,id]
  try {
    const result = await pool.query(query,values)
    res.status(200).json(result.rows[0])
  }
  catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.delete("/post/:id", async (req,res) =>{
  const { id } = req.params
  const query = `DELETE FROM posts WHERE id = $1 RETURNING *`
  const values = [id]
  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Server could not find a requested post to delete" });
    }
    res.status(200).json({ message: "Deleted post successfully"});
  }
  catch (error) {
    res.status(500).json({ message: "Server could not delete post because database connection" })
  }
})



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