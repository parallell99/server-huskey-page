import "dotenv/config";
import express from "express";
import cors from "cors";
import postRouter from "./apps/postRouter.js";
import authRouter from "./routes/auth.js";
import protectUser from "./middleware/protectUser.mjs";
import protectAdmin from "./middleware/protectAdmin.mjs";

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

app.get("/", (req, res) => {
  res.status(200).json({ 
    message: "Personal Blog API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      posts: "/posts",
      auth: "/auth"
    }
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ message: "OK" });
});

// Auth routes
app.use("/auth", authRouter);

// Post routes
app.use("/posts", postRouter);

// ตัวอย่างการใช้งาน Middleware
// Route ที่ต้องการ protectUser (ต้อง login)
app.get("/protected-route", protectUser, (req, res) => {
  res.json({ message: "This is protected content", user: req.user });
});

// Route ที่ต้องการ protectAdmin (ต้องเป็น admin)
app.get("/admin-only", protectAdmin, (req, res) => {
  res.json({ message: "This is admin-only content", admin: req.user });
});











// app.get("/status", async (req,res) =>{
//   const query = `SELECT * FROM status`
//   try {
//     const result = await pool.query(query)
//     res.status(200).json(result.rows)
//   }
//   catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// })

// For Vercel serverless functions
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}