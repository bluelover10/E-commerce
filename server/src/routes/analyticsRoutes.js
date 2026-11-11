const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { getOverview, getRevenueReport } = require("../controllers/analyticsController");

const router = express.Router();
router.use(authMiddleware, authorize("admin"));
router.get("/overview", getOverview);
router.get("/revenue", getRevenueReport);

module.exports = router;
