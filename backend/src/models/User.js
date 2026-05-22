import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    age: { type: Number, required: true, min: 19 },
    gender: { type: String, required: true, enum: ["woman", "man", "non-binary", "prefer-not"] },
    department: { type: String, required: true },
    course: { type: String, required: true },
    semester: { type: String, required: true },
    rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    profilePhoto: { type: String, required: true },
    studentIdCard: { type: String, required: true },
    bio: { type: String, default: "", maxlength: 240 },
    interests: [{ type: String, trim: true }],
    genderPreference: { type: String, default: "everyone" },
    photos: [{ type: String }],
    campusLocation: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number], default: undefined }
    },
    lastLocationSharedAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["email-pending", "pending", "approved", "rejected", "blocked"],
      default: "email-pending"
    },
    emailOtpHash: { type: String },
    emailOtpExpiresAt: { type: Date },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

userSchema.index({ campusLocation: "2dsphere" });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    next();
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
