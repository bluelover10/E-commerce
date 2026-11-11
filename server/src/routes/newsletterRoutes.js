const express = require("express");
const { subscribe, listSubscribers } = require("../controllers/newsletterController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { newsletterLimiter } = require("../middleware/authRateLimit");

const router = express.Router();

router.post("/subscribe", newsletterLimiter, subscribe);
router.get("/admin/all", authMiddleware, adminMiddleware, listSubscribers);

module.exports = router;
