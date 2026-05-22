import express from "express";
import Like from "../models/Like.js";
import Match from "../models/Match.js";
import User from "../models/User.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { notifyUser } from "../utils/notifications.js";

const router = express.Router();

router.get("/users", requireAuth, requireVerified, async (req, res) => {
  const liked = await Like.find({ fromUser: req.user._id }).distinct("toUser");
  const skippedOrBlocked = [...liked, ...req.user.blockedUsers, req.user._id];
  const users = await User.find({
    _id: { $nin: skippedOrBlocked },
    isVerified: true,
    verificationStatus: "approved",
    role: "user"
  }).select("name age gender department course semester rollNumber profilePhoto bio interests genderPreference photos");
  res.json({ users });
});

router.post("/like/:id", requireAuth, requireVerified, async (req, res) => {
  const toUser = await User.findById(req.params.id);
  if (!toUser || !toUser.isVerified) {
    return res.status(404).json({ message: "User not found" });
  }

  await Like.updateOne(
    { fromUser: req.user._id, toUser: toUser._id },
    { fromUser: req.user._id, toUser: toUser._id },
    { upsert: true }
  );

  const mutual = await Like.findOne({ fromUser: toUser._id, toUser: req.user._id });
  if (!mutual) {
    return res.json({ matched: false, message: "Like saved" });
  }

  const users = [req.user._id, toUser._id].sort();
  let match = await Match.findOne({ users: { $all: users, $size: 2 } });
  if (!match) {
    match = await Match.create({ users });
    const io = req.app.get("io");
    await notifyUser(io, req.user._id, "New match", `You matched with ${toUser.name}.`);
    await notifyUser(io, toUser._id, "New match", `You matched with ${req.user.name}.`);
    io.to(`user:${req.user._id}`).to(`user:${toUser._id}`).emit("match:new", match);
  }

  res.json({ matched: true, match });
});

router.post("/skip/:id", requireAuth, requireVerified, (req, res) => {
  res.json({ message: "User skipped" });
});

export default router;
