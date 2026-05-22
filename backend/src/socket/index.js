import Match from "../models/Match.js";

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

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);
    if (socket.user.role === "admin") {
      socket.join("admins");
    }

    socket.on("match:join", async (matchId) => {
      const match = await Match.findOne({ _id: matchId, users: socket.user._id }).populate("users", "blockedUsers").lean();
      if (!match || isBlockedMatch(match, socket.user._id)) return;
      socket.join(`match:${matchId}`);
    });

    async function emitCallSignal(event, matchId, payload) {
      const match = await Match.findOne({ _id: matchId, users: socket.user._id }).populate("users", "blockedUsers").lean();
      if (!match || isBlockedMatch(match, socket.user._id)) return;

      match.users
        .filter((matchUser) => !idsEqual(matchUser._id, socket.user._id))
        .forEach((matchUser) => {
          io.to(`user:${matchUser._id}`).emit(event, {
            from: String(socket.user._id),
            matchId: String(match._id),
            ...payload
          });
        });
    }

    socket.on("call:offer", async ({ matchId, offer }) => {
      await emitCallSignal("call:offer", matchId, { offer });
    });

    socket.on("call:answer", async ({ matchId, answer }) => {
      await emitCallSignal("call:answer", matchId, { answer });
    });

    socket.on("call:ice-candidate", async ({ matchId, candidate }) => {
      await emitCallSignal("call:ice-candidate", matchId, { candidate });
    });

    socket.on("call:end", async ({ matchId }) => {
      await emitCallSignal("call:end", matchId, {});
    });
  });
}
