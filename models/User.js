import mongoose from "mongoose";


const UserSchema = new mongoose.Schema(
{
username: { type: String, required: true, unique: true, trim: true },
email: { type: String, required: true, unique: true, lowercase: true, trim: true },
password: { type: String, required: true },
avatar: { type: String, default: "" },
status: { type: String, enum: ["offline", "online"], default: "offline" },

},
{ timestamps: true }
);


export default mongoose.model("User", UserSchema);