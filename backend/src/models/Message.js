import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "", maxlength: 1000 },
    imageUrl: { type: String },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
