import Story from "../models/Story.js";
import Conversation from "../models/Conversation.js";


export const getUserContactStories = async (req, res) => {
  try {
    const userId = req.user.id; // récupéré depuis protect()

    // 1️⃣ Récupérer toutes les conversations de l'utilisateur
    const conversations = await Conversation.find({
      participants: userId,
    }).select("participants");

    // 2️⃣ Extraire les IDs des autres participants
    const contactIds = conversations
      .flatMap((conv) =>
        conv.participants
          .map((p) => p.toString())
          .filter((id) => id !== userId.toString())
      )
      // enlever les doublons
      .filter((id, index, self) => self.indexOf(id) === index);

    if (contactIds.length === 0) {
      return res.status(200).json([]); // aucun contact = pas de stories
    }

    // 3️⃣ Récupérer les stories actives (non expirées)
    const now = new Date();
    const stories = await Story.find({
      user: { $in: contactIds },
      expiresAt: { $gt: now },
    })
      .populate("user", "username avatar status")
      .sort({ createdAt: -1 });

    // 4️⃣ Retour
    res.status(200).json(stories);
  } catch (error) {
    console.error("Erreur lors du chargement des stories:", error);
    res.status(500).json({ message: "Erreur serveur lors du chargement des stories" });
  }
};

export const getStoriesForCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id; // supposant que tu utilises un middleware d'auth
    const now = new Date();

    // 🧩 Récupérer toutes les stories non expirées
    const stories = await Story.find({ user: userId , expiresAt: { $gt: now } })
      .populate("user", "username avatar") // pour afficher les infos du créateur
      .sort({ createdAt: 1 });

   

    res.status(200).json(stories);
  } catch (err) {
    console.error("Erreur récupération stories :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
