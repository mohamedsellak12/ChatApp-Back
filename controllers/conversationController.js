import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export const createOrGetConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ message: "recipientId required" });

    // Find private conversation between the two users
    let conv = await Conversation.findOne({
      participants: { $all: [userId, recipientId] }
    });

    if (!conv) {
      conv = await Conversation.create({ participants: [userId, recipientId] });
    }

    (await conv.populate("participants", "username avatar"));
    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // 🔹 Charger les conversations avec leurs participants et dernier message
    const convs = await Conversation.find({ participants: userId })
      .populate("participants", "username avatar status")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      });

    // 🔹 Ajouter les infos sur les messages non lus et si la conversation est lue
    const convsWithStatus = await Promise.all(
      convs.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId }, // messages venant des autres
          seen: false,
        });

        // 🔸 Déterminer si la conversation est considérée comme "lue"
        const isReaded = unreadCount === 0;

        return {
          ...conv.toObject(),
          unreadCount,
          isReaded,
        };
      })
    );

    // 🔹 Trier par dernier message (plus récent en premier)
    const sortedConvs = convsWithStatus.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : 0;
      const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : 0;
      return dateB - dateA;
    });

    res.json(sortedConvs);
  } catch (err) {
    console.error("❌ Erreur getUserConversations :", err);
    res.status(500).json({ message: err.message });
  }
};
