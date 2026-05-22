import express from "express";
import Like from "../models/Like.js";
import Match from "../models/Match.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { notifyAdmins } from "../utils/notifications.js";

const router = express.Router();

router.post("/report/:userId", requireAuth, requireVerified, async (req, res) => {
  const reportedUser = await User.findById(req.params.userId);
  if (!reportedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const report = await Report.create({
    reportedBy: req.user._id,
    reportedUser: reportedUser._id,
    reason: req.body.reason
  });
  await notifyAdmins(req.app.get("io"), "New safety report", `${req.user.name} reported ${reportedUser.name}.`);
  res.status(201).json({ message: "Report submitted", report });
});

router.post("/block/:userId", requireAuth, requireVerified, async (req, res) => {
  if (String(req.user._id) === String(req.params.userId)) {
    return res.status(400).json({ message: "You cannot block yourself" });
  }

  const blockedUser = await User.findById(req.params.userId).select("_id");
  if (!blockedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!req.user.blockedUsers.some((id) => id.equals(req.params.userId))) {
    req.user.blockedUsers.push(req.params.userId);
    await req.user.save();
  }
  res.json({ message: "User blocked", blockedUsers: req.user.blockedUsers });
});

router.delete("/block/:userId", requireAuth, requireVerified, async (req, res) => {
  req.user.blockedUsers = req.user.blockedUsers.filter((id) => !id.equals(req.params.userId));
  await req.user.save();

  const otherUser = await User.findById(req.params.userId).select("blockedUsers");
  const otherBlockedMe = otherUser?.blockedUsers?.some((id) => id.equals(req.user._id));
  const [iLikedThem, theyLikedMe] = await Promise.all([
    Like.findOne({ fromUser: req.user._id, toUser: req.params.userId }).select("_id").lean(),
    Like.findOne({ fromUser: req.params.userId, toUser: req.user._id }).select("_id").lean()
  ]);

  let restoredMatch = null;
  if (otherUser && !otherBlockedMe && iLikedThem && theyLikedMe) {
    const users = [String(req.user._id), String(req.params.userId)].sort();
    restoredMatch = await Match.findOneAndUpdate(
      { users: { $all: users, $size: 2 } },
      { $setOnInsert: { users } },
      { new: true, upsert: true }
    );
  }

  res.json({ message: "User unblocked", blockedUsers: req.user.blockedUsers, restoredMatch });
});

export default router;
