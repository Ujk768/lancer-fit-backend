import { Router } from "express";

import {loginSchema, signupSchema} from "../validators/authValidator";
import { validate } from "../middleware/validate";
import { loginUser, registerUser } from "../controllers/authController";

// log out to be added
// forgot password to be added
const router = Router();
router.post("/register", validate(signupSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);

export default router;