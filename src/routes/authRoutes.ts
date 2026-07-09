// src/routes/authRoutes.ts
import { Router } from "express";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "../validators/authValidator";
import { validate } from "../middleware/validate";
import { forgotPassword, loginUser, logoutUser, refresh, registerUser, resetPassword } from "../controllers/authController";

const router = Router();
router.post("/register", validate(signupSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/forgot", validate(forgotPasswordSchema), forgotPassword);   // alias
router.post("/reset", validate(resetPasswordSchema), resetPassword);       // alias
router.post("/refresh", refresh);
router.post("/logout", logoutUser);
export default router;