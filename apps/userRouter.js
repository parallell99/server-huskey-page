import express from "express";
import protectUser from "../middleware/protectUser.mjs";
import connectionPool from "../utils/db.mjs";
import userController from "../controllers/userController.js";
import multer from "multer";

const userRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// PUT /users/profile - อัปเดตโปรไฟล์ + อัปโหลดรูป (multipart: profileImage, name, username)
userRouter.put(
  "/profile",
  protectUser,
  upload.single("profileImage"),
  userController.updateProfileWithFile.bind(userController)
);

// PUT /users/profile-pic - อัพเดทรูปโปรไฟล์ด้วย URL เท่านั้น (ต้อง login)
userRouter.patch("/profile-pic", protectUser, upload.single("profileImage"), async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded" });
  }

  try {
    // สมมุติว่าอยากเก็บใน Supabase Storage หรือ Cloud storage ให้ปรับตรงนี้
    // แต่กรณีตัวอย่างนี้จะ encode เป็น base64 แล้วเซฟลง db โดยตรง
    const buffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // แปลงไฟล์เป็น base64 data url
    const base64String = buffer.toString("base64");
    const profilePic = `data:${mimeType};base64,${base64String}`;

    const query = `UPDATE users SET profile_pic = $1 WHERE id = $2 RETURNING id, profile_pic`;
    const values = [profilePic, userId];
    const { rows } = await connectionPool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "Profile picture updated successfully",
      profilePic: rows[0].profile_pic,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return res.status(500).json({ message: "Failed to update profile picture" });
  }
});

export default userRouter;