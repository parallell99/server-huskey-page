import express from "express";

import pool from "../utils/db.mjs";
import postValidation from "../middleware/postValidation.mjs";

const postRouter = express.Router();    

postRouter.get("/", async (req, res) => {
    // Get page and limit from query params, use defaults if not provided
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 6;
    const offset = (page - 1) * limit;

    try {
      // Total count of posts
      const countResult = await pool.query(`SELECT COUNT(*) FROM posts`);
      const totalPosts = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalPosts / limit);

      // Fetch posts for current page
      const postsResult = await pool.query(
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
  
  
  postRouter.post("/", postValidation, async (req,res) =>{
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
  
  postRouter.get("/:id", async (req,res) =>{
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
  
  postRouter.put("/:id", postValidation, async (req,res) =>{
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
  
  postRouter.delete("/:id", async (req,res) =>{
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

  

  export default postRouter;