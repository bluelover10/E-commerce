const express = require("express");
const { submitContact, listContacts } = require("../controllers/contactController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { contactLimiter } = require("../middleware/authRateLimit");

const router = express.Router();

router.post("/", contactLimiter, submitContact);
router.get("/admin/all", authMiddleware, adminMiddleware, listContacts);

module.exports = router;
