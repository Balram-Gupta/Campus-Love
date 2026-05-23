import bcrypt from "bcryptjs";
import express from "express";
import EmailOtp from "../models/EmailOtp.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { sendMail } from "../config/mailer.js";
import { signToken, createOtp } from "../utils/tokens.js";
import { upload, uploadImage } from "../utils/upload.js";
import { notifyAdmins } from "../utils/notifications.js";

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const canUseDevOtpFallback = process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_OTP_FALLBACK !== "false";

async function sendOtpEmail({ email, subject, text, otp }) {
  try {
    await sendMail({ to: email, subject, text });
    return { message: "OTP sent. Check your email." };
  } catch (error) {
    console.error("OTP email send failed:", {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message
    });

    if (!canUseDevOtpFallback) {
      error.status = 502;
      error.expose = true;
      error.message = "Could not send OTP email. Check MAILJET_API_KEY, MAILJET_SECRET_KEY, and MAIL_FROM in the deployed backend environment.";
      throw error;
    }

    console.error("OTP email failed; using development fallback:", error.message);
    return {
      message: `Email service failed, so development OTP is ${otp}. Use this OTP to continue locally.`,
      devOtp: otp
    };
  }
}

router.post("/request-password-reset-otp", asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ message: "If this email is registered, an OTP has been sent." });
  }

  const otp = createOtp();
  await EmailOtp.findOneAndUpdate(
    { email },
    {
      email,
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const otpResult = await sendOtpEmail({
    email,
    subject: "CampusLove password reset OTP",
    text: `Your CampusLove password reset OTP is ${otp}. It expires in 10 minutes.`,
    otp
  });

  res.json({ message: user ? otpResult.message : "If this email is registered, an OTP has been sent.", devOtp: user ? otpResult.devOtp : undefined });
}));

router.post("/reset-password", asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const otp = String(req.body.otp || "").trim();
  const newPassword = String(req.body.newPassword || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Email, OTP, new password, and confirm password are required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New password and confirm password do not match" });
  }

  const emailOtp = await EmailOtp.findOne({ email });
  if (!emailOtp || emailOtp.expiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const ok = await bcrypt.compare(otp, emailOtp.otpHash);
  if (!ok) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    await EmailOtp.deleteOne({ email });
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.password = newPassword;
  await user.save();
  await EmailOtp.deleteOne({ email });

  res.json({ message: "Password reset successful. You can now log in." });
}));

router.post(
  "/register",
  upload.fields([
    { name: "studentIdCard", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const {
      name,
      email,
      password,
      age,
      gender,
      department,
      course,
      semester,
      rollNumber,
      bio = "",
      interests = "",
      genderPreference = "everyone"
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (Number(age) <= 18) {
      return res.status(400).json({ message: "Age must be greater than 18" });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { rollNumber: rollNumber.toUpperCase() }]
    });
    if (existing) {
      return res.status(409).json({ message: "Email or roll number already registered" });
    }

    const studentIdCard = await uploadImage(req.files?.studentIdCard?.[0], "campuslove/id-cards");
    const profilePhoto = await uploadImage(req.files?.profilePhoto?.[0], "campuslove/profile-photos");
    if (!studentIdCard || !profilePhoto) {
      return res.status(400).json({ message: "Student ID card and profile photo are required" });
    }

    const user = await User.create({
      name,
      email,
      password,
      age,
      gender,
      department,
      course,
      semester,
      rollNumber,
      bio,
      interests: String(interests).split(",").map((item) => item.trim()).filter(Boolean),
      genderPreference,
      profilePhoto,
      studentIdCard,
      verificationStatus: "pending"
    });

    await notifyAdmins(req.app.get("io"), "New signup request", `${user.name} submitted ID verification.`, {
      type: "verification_request",
      relatedUserId: user._id
    });

    res.status(201).json({
      message: "Signup submitted. Admin approval is now pending.",
      userId: user._id
    });
  })
);

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (!user.isVerified || user.verificationStatus !== "approved") {
    return res.status(403).json({ message: `Account status: ${user.verificationStatus}` });
  }

  res.json({
    token: signToken(user),
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profilePhoto: user.profilePhoto,
      blockedUsers: user.blockedUsers
    }
  });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

export default router;
