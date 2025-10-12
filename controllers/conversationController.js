import Conversation from "../models/Conversation.js";

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
    const convs = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "username avatar status")
       .populate({
        path: "lastMessage",              // on lie le dernier message
        populate: {
          path: "sender",                 // et on peuple aussi l’expéditeur
          select: "username avatar",      // on sélectionne juste ce qui est utile
        },
      })
   
    res.json(convs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
