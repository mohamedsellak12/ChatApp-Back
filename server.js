import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

//  Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

// 🧩 Modèles
import User from "./models/User.js";
import Message from "./models/Message.js";
import Conversation from "./models/Conversation.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import upload from "./middleware/upload.js";

// ⚙️ Config
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "JWT_SECRET";
const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chatapp";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({
  origin: CLIENT_ORIGIN, 
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));
app.use(express.json());

// 📂 Fichiers statiques (avatars, images, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🚀 Serveur HTTP + Socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: CLIENT_ORIGIN } });

// 🧠 Map pour suivre les sockets utilisateurs (userId → Set(socketIds))
const userSockets = new Map();

// 🛡️ Middleware d’authentification socket
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.warn("⚠️ Pas de token envoyé au socket");
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    console.warn("⚠️ Token invalide :", err.message);
    next(new Error("Authentication error"));
  }
});

// 🎯 Gestion des connexions
io.on("connection", async (socket) => {
  // --- 1️⃣ Statut online/offline ---
  if (socket.userId) {
    const uid = socket.userId;

    // 🔹 Rejoindre une room personnelle (pour les événements privés)
    socket.join(uid.toString());

    const set = userSockets.get(uid) || new Set();
    set.add(socket.id);
    userSockets.set(uid, set);

    if (set.size === 1) {
      await User.findByIdAndUpdate(uid, { status: "online" });
      io.emit("userStatusChange", { userId: uid, status: "online" });
    }
    console.log(`🟢 User ${uid} connecté et rejoint sa room personnelle`);
  }

  // --- 2️⃣ Rejoindre conversation ---
  socket.on("joinConversation", (conversationId) => {
    if (!conversationId) return;
    socket.join(conversationId);
    console.log(`📥 User ${socket.userId} joined conversation ${conversationId}`);
  });

  // --- 3️⃣ Quitter conversation ---
  socket.on("leaveConversation", (conversationId) => {
    if (!conversationId) return;
    socket.leave(conversationId);
    console.log(`📤 User ${socket.userId} left conversation ${conversationId}`);
  });

  // --- 4️⃣ Envoi de message ---
// --- 4️⃣ Envoi de message via Socket.io ---
socket.on("sendMessage", async ({ conversationId, recipientId, content, attachments }) => {
  try {
    const senderId = socket.userId;
    if (!senderId || (!content && (!attachments || attachments.length === 0))) return;

    // ✅ Vérifier ou créer la conversation
    let convId = conversationId;
    if (!convId) {
      let existingConv = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
      });

      if (!existingConv) {
        existingConv = await Conversation.create({
          participants: [senderId, recipientId],
        });
      }
      convId = existingConv._id;
    }

    // 🔗 Formater les attachments (si fournis)
    const formattedAttachments = (attachments || []).map((f) => ({
      url: f.url,
      type: f.type || "image",
      name: f.name || "",
      size: f.size || 0,
    }));

    // 💾 Créer le message
    const message = await Message.create({
      conversation: convId,
      sender: senderId,
      content,
      attachments: formattedAttachments,
    });

    // 🔄 Mettre à jour la conversation
    await Conversation.findByIdAndUpdate(convId, {
      lastMessage: message._id,
      updatedAt: Date.now(),
    });

    // 🔄 Populer sender
    const populated = await Message.findById(message._id).populate("sender", "username avatar");

    // ⚡ Envoyer le message à tous les participants
    io.to(convId.toString()).emit("newMessage", populated);
    io.to(senderId.toString()).emit("conversationUpdated", convId);
    io.to(recipientId.toString()).emit("conversationUpdated", convId);

  } catch (err) {
    console.error("❌ sendMessage socket error:", err);
  }
});



  // --- 5️⃣ Indicateur de saisie ---
  socket.on("typing", ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(conversationId).emit("typing", { userId: socket.userId });
  });

  socket.on("stopTyping", ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(conversationId).emit("stopTyping", { userId: socket.userId });
  });

  // --- 6️⃣ Marquer messages comme lus ---
  socket.on("markAsRead", async (conversationId) => {
    try {
      const userId = socket.userId;
      if (!conversationId || !userId) return;

      await Message.updateMany(
        { conversation: conversationId, sender: { $ne: userId }, seen: false },
        { $set: { seen: true } }
      );

      const updatedMessages = await Message.find({ conversation: conversationId })
        .populate("sender", "username avatar");
// Récupérer les participants de la conversation
    const conv = await Conversation.findById(conversationId).select("participants").lean();

    // Émettre messagesRead à tous les participants via leurs rooms perso (userId -> room)
    if (conv && Array.isArray(conv.participants)) {
      conv.participants.forEach((p) => {
        io.to(p.toString()).emit("messagesRead", {
          conversationId,
          readerId: userId,
          messages: updatedMessages,
        });
      });
    } else {
      // fallback: émettre à la room conversation
      io.to(conversationId).emit("messagesRead", {
        conversationId,
        readerId: userId,
        messages: updatedMessages,
      });
    }

      console.log(`👁️ Messages lus dans ${conversationId}`);
    } catch (err) {
      console.error("❌ markAsRead socket error:", err);
    }
  });

  // --- 7️⃣ Déconnexion ---
  socket.on("disconnect", async () => {
    if (socket.userId) {
      const uid = socket.userId;
      const set = userSockets.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(uid);
          await User.findByIdAndUpdate(uid, { status: "offline" });
          io.emit("userStatusChange", { userId: uid, status: "offline" });
          console.log(`🔴 User ${uid} déconnecté`);
        }
      }
    }
  });
});
app.post("/api/messages/test",upload.array("attachments"), async (req, res) => {
  try {
     console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const { conversationId, recipientId, content, senderId } = req.body;
    const files = req.files || [];

    if (!senderId || (!content && files.length === 0))
      return res.status(400).json({ error: "Message invalide" });

    let convId = conversationId;
    if (!convId) {
      let existingConv = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
      });

      if (!existingConv) {
        existingConv = await Conversation.create({
          participants: [senderId, recipientId],
        });
      }

      convId = existingConv._id;
    }
    const attachments = files.map((f) => ({
      url: `/uploads/${f.filename}`,
      type: "image",
      name: f.originalname,
      size: f.size,
    }));

    const message = await Message.create({
      conversation: convId,
      sender: senderId,
      content,
      attachments,
    });

    await Conversation.findByIdAndUpdate(convId, {
      lastMessage: message._id,
      updatedAt: Date.now(),
    });

    const populated = await Message.findById(message._id).populate("sender", "username avatar");

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// 🧭 Routes API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", uploadRoutes);

// 🗄️ Connexion MongoDB + démarrage serveur
const start = async () => {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ MongoDB connecté");

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Erreur MongoDB :", err.message);
    process.exit(1);
  }
};

start();
