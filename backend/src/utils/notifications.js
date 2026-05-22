import Notification from "../models/Notification.js";

export async function notifyUser(io, userId, title, body) {
  const notification = await Notification.create({ userId, audience: "user", title, body });
  io.to(`user:${userId}`).emit("notification", notification);
  return notification;
}

export async function notifyAdmins(io, title, body, metadata = {}) {
  const notification = await Notification.create({ audience: "admin", title, body, ...metadata });
  io.to("admins").emit("notification", notification);
  return notification;
}
