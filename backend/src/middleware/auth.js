import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password -emailOtpHash");
    if (!user) {
      return res.status(401).json({ message: "Invalid session" });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireVerified(req, res, next) {
  if (!req.user.isVerified || req.user.verificationStatus !== "approved") {
    return res.status(403).json({ message: "Admin approval required" });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function authFromSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password -emailOtpHash");
    if (!user) {
      return next(new Error("Invalid session"));
    }
    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Invalid socket session"));
  }
}
