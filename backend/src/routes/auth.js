import express from "express";
import { signup, login, logout, getCurrentUser } from "../controllers/auth.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getCurrentUser);

export default router;
