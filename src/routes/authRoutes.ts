// src/routes/authRoutes.ts
import { Router } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
  logoutSchema,
  refreshSchema,
  verifyResetCodeSchema,
} from "../validators/authValidator";
import { validate } from "../middleware/validate";
import {
  forgotPassword,
  loginUser,
  logoutUser,
  refresh,
  registerUser,
  resendVerificationCode,
  resetPassword,
  verifyEmail,
  verifyResetCode,
} from "../controllers/authController";

const router = Router();
router.post("/register", validate(signupSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail); // Assuming you have a verifyEmail controller function
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  resendVerificationCode,
);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post(
  "/verify-reset-code",
  validate(verifyResetCodeSchema),
  verifyResetCode,
);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", validate(logoutSchema), logoutUser);
export default router;
