import express from "express";
import connectionPool from "../utils/db.mjs";
import postValidation from "../middleware/postValidation.mjs";
import protectUser from "../middleware/protectUser.mjs";
import protectAdmin from "../middleware/protectAdmin.mjs";
import optionalAuth from "../middleware/optionalAuth.mjs";
import multer from "multer";
import { supabaseStorage } from "../config/supabase.mjs";

const postRouter = express.Router();

// ตั้งค่า Multer สำหรับการอัปโหลดไฟล์
const multerUpload = multer({ storage: multer.memoryStorage() });
const imageFileUpload = multerUpload.fields([
  { name: "imageFile", maxCount: 1 },
]);    

// GET /posts - ดูได้ทุกคน (ไม่ต้อง login)
postRouter.get("/", async (req, res) => {
    // Get page and limit from query params, use defaults if not provided
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 6;
    const offset = (page - 1) * limit;

    try {
      // Total count of posts
      const countResult = await connectionPool.query(`SELECT COUNT(*) FROM posts`);
      const totalPosts = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalPosts / limit);

      // Fetch posts for current page
      const postsResult = await connectionPool.query(
        `SELECT * FROM posts ORDER BY id DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const posts = postsResult.rows;

      // Calculate nextPage
      const nextPage = page < totalPages ? page + 1 : null;

      res.status(200).json({
        totalPosts,
        totalPages,
        currentPage: page,
        limit,
        posts,
        nextPage,
      });
    } catch (error) {
      res.status(500).json({ message: "Server could not read post because database connection" });
    }
  });
  
// POST /posts - สร้าง post (อัปโหลดรูปไป Supabase Storage, ต้องเป็น admin)
postRouter.post("/", [imageFileUpload, protectAdmin], async (req, res) => {
  try {
    const newPost = req.body;
    const file = req.files?.imageFile?.[0];
    if (!file) {
      return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ (imageFile)" });
    }
    const bucketName = "my-personal-blog";
    const filePath = `posts/${Date.now()}_${file.originalname}`;
    const { data, error } = await supabaseStorage.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (error) throw error;
    const { data: { publicUrl } } = supabaseStorage.storage
      .from(bucketName)
      .getPublicUrl(data.path);
    const query = `INSERT INTO posts (title, image, category_id, description, content, status_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title`;
    const values = [
      newPost.title,
      publicUrl,
      parseInt(newPost.category_id, 10),
      newPost.description,
      newPost.content,
      parseInt(newPost.status_id, 10),
    ];
    const insertResult = await connectionPool.query(query, values);
    const newPostRow = insertResult.rows[0];
    const newPostId = newPostRow?.id;
    const title = newPostRow?.title || newPost.title || "บทความใหม่";
    if (newPostId) {
      try {
        await connectionPool.query(
          `INSERT INTO notifications (type, text, post_id) VALUES ($1, $2, $3)`,
          ["new_article", `มีบทความใหม่: ${title}`, newPostId]
        );
      } catch (notifErr) {
        console.error("Failed to create new_article notification:", notifErr);
      }
    }
    return res.status(201).json({ message: "Created post successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server could not create post",
      error: err.message,
    });
  }
});
  
// GET /posts/:id/comments - ดึง comments ของ post (ไม่ต้อง login)
postRouter.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    // ตรวจสอบ column name ที่มีอยู่จริงก่อน
    const allowedColumns = ['content', 'comment_text', 'comment', 'text'];
    const columnCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'comments' 
      AND column_name IN ('content', 'comment_text', 'comment', 'text')
      ORDER BY CASE column_name 
        WHEN 'content' THEN 1 
        WHEN 'comment_text' THEN 2
        WHEN 'comment' THEN 3 
        WHEN 'text' THEN 4 
      END
      LIMIT 1
    `;
    const columnCheck = await connectionPool.query(columnCheckQuery);
    let contentColumn = columnCheck.rows[0]?.column_name;
    
    // ตรวจสอบว่า column อยู่ใน whitelist
    if (!contentColumn || !allowedColumns.includes(contentColumn)) {
      contentColumn = 'comment_text'; // default fallback
    }
    
    console.log("Fetching comments for post:", postId);
    console.log("Using column:", contentColumn);
    
    // ใช้ whitelist validation เพื่อป้องกัน SQL injection
    const safeColumnName = allowedColumns.includes(contentColumn) ? contentColumn : 'comment_text';
    
    // ใช้ column ที่ตรวจพบจริง - ไม่รวม updated_at เพราะอาจไม่มีในตาราง
    const query = `
      SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.${safeColumnName} as content,
        c.created_at,
        u.name as author_name,
        u.username,
        u.profile_pic
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
    `;
    
    const result = await connectionPool.query(query, [postId]);
    console.log("Comments found:", result.rows.length);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching comments:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
    });
    
    // ถ้า table ไม่มีอยู่ ให้ return empty array แทน error
    if (error.code === "42P01") {
      console.log("Comments table does not exist, returning empty array");
      return res.status(200).json([]);
    }
    
    res.status(500).json({ 
      message: "Failed to fetch comments",
      error: error.message,
      code: error.code
    });
  }
});

// POST /posts/:id/comments - สร้าง comment (ต้อง login)
postRouter.post("/:id/comments", protectUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    console.log("Creating comment:", { postId: id, userId, content: content?.substring(0, 50) });

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    // แปลง post_id เป็น integer และตรวจสอบว่า post มีอยู่จริงหรือไม่
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    const postCheckQuery = `SELECT id, title FROM posts WHERE id = $1`;
    const postCheckResult = await connectionPool.query(postCheckQuery, [postId]);
    if (postCheckResult.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    const postTitle = postCheckResult.rows[0]?.title || "บทความ";

    // ตรวจสอบ column name ที่มีอยู่จริง
    const columnCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'comments' 
      AND column_name IN ('content', 'comment', 'text', 'comment_text')
      ORDER BY CASE column_name 
        WHEN 'content' THEN 1 
        WHEN 'comment_text' THEN 2
        WHEN 'comment' THEN 3 
        WHEN 'text' THEN 4 
      END
      LIMIT 1
    `;
    const columnCheck = await connectionPool.query(columnCheckQuery);
    const contentColumn = columnCheck.rows[0]?.column_name;
    
    console.log("Creating comment - detected column:", contentColumn);
    
    if (!contentColumn) {
      return res.status(500).json({ 
        message: "Comments table exists but missing content column. Please run the SQL migration: ALTER TABLE comments ADD COLUMN IF NOT EXISTS comment_text TEXT;",
        error: "Column 'content', 'comment_text', 'comment', or 'text' does not exist",
        sqlFix: "See server/migrations/SETUP_COMMENTS_LIKES_SIMPLE.sql"
      });
    }
    
    // ใช้ whitelist validation เพื่อป้องกัน SQL injection
    const allowedColumns = ['content', 'comment_text', 'comment', 'text'];
    if (!allowedColumns.includes(contentColumn)) {
      return res.status(500).json({ 
        message: "Invalid column name detected",
        error: `Column '${contentColumn}' is not allowed`
      });
    }
    
    const query = `
      INSERT INTO comments (post_id, user_id, ${contentColumn})
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    console.log("Inserting comment into column:", contentColumn);
    const result = await connectionPool.query(query, [postId, userId, content.trim()]);
    console.log("Comment created:", result.rows[0]);

    try {
      const commentNotifText = `มีคนคอมเม้นในบทความ '${postTitle || "บทความ"}'`;
      await connectionPool.query(
        `INSERT INTO notifications (type, text, post_id) VALUES ($1, $2, $3)`,
        ["comment", commentNotifText, postId]
      );
    } catch (notifErr) {
      console.error("Failed to create comment notification:", notifErr);
    }
    
    // ดึงข้อมูล user เพื่อส่งกลับ
    const userQuery = `SELECT name, username, profile_pic FROM users WHERE id = $1`;
    const userResult = await connectionPool.query(userQuery, [userId]);
    const user = userResult.rows[0];

    // Map content column name เพื่อให้ response สม่ำเสมอ
    const commentData = result.rows[0];
    const commentContent = commentData.content || commentData.comment_text || commentData.comment || commentData.text || '';
    
    res.status(201).json({
      ...commentData,
      content: commentContent,
      author_name: user?.name || "User",
      username: user?.username || "",
      profile_pic: user?.profile_pic || null,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
    });
    
    // ตรวจสอบ error type
    if (error.code === "42P01") {
      // Table does not exist
      return res.status(500).json({ 
        message: "Comments table does not exist. Please run the database migration.",
        error: error.message 
      });
    } else if (error.code === "42703" || error.message?.includes("does not exist")) {
      // Column does not exist
      return res.status(500).json({ 
        message: "Comments table exists but missing 'content' column. Please run: ALTER TABLE comments ADD COLUMN content TEXT NOT NULL;",
        error: error.message 
      });
    } else if (error.code === "23503") {
      // Foreign key violation
      return res.status(400).json({ 
        message: "Invalid post or user ID",
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: "Failed to create comment",
      error: error.message 
    });
  }
});

// GET /posts/:id/likes - ดึงจำนวน likes และตรวจสอบว่า user like แล้วหรือไม่ (ไม่ต้อง login แต่ถ้ามี token จะบอกว่า like แล้วหรือไม่)
postRouter.get("/:id/likes", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    const userId = req.user?.id; // ถ้ามี token จะมี req.user

    // นับจำนวน likes
    const countQuery = `SELECT COUNT(*) as count FROM likes WHERE post_id = $1`;
    const countResult = await connectionPool.query(countQuery, [postId]);
    const likeCount = parseInt(countResult.rows[0].count, 10);

    // ตรวจสอบว่า user like แล้วหรือไม่ (ถ้ามี token)
    let isLiked = false;
    if (userId) {
      const checkQuery = `SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND user_id = $2`;
      const checkResult = await connectionPool.query(checkQuery, [postId, userId]);
      isLiked = parseInt(checkResult.rows[0].count, 10) > 0;
    }

    res.status(200).json({ count: likeCount, isLiked });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});

// POST /posts/:id/like - Like/Unlike post (ต้อง login)
postRouter.post("/:id/like", protectUser, async (req, res) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    const userId = req.user.id;

    // ตรวจสอบว่า like แล้วหรือยัง
    const checkQuery = `SELECT id FROM likes WHERE post_id = $1 AND user_id = $2`;
    const checkResult = await connectionPool.query(checkQuery, [postId, userId]);

    if (checkResult.rows.length > 0) {
      // Unlike - ลบ like
      const deleteQuery = `DELETE FROM likes WHERE post_id = $1 AND user_id = $2 RETURNING *`;
      await connectionPool.query(deleteQuery, [postId, userId]);
      res.status(200).json({ message: "Unliked successfully", liked: false });
    } else {
      // Like - เพิ่ม like
      const insertQuery = `INSERT INTO likes (post_id, user_id) VALUES ($1, $2) RETURNING *`;
      await connectionPool.query(insertQuery, [postId, userId]);
      res.status(201).json({ message: "Liked successfully", liked: true });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
});

// GET /posts/:id - ดูได้ทุกคน (ไม่ต้อง login)
postRouter.get("/:id", async (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM posts WHERE id = $1`
    const values = [id]
    try {
      const result = await connectionPool.query(query,values)
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
  
// PUT /posts/:id - แก้ไข post ต้อง login (protectUser)
postRouter.put("/:id", protectUser, postValidation, async (req, res) => {
    const { id } = req.params;
    const { title,image,description,content,category_id,status_id} = req.body
    const query = `UPDATE posts SET title = $1, image = $2, description = $3, content = $4, category_id = $5, status_id = $6 WHERE id = $7 RETURNING *`
    const values = [title,image,description,content,category_id,status_id,id]
    try {
      const result = await connectionPool.query(query,values)
      res.status(200).json(result.rows[0])
    }
    catch (error) {
      res.status(500).json({ message: error.message })
    }
  })
  
// DELETE /posts/:id - ลบ post ต้องเป็น admin (protectAdmin)
postRouter.delete("/:id", protectAdmin, async (req,res) =>{
    const { id } = req.params
    const query = `DELETE FROM posts WHERE id = $1 RETURNING *`
    const values = [id]
    try {
      const result = await connectionPool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Server could not find a requested post to delete" });
      }
      res.status(200).json({ message: "Deleted post successfully"});
    }
    catch (error) {
      res.status(500).json({ message: "Server could not delete post because database connection" })
    }
  })

  

  export default postRouter;