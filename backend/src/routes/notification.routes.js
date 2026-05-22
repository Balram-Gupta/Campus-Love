import express from "express";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  if (req.user.role === "admin") {
    const pendingUserIds = await User.distinct("_id", { role: "user", verificationStatus: "pending" });

    const clearedLinked = await Notification.updateMany(
      {
        audience: "admin",
        read: false,
        type: "verification_request",
        relatedUserId: { $nin: pendingUserIds }
      },
      { read: true }
    );

    if (pendingUserIds.length === 0) {
      const clearedLegacy = await Notification.updateMany(
        {
          audience: "admin",
          read: false,
          title: "New signup request",
          relatedUserId: { $exists: false }
        },
        { read: true }
      );
      if (clearedLegacy.modifiedCount > 0) {
        req.app.get("io").to("admins").emit("notifications:refresh");
      }
    }

    if (clearedLinked.modifiedCount > 0) {
      req.app.get("io").to("admins").emit("notifications:refresh");
    }
  }

  const filter = req.user.role === "admin"
    ? { $or: [{ audience: "admin" }, { userId: req.user._id }] }
    : { userId: req.user._id };
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ notifications });
});

router.put("/:id/read", requireAuth, async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: [{ userId: req.user._id }, { audience: req.user.role }] },
    { read: true },
    { new: true }
  );
  res.json({ notification });
});

export default router;
