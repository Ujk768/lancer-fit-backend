import { Router } from "express";
import { registerUser,loginUser } from "../controllers/authContoller";
import {loginSchema, signupSchema} from "../validators/authValidator";
import { validate } from "../middleware/validate";


const router = Router();
router.post("/register", validate(signupSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);

export default router;