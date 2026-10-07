// backend/app/user/model/assistantUsage.model.js
// One doc per customer per UTC day. Used to hand out free AI turns before any
// credit is touched, and to cap abuse without a second rate-limit store.
const mongoose = require("mongoose");

const assistantUsageSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true },
    day: { type: String, required: true }, // "YYYY-MM-DD" (UTC)
    aiTurns: { type: Number, default: 0 },
    freeTurns: { type: Number, default: 0 },
    chargedTurns: { type: Number, default: 0 },
    routedTurns: { type: Number, default: 0 }, // answered with zero AI cost
  },
  { timestamps: true },
);

assistantUsageSchema.index({ customerId: 1, day: 1 }, { unique: true });
// Housekeeping: usage rows are telemetry, not records of account — expire them.
assistantUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 120 });

module.exports = mongoose.model("AssistantUsage", assistantUsageSchema);
