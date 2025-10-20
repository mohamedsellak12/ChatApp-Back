import express from "express";
import upload from "../middleware/upload.js";
import { protect } from "../middleware/authMiddleware.js";


const router = express.Router();

// ✅ Route pour upload des fichiers
router.post("/upload", protect ,upload.array("attachments", 5), (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }

    // Formater les fichiers pour le frontend
    const uploadedFiles = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      type: detectFileType(file.mimetype),
      name: file.originalname,
      size: file.size,
    }));

    res.json({ files: uploadedFiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du téléversement" });
  }
});

// 🔍 Détection du type de fichier
function detectFileType(mimetype) {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype === "application/pdf") return "pdf";
  return "other";
}


router.post("/upload/storie", protect, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier envoyé" });
  }

  // 🔗 Construire l’URL publique du fichier
  const fileUrl = `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${req.file.filename}`;

  return res.status(200).json({
    message: "Fichier uploadé avec succès ✅",
    url: fileUrl,
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  });
});

export default router;
