import User from "../models/User.js";
import { getIO } from "../utils/socket.js";

// Liste tous les users sauf l'utilisateur connecté
export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      "-password"
    );
    res.json(users);
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
  }
};
