import authService from "../services/authService.js";
import { supabaseStorage, isUsingServiceRoleForStorage } from "../config/supabase.mjs";

const BUCKET_NAME = "my-personal-blog";

class UserController {
  /**
   * PUT /users/profile - อัปเดตโปรไฟล์ (name, username) + อัปโหลดรูปโปรไฟล์ (optional)
   * รับ multipart: profileImage (file), name, username
   * ต้อง login (protectUser)
   */
  async updateProfileWithFile(req, res) {
    try {
      const userId = req.user.id;
      const { name, username } = req.body;
      const file = req.file;

      let profilePic = req.body.profilePic ?? undefined;

      // ถ้ามีไฟล์ใหม่ ให้อัปโหลดไป Supabase Storage
      if (file) {
        if (!isUsingServiceRoleForStorage) {
          return res.status(503).json({
            error: "Profile image upload is not configured",
            message: "Server must use SUPABASE_SERVICE_ROLE_KEY for storage uploads.",
            hint: "1) Supabase Dashboard → Settings → API → copy 'service_role' key. 2) Paste into server/.env as SUPABASE_SERVICE_ROLE_KEY=... 3) Restart the server.",
          });
        }
        const filePath = `profiles/${Date.now()}_${file.originalname}`;
        const { data, error } = await supabaseStorage.storage
          .from(BUCKET_NAME)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) {
          console.error("Supabase upload error:", error);
          const hint =
            error.message?.includes("row-level security") || error.statusCode === "403"
              ? "Use SUPABASE_SERVICE_ROLE_KEY in .env (Supabase Dashboard → Settings → API → service_role). Restart server."
              : error.message === "Bucket not found"
                ? "Create bucket 'my-personal-blog' in Supabase Dashboard → Storage"
                : undefined;
          return res.status(500).json({
            error: "Failed to upload profile image",
            message: error.message,
            hint,
          });
        }

        const { data: { publicUrl } } = supabaseStorage.storage
          .from(BUCKET_NAME)
          .getPublicUrl(data.path);
        profilePic = publicUrl;
      }

      // ตรวจสอบ username ซ้ำ
      if (username) {
        const user = await authService.getUserById(userId);
        if (user && user.username !== username) {
          const usernameExists = await authService.checkUsernameExists(username);
          if (usernameExists) {
            return res.status(400).json({ error: "This username is already taken" });
          }
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (username !== undefined) updateData.username = username;
      if (profilePic !== undefined) updateData.profilePic = profilePic;

      const updatedUser = await authService.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(400).json({ error: "No fields to update" });
      }

      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          profilePic: updatedUser.profile_pic,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      console.error("Error name:", error.name, "message:", error.message, "code:", error.code);
      const message = error.message || "Internal server error";
      const hint =
        error.code === "42703"
          ? "Column profile_pic may not exist. Run: ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT;"
          : undefined;
      res.status(500).json({
        error: "Internal server error",
        message,
        ...(hint && { hint }),
      });
    }
  }
}

export default new UserController();
