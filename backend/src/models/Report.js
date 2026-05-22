import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ["open", "reviewing", "resolved"], default: "open" }
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
