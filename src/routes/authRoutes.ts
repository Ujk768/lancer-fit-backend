import { Router } from "express";

import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "../validators/authValidator";
import { validate } from "../middleware/validate";
import { forgotPassword, loginUser, registerUser, resetPassword, logout } from "../controllers/authController";

const router = Router();
router.post("/register", validate(signupSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/logout", logout);

export default router;