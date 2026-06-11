import express from "express";
import Announcement from "../models/Announcement.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { sendMail } from "../config/mailer.js";
import { notifyUser } from "../utils/notifications.js";

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.use(requireAuth, requireAdmin);

async function sendStatusEmail({ to, subject, text }) {
  try {
    await sendMail({ to, subject, text });
    return true;
  } catch (error) {
    console.error("Admin status email failed:", {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message
    });
    return false;
  }
}

async function clearVerificationRequestNotification(io, userId) {
  const result = await Notification.updateMany(
    {
      audience: "admin",
      read: false,
      type: "verification_request",
      relatedUserId: userId
    },
    { read: true }
  );
  if (result.modifiedCount > 0) {
    io.to("admins").emit("notifications:refresh");
  }
}

router.get("/pending-users", asyncHandler(async (req, res) => {
  const users = await User.find({ verificationStatus: "pending" })
    .select("-password -emailOtpHash")
    .sort({ createdAt: 1 });
  res.json({ users });
}));

router.get("/users", asyncHandler(async (req, res) => {
  const allowedStatuses = ["email-pending", "pending", "approved", "rejected", "blocked"];
  const status = allowedStatuses.includes(req.query.status) ? req.query.status : "pending";
  const [users, counts] = await Promise.all([
    User.find({ role: "user", verificationStatus: status })
      .select("-password -emailOtpHash")
      .sort({ createdAt: status === "pending" ? 1 : -1 }),
    User.aggregate([
      { $match: { role: "user" } },
      { $group: { _id: "$verificationStatus", count: { $sum: 1 } } }
    ])
  ]);

  res.json({
    users,
    counts: Object.fromEntries(counts.map((item) => [item._id, item.count]))
  });
}));

router.put("/approve/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.isVerified = true;
  user.verificationStatus = "approved";
  await user.save();
  await clearVerificationRequestNotification(req.app.get("io"), user._id);
  await notifyUser(req.app.get("io"), user._id, "Profile approved", "Your MDU CampusLove profile is verified.");
  const emailSent = await sendStatusEmail({
    to: user.email,
    subject: "MDU CampusLove profile approved",
    text: "Your profile is verified. You can now log in, swipe, match, chat, and call."
  });
  res.json({
    message: emailSent ? "User approved" : "User approved, but email notification was not sent"
  });
}));

router.put("/reject/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.isVerified = false;
  user.verificationStatus = "rejected";
  await user.save();
  await clearVerificationRequestNotification(req.app.get("io"), user._id);
  await notifyUser(req.app.get("io"), user._id, "Profile rejected", "Your student ID verification was rejected.");
  const emailSent = await sendStatusEmail({
    to: user.email,
    subject: "MDU CampusLove profile rejected",
    text: "Your profile could not be verified. Please contact campus admin for help."
  });
  res.json({
    message: emailSent ? "User rejected" : "User rejected, but email notification was not sent"
  });
}));

router.delete("/users/:id", asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  await clearVerificationRequestNotification(req.app.get("io"), req.params.id);
  res.json({ message: "Fake account deleted" });
}));

router.put("/block-user/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  user.isVerified = false;
  user.verificationStatus = "blocked";
  await user.save();
  res.json({ message: "User blocked by admin" });
}));

router.get("/reports", asyncHandler(async (req, res) => {
  const reports = await Report.find()
    .populate("reportedBy", "name email rollNumber")
    .populate("reportedUser", "name email rollNumber")
    .sort({ createdAt: -1 });
  res.json({ reports });
}));

router.put("/reports/:id", asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json({ report });
}));

router.post("/announcements", asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({
    title: req.body.title,
    body: req.body.body,
    createdBy: req.user._id
  });
  req.app.get("io").emit("announcement:new", announcement);
  res.status(201).json({ announcement });
}));

export default router;
