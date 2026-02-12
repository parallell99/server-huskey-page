import authService from "../services/authService.js";

class AuthController {
  // Register user
  async register(req, res) {
    try {
      const { email, password, username, name } = req.body;

      // ตรวจสอบว่า username มีอยู่แล้วหรือไม่
      const usernameExists = await authService.checkUsernameExists(username);
      if (usernameExists) {
        return res.status(400).json({ error: "This username is already taken" });
      }

      // สร้าง user ใน Supabase Auth
      const { data, error: supabaseError } = await authService.signUp(email, password);
      if (supabaseError) {
        if (supabaseError.code === "user_already_exists") {
          return res.status(400).json({ error: "User with this email already exists" });
        }
        return res.status(400).json({ error: "Failed to create user. Please try again." });
      }

      // สร้าง user ใน database
      const user = await authService.createUser(data.user.id, username, name, "user");

      res.status(201).json({
        message: "User created successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({ error: "An error occurred during registration" });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const { data, error } = await authService.signIn(email, password);

      if (error) {
        if (
          error.code === "invalid_credentials" ||
          error.message.includes("Invalid login credentials")
        ) {
          return res.status(400).json({
            error: "Your password is incorrect or this email doesn't exist",
          });
        }
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({
        message: "Signed in successfully",
        access_token: data.session.access_token,
      });
    } catch (error) {
      return res.status(500).json({ error: "An error occurred during login" });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      // req.user ถูก set โดย protectUser middleware แล้ว
      const userId = req.user.id;
      
      const user = await authService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({
        id: req.user.id,
        email: req.user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        profilePic: user.profile_pic,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      // req.user ถูก set โดย protectUser middleware แล้ว
      const token = req.headers.authorization?.split(" ")[1];
      const { oldPassword, newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ error: "New password is required" });
      }

      // ตรวจสอบรหัสผ่านเดิม (ถ้ามี)
      if (oldPassword) {
        const { isValid } = await authService.verifyOldPassword(
          req.user.email,
          oldPassword
        );
        if (!isValid) {
          return res.status(400).json({ error: "Invalid old password" });
        }
      }

      // อัปเดตรหัสผ่าน
      const { error } = await authService.updatePassword(token, newPassword);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new AuthController();
