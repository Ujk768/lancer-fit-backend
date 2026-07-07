import { Router } from "express";

import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "../validators/authValidator";
import { validate } from "../middleware/validate";
import { forgotPassword, loginUser, logoutUser, refresh, registerUser, resetPassword } from "../controllers/authController";

// log out to be added
const router = Router();
router.post("/register", validate(signupSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/forgot", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset", validate(resetPasswordSchema), resetPassword);
router.post("/refresh", refresh);
router.post("/logout", logoutUser); // good to add alongside it

export default router;