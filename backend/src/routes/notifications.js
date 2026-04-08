import express from "express";
import { listNotifications, markRead, markAllRead } from "../controllers/notifications.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", verifyToken, listNotifications);
router.put("/read-all", verifyToken, markAllRead);
router.put("/:id/read", verifyToken, markRead);

export default router;
