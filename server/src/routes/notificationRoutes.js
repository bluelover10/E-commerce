const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  listMyNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  getRecommendations,
} = require("../controllers/notificationController");

const router = express.Router();
router.use(authMiddleware);
router.get("/", listMyNotifications);
router.get("/recommendations", getRecommendations);
router.put("/read-all", markAllRead);
router.put("/:id/read", markRead);
router.delete("/:id", deleteNotification);

module.exports = router;
