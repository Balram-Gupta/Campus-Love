import express from "express";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { upload, uploadImage } from "../utils/upload.js";

const router = express.Router();
const NEARBY_RADIUS_METERS = 250;
const NEARBY_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

function isValidCoordinate(latitude, longitude) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

async function createNearbyNotification(io, userId, relatedUserId, title, body) {
  const since = new Date(Date.now() - NEARBY_NOTIFICATION_COOLDOWN_MS);
  const existing = await Notification.findOne({
    userId,
    relatedUserId,
    type: "nearby_user",
    createdAt: { $gte: since }
  });

  if (existing) {
    return null;
  }

  const notification = await Notification.create({
    userId,
    relatedUserId,
    type: "nearby_user",
    audience: "user",
    title,
    body
  });
  io.to(`user:${userId}`).emit("notification", notification);
  return notification;
}

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get("/blocked", requireAuth, requireVerified, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("blockedUsers", "name email profilePhoto department course semester")
    .select("blockedUsers");

  res.json({ blockedUsers: user?.blockedUsers || [] });
});

router.post("/location", requireAuth, requireVerified, async (req, res) => {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!isValidCoordinate(latitude, longitude)) {
    return res.status(400).json({ message: "Valid latitude and longitude are required" });
  }

  req.user.campusLocation = {
    type: "Point",
    coordinates: [longitude, latitude]
  };
  req.user.lastLocationSharedAt = new Date();
  await req.user.save();

  const nearbyUsers = await User.find({
    _id: { $ne: req.user._id, $nin: req.user.blockedUsers },
    role: "user",
    isVerified: true,
    verificationStatus: "approved",
    blockedUsers: { $ne: req.user._id },
    campusLocation: {
      $near: {
        $geometry: { type: "Point", coordinates: [longitude, latitude] },
        $maxDistance: NEARBY_RADIUS_METERS
      }
    }
  }).select("name campusLocation");

  const io = req.app.get("io");
  await Promise.all(nearbyUsers.flatMap((nearbyUser) => [
    createNearbyNotification(
      io,
      req.user._id,
      nearbyUser._id,
      "User nearby",
      `${nearbyUser.name} is nearby you on campus.`
    ),
    createNearbyNotification(
      io,
      nearbyUser._id,
      req.user._id,
      "User nearby",
      `${req.user.name} is nearby you on campus.`
    )
  ]));

  res.json({
    message: nearbyUsers.length ? "Nearby users notified" : "Location updated",
    nearbyCount: nearbyUsers.length
  });
});

router.put(
  "/profile",
  requireAuth,
  requireVerified,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "photos", maxCount: 5 }
  ]),
  async (req, res) => {
  const allowed = ["name", "bio", "department", "course", "semester", "genderPreference"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });

  if (req.body.age !== undefined) {
    if (Number(req.body.age) <= 18) {
      return res.status(400).json({ message: "Age must be greater than 18" });
    }
    req.user.age = Number(req.body.age);
  }

  if (req.body.interests !== undefined) {
    req.user.interests = String(req.body.interests).split(",").map((item) => item.trim()).filter(Boolean);
  }

  const profilePhoto = await uploadImage(req.files?.profilePhoto?.[0], "campuslove/profile-photos");
  if (profilePhoto) {
    req.user.profilePhoto = profilePhoto;
  }

  if (req.files?.photos?.length) {
    const uploads = await Promise.all(req.files.photos.map((file) => uploadImage(file, "campuslove/photos")));
    req.user.photos.push(...uploads);
  }

  await req.user.save();
  const user = await User.findById(req.user._id).select("-password -emailOtpHash");
  res.json({ message: "Profile updated", user });
});

router.delete("/photos", requireAuth, requireVerified, async (req, res) => {
  const photosToDelete = Array.isArray(req.body?.photos) ? req.body.photos.map(String) : [];
  if (!photosToDelete.length) {
    return res.status(400).json({ message: "Select at least one photo to delete" });
  }

  const deleteSet = new Set(photosToDelete);
  const originalCount = req.user.photos.length;
  req.user.photos = req.user.photos.filter((photo) => !deleteSet.has(photo));

  if (req.user.photos.length === originalCount) {
    return res.status(404).json({ message: "Selected photos were not found" });
  }

  await req.user.save();
  const user = await User.findById(req.user._id).select("-password -emailOtpHash");
  res.json({ message: "Selected photos deleted", user });
});

export default router;
