import express from "express";
import { getMessages, sendMessageREST } from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
// import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/:conversationId", protect, getMessages);
router.post("/", protect, sendMessageREST); // optional
export default router;
