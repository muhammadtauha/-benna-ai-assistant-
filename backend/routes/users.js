// /api/users — auth + assistant surface (standalone port).
const express = require("express");
const router = express.Router();

const AUTH = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const AUTH_CONTROLLER = require("../app/auth/controller/auth.controller");
const assistantRoutes = require("./assistant.routes");

// Auth
router.post("/auth/registration", authLimiter, AUTH_CONTROLLER.register);
router.post("/auth/customer/login", authLimiter, AUTH_CONTROLLER.login);
router.get("/auth/me", AUTH.authenticate, AUTH_CONTROLLER.me);

// Public product detail (storefront parity — no auth needed to browse)
const PRODUCT = require("../app/user/controller/product.controller");
router.get("/website/products/:slug", PRODUCT.getBySlug);

// Assistant — mounted under /website to keep the original URL shape:
//   /api/users/website/assistant/*
router.use("/website", assistantRoutes);

module.exports = router;
