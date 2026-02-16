import { Router } from "express";
import authController from "../controllers/authController.js";
import protectUser from "../middleware/protectUser.mjs";

const authRouter = Router();

// Register route
authRouter.post("/register", authController.register.bind(authController));

// Login route
authRouter.post("/login", authController.login.bind(authController));

// Get current user route (ต้อง login)
authRouter.get("/get-user", protectUser, authController.getCurrentUser.bind(authController));

// Reset password route (ต้อง login)
authRouter.put("/reset-password", protectUser, authController.resetPassword.bind(authController));

export default authRouter;
