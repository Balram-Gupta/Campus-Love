import express from "express";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";

const router = express.Router();

function idsEqual(left, right) {
  return String(left) === String(right);
}

function isBlockedMatch(match, userId) {
  const viewer = match.users.find((matchUser) => idsEqual(matchUser._id, userId));
  const other = match.users.find((matchUser) => !idsEqual(matchUser._id, userId));

  if (!viewer || !other) return true;

  const viewerBlockedOther = (viewer.blockedUsers || []).some((blockedId) => idsEqual(blockedId, other._id));
  const otherBlockedViewer = (other.blockedUsers || []).some((blockedId) => idsEqual(blockedId, viewer._id));
  return viewerBlockedOther || otherBlockedViewer;
}

async function findUserMatch(matchId, userId) {
  return Match.findOne({ _id: matchId, users: userId }).populate("users", "blockedUsers");
}

router.get("/:matchId", requireAuth, requireVerified, async (req, res) => {
  const match = await findUserMatch(req.params.matchId, req.user._id);
  if (!match) {
    return res.status(404).json({ message: "Match not found" });
  }
  if (isBlockedMatch(match, req.user._id)) {
    return res.status(403).json({ message: "Chat is unavailable for this match" });
  }

  await Message.updateMany(
    { matchId: match._id, seenBy: { $ne: req.user._id } },
    { $push: { seenBy: req.user._id } }
  );
  const messages = await Message.find({ matchId: match._id }).sort({ createdAt: 1 });
  res.json({ messages });
});

router.post("/:matchId", requireAuth, requireVerified, async (req, res) => {
  const match = await findUserMatch(req.params.matchId, req.user._id);
  if (!match) {
    return res.status(404).json({ message: "Match not found" });
  }
  if (isBlockedMatch(match, req.user._id)) {
    return res.status(403).json({ message: "Chat is unavailable for this match" });
  }

  const message = await Message.create({
    matchId: match._id,
    senderId: req.user._id,
    text: req.body.text,
    seenBy: [req.user._id]
  });
  match.lastMessageAt = new Date();
  await match.save();
  req.app.get("io").to(`match:${match._id}`).emit("message:new", message);
  res.status(201).json({ message });
});

export default router;
