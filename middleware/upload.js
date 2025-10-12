import multer from "multer";
import path from "path";
import fs from "fs";

// 📂 S'assurer que le dossier uploads existe
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ⚙️ Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// 🧩 Types de fichiers autorisés (avatars + messages)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/jpg",
    "image/webp",
    // vidéos
    "video/mp4",
    "video/mov",
    "video/avi",
    "video/mpeg",
    // audios
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    // documents
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Type de fichier non autorisé"), false);
  }
};

// 🚀 Création du middleware multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10000 * 1024 * 1024 }, // limite : 100 Mo
});

export default upload;
