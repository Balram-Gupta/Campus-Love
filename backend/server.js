import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";
import { connectDb } from "./src/config/db.js";
import { authFromSocket } from "./src/middleware/auth.js";
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import swipeRoutes from "./src/routes/swipe.routes.js";
import matchRoutes from "./src/routes/match.routes.js";
import messageRoutes from "./src/routes/message.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import { registerSocketHandlers } from "./src/socket/index.js";

dotenv.config({ path: new URL(".env", import.meta.url) });

const app = express();
const server = http.createServer(app);
const allowedOrigins = `${process.env.CLIENT_URL || ""},http://localhost:5173,http://127.0.0.1:5173`
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
};
const io = new Server(server, {
  cors: corsOptions
});

app.set("io", io);
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "campuslove-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/swipe", swipeRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: status >= 500 && !err.expose ? "Server error. Check backend logs for details." : err.message
  });
});

io.use(authFromSocket);
registerSocketHandlers(io);

const port = process.env.PORT || 8000;
connectDb().then(() => {
  server.listen(port, () => {
    console.log(`CampusLove API running on port ${port}`);
  });
});


