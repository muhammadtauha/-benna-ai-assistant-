// Benna AI Procurement Assistant — standalone backend.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db/mongodb");

const app = express();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required — set it in .env");
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/users", require("./routes/users"));

app.get("/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime() }),
);

// 404 + error handlers
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Not found" }),
);
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 1942;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`[API] listening on :${PORT}`)))
  .catch((err) => {
    console.error("[DB] connection failed:", err.message);
    process.exit(1);
  });
