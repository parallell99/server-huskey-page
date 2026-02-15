import authService from "../services/authService.js";

class AuthController {
  // Register user
  async register(req, res) {
    try {
      const { email, password, username, name } = req.body;
      console.log("Register request received:", { email, username, name: name?.substring(0, 10) + "..." });

      // ตรวจสอบว่า username มีอยู่แล้วหรือไม่
      const usernameExists = await authService.checkUsernameExists(username);
      if (usernameExists) {
        console.log("Username already exists:", username);
        return res.status(400).json({ error: "This username is already taken" });
      }

      // สร้าง user ใน Supabase Auth
      console.log("Calling Supabase signUp...");
      const { data, error: supabaseError } = await authService.signUp(email, password, {
        data: { name, username },
      });
      
      if (supabaseError) {
        console.error("Supabase signUp error:", supabaseError);
        if (supabaseError.code === "user_already_exists") {
          return res.status(400).json({ error: "User with this email already exists" });
        }
        const message = supabaseError.message || "Failed to create user. Please try again.";
        return res.status(400).json({ error: message });
      }

      if (!data?.user?.id) {
        console.error("Supabase did not return user.id:", data);
        return res.status(500).json({ error: "Supabase did not return a user. Please try again." });
      }

      console.log("Supabase user created:", data.user.id);

      // สร้างแถวในตาราง users (PostgreSQL) ให้ตรงกับ Supabase Auth
      try {
        const user = await authService.createUser(data.user.id, username, name, "user");
        console.log("User created in database:", user.id);

        const emailConfirmationRequired = !data.session;

        res.status(201).json({
          message: "User created successfully",
          user,
          emailConfirmationRequired,
          // ถ้ามี session (email confirmation ปิด) ส่ง access_token กลับไปด้วย
          access_token: data.session?.access_token || null,
        });
      } catch (dbError) {
        console.error("Database error creating user:", dbError);
        throw dbError;
      }
    } catch (error) {
      console.error("Registration error:", error);
      const message = error.message || "An error occurred during registration";
      res.status(500).json({ error: message });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;
      console.log("Login request received:", { email });

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      console.log("Calling Supabase signIn...");
      const { data, error } = await authService.signIn(email, password);

      if (error) {
        console.error("Supabase signIn error:", error);
        if (
          error.code === "invalid_credentials" ||
          error.message?.includes("Invalid login credentials")
        ) {
          return res.status(400).json({
            error: "Your password is incorrect or this email doesn't exist",
          });
        }
        // Handle email not confirmed
        if (error.message?.includes("Email not confirmed") || error.message?.includes("email_not_confirmed")) {
          return res.status(400).json({
            error: "Please check your email and confirm your account before logging in.",
          });
        }
        return res.status(400).json({ error: error.message || "Login failed. Please try again." });
      }

      if (!data?.session?.access_token) {
        console.error("Supabase did not return access_token:", data);
        return res.status(500).json({ error: "Failed to get access token. Please try again." });
      }

      console.log("Login successful for:", email);
      return res.status(200).json({
        message: "Signed in successfully",
        access_token: data.session.access_token,
      });
    } catch (error) {
      console.error("Login error:", error);
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
      const token = req.headers.authorization?.split(" ")[1];
      const body = req.body || {};
      const oldPassword = body.oldPassword != null ? String(body.oldPassword) : "";
      const newPassword = body.newPassword != null ? String(body.newPassword) : "";

      if (!newPassword || !newPassword.trim()) {
        return res.status(400).json({ error: "New password is required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }

      if (oldPassword && oldPassword.trim()) {
        const email = req.user?.email;
        if (!email) {
          return res.status(400).json({ error: "Unable to verify current password. Please log in again." });
        }
        const { isValid } = await authService.verifyOldPassword(email, oldPassword.trim());
        if (!isValid) {
          return res.status(400).json({ error: "Invalid old password" });
        }
      }

      const { error } = await authService.updatePassword(token, newPassword.trim());
      if (error) {
        return res.status(400).json({ error: error.message || "Failed to update password" });
      }

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("resetPassword error:", error?.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new AuthController();
