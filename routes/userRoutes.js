import express from "express";
import { getAllUsers } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/users/all
router.get("/all", protect , getAllUsers);

export default router;
