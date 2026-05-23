import express from "express";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { upload, uploadImage } from "../utils/upload.js";

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
  const messages = await Message.find({ matchId: match._id, deletedFor: { $ne: req.user._id } }).sort({ createdAt: 1 });
  req.app.get("io").to(`match:${match._id}`).emit("messages:seen", {
    matchId: String(match._id),
    seenBy: String(req.user._id)
  });
  res.json({ messages });
});

router.post("/:matchId", requireAuth, requireVerified, upload.single("image"), async (req, res) => {
  const match = await findUserMatch(req.params.matchId, req.user._id);
  if (!match) {
    return res.status(404).json({ message: "Match not found" });
  }
  if (isBlockedMatch(match, req.user._id)) {
    return res.status(403).json({ message: "Chat is unavailable for this match" });
  }

  const text = String(req.body.text || "").trim();
  const image = await uploadImage(req.file, "campuslove/chat-images");
  if (!text && !image) {
    return res.status(400).json({ message: "Type a message or choose an image" });
  }

  const message = await Message.create({
    matchId: match._id,
    senderId: req.user._id,
    text,
    imageUrl: image,
    seenBy: [req.user._id]
  });
  match.lastMessageAt = new Date();
  await match.save();
  req.app.get("io").to(`match:${match._id}`).emit("message:new", message);
  res.status(201).json({ message });
});

router.delete("/:matchId", requireAuth, requireVerified, async (req, res) => {
  const match = await findUserMatch(req.params.matchId, req.user._id);
  if (!match) {
    return res.status(404).json({ message: "Match not found" });
  }
  if (isBlockedMatch(match, req.user._id)) {
    return res.status(403).json({ message: "Chat is unavailable for this match" });
  }

  const messageIds = Array.isArray(req.body.messageIds) ? req.body.messageIds : [];
  const validIds = messageIds.filter((id) => String(id).match(/^[a-f\d]{24}$/i));
  if (!validIds.length) {
    return res.status(400).json({ message: "Select at least one message to delete" });
  }

  const result = await Message.updateMany(
    { _id: { $in: validIds }, matchId: match._id },
    { $addToSet: { deletedFor: req.user._id } }
  );

  req.app.get("io").to(`user:${req.user._id}`).emit("messages:deleted", {
    matchId: String(match._id),
    messageIds: validIds.map((id) => String(id))
  });
  res.json({ message: "Messages deleted", deletedCount: result.modifiedCount, messageIds: validIds });
});

export default router;
