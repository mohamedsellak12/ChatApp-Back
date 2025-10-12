import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { getIO } from "../utils/socket.js"; // si besoin d'émettre depuis controller

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const msgs = await Message.find({ conversation: conversationId })
      .populate("sender", "username avatar")
      .sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// (optionnel) send message via REST (useful pour tests) - will emit to socket room
export const sendMessageREST = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId, content } = req.body;
    if (!conversationId || !content) return res.status(400).json({ message: "Missing fields" });

    const message = await Message.create({ conversation: conversationId, sender: senderId, content });

    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: content, updatedAt: Date.now() });

    const populated = await Message.findById(message._id).populate("sender", "username avatar");

    // emit to room
    try { getIO().to(conversationId).emit("newMessage", populated); } catch (e) {}

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
