import express from "express";
import { createOrGetConversation, getUserConversations } from "../controllers/conversationController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createOrGetConversation); // create/get conv with recipientId
router.get("/user", protect, getUserConversations); // get all convs for user

export default router;


