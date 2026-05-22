import mongoose from "mongoose";

const emailOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

export default mongoose.model("EmailOtp", emailOtpSchema);
