require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initSocket } = require("./src/services/socketService");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB via shared config (supports MONGODB_URI / MONGO_URI)
connectDB();

// Note: error-handling middleware (404 + error handler) now lives in src/app.js,
// mounted after all routes so it can actually catch route errors and unknown paths.

// Realtime layer (Socket.IO) — notifications, order tracking, vendor/admin events
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim()),
    credentials: true,
  },
});
initSocket(io);
app.set("io", io);

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Realtime: socket.io enabled`);
});