import express from "express";
import { register, login, logout, getMe, updateProfileInfo, updatePassword, updateAvatar } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
// import { upload } from "../middleware/upload.js";


const router = express.Router();


// POST /api/auth/register
router.post("/register", upload.single("avatar"), register);


// POST /api/auth/login
// body: { identifier: "username or email", password: "..." }
router.post("/login", login);


// POST /api/auth/logout (protected)
router.post("/logout", protect, logout);
// GET /api/auth/me (protected)
router.get("/me", protect, getMe);
// PUT /api/auth/update (protected)
router.put("/update-avatar", protect, upload.single("avatar"), updateAvatar);
router.put("/update-password", protect, updatePassword);
router.put("/update-info", protect, updateProfileInfo);


export default router;