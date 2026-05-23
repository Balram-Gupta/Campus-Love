import express from "express";
import Match from "../models/Match.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, requireVerified, async (req, res) => {
  const matches = await Match.find({ users: req.user._id })
    .populate("users", "name age department course semester profilePhoto photos bio interests blockedUsers")
    .sort({ updatedAt: -1 })
    .lean();

  const viewerId = String(req.user._id);
  const viewerBlockedIds = new Set((req.user.blockedUsers || []).map((id) => String(id)));
  const visibleMatches = matches
    .filter((match) => match.users.every((matchUser) => {
      const userId = String(matchUser._id);
      const isBlockedByMe = viewerBlockedIds.has(userId);
      const hasBlockedMe = (matchUser.blockedUsers || []).some((id) => String(id) === viewerId);
      return !isBlockedByMe && !hasBlockedMe;
    }))
    .map((match) => ({
      ...match,
      users: match.users.map((matchUser) => {
        const sanitizedUser = { ...matchUser };
        delete sanitizedUser.blockedUsers;
        return sanitizedUser;
      })
    }));

  res.json({ matches: visibleMatches });
});

export default router;
