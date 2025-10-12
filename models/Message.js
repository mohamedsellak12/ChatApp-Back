// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    attachments: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ["image", "video", "audio", "pdf"], required: true },
        name: { type: String },
        size: { type: Number },
      },
    ],
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);


export default mongoose.model("Message", messageSchema);
