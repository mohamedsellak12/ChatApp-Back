import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getIO } from "../utils/socket.js";


const JWT_SECRET = process.env.JWT_SECRET || "ah38f!d9saD@29sd0fas93jf!0fj2F3KjF";
const TOKEN_EXPIRES = process.env.JWT_EXPIRES || "7d";


// helper to build user DTO (no password)
const buildUserDTO = (user) => ({
id: user._id,
username: user.username,
email: user.email,
avatar: user.avatar,
status: user.status,
});


export const register = async (req, res) => {
     try {
            const { username, email, password, avatar } = req.body;
            if (!username || !email || !password) return res.status(400).json({ message: "Missing fields" });


            const existing = await User.findOne({ $or: [{ username }, { email }] });
             if (existing) return res.status(400).json({ message: "Username or email already in use" });


            const hashed = await bcrypt.hash(password, 10);
            const user = await User.create({ username, email, password: hashed, avatar, status: "online" });


            const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });


            // emit status change (other clients will receive it)
            try {
                getIO().emit("userStatusChange", { userId: user._id.toString(), status: "online", username: user.username, avatar: user.avatar });
           } catch (e) {
                // if socket isn't initialized yet, ignore (server must call initSocket on startup)
            }


             res.json({ token, user: buildUserDTO(user) });
    } catch (err) {
            console.error("Register error:", err);          
            res.status(500).json({ message: "Server error" });
}
};


//login
export const login = async (req, res) => {
      try {
            const { identifier, password } = req.body; // identifier can be username or email
            if (!identifier || !password) return res.status(400).json({ message: "Missing fields" });


            const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
            if (!user) return res.status(400).json({ message: "Invalid credentials" });


            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return res.status(400).json({ message: "Invalid credentials" });


            user.status = "online";
            await user.save();


            const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });


         // emit status change
           try {
            getIO().emit("userStatusChange", { userId: user._id.toString(), status: "online", username: user.username, avatar: user.avatar });
          } catch (e) {}


        res.json({ token, user: buildUserDTO(user) });
    } catch (err) {
          console.error("Login error:", err);
           res.status(500).json({ message: "Server error" });
    }
};


//logout
export const logout = async (req, res) => {
     try {
            if (!req.user) return res.status(401).json({ message: "Not authenticated" });
            const user = await User.findByIdAndUpdate(req.user.id, { status: "offline" }, { new: true }).select("-password");

         // emit status change
         try {
           getIO().emit("userStatusChange", { userId: user._id.toString(), status: "offline", username: user.username, avatar: user.avatar });
           } catch (e) {}


           // client should delete token on its side; JWT is stateless
        res.json({ message: "Logged out" });
     } 
     catch (err) {
            console.error("Logout error:", err);
        res.status(500).json({ message: "Server error" });
}
};

//user
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
     if (user.status === "offline") {
      return res.status(401).json({ message: "User is logged out" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile controller

export const updateProfileInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { username, email } = req.body;

    if (username) user.username = username;
    if (email) user.email = email;

    await user.save();

    // Emit real-time update
    try {
      getIO().emit("userUpdated", {
        userId: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        status: user.status,
      });
    } catch (e) {}

    res.status(200).json({
      message: "Profile info updated successfully",
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
    });
  } catch (error) {
    console.error("Update profile info error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    // Emit real-time update
    try {
      getIO().emit("userUpdated", {
        userId: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        status: user.status,
      });
    } catch (e) {}

    res.status(200).json({
      message: "Avatar updated successfully",
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ message: "Server error" });
  }
};





export const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

