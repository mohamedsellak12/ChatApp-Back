import jwt from "jsonwebtoken";
import User from "../models/User.js";


const JWT_SECRET = process.env.JWT_SECRET || "ah38f!d9saD@29sd0fas93jf!0fj2F3KjF";


export const protect = async (req, res, next) => {
try {
const authHeader = req.headers.authorization || "";
const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
if (!token) return res.status(401).json({ message: "No token provided" });


const decoded = jwt.verify(token, JWT_SECRET);
const user = await User.findById(decoded.id).select("-password");
if (!user) return res.status(401).json({ message: "User not found" });


req.user = user; // attach full user (without password)
next();
} catch (err) {
console.error("Auth middleware error:", err.message);
return res.status(401).json({ message: "Invalid token" });
}
};