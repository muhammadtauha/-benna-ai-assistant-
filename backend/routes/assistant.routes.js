// backend/routes/assistant.routes.js
// Mounted under /api/users/website (see routes/users.js).
const express = require("express");
const router = express.Router();

const AUTH = require("../middleware/auth");
const ASSISTANT = require("../app/user/controller/assistant.controller");
const { assistantLimiter } = require("../middleware/rateLimit");

// Logged-in only, by product decision: the assistant costs credits per turn.
router.post("/assistant/chat", AUTH.authenticate, assistantLimiter, ASSISTANT.chat);
router.get("/assistant/quota", AUTH.authenticate, ASSISTANT.getQuota);
router.get("/assistant/threads", AUTH.authenticate, ASSISTANT.listThreads);
router.get("/assistant/threads/:threadId", AUTH.authenticate, ASSISTANT.getThread);
router.delete("/assistant/threads/:threadId", AUTH.authenticate, ASSISTANT.deleteThread);

module.exports = router;
