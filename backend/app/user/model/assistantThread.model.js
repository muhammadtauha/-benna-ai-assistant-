// backend/app/user/model/assistantThread.model.js
// Conversation persistence for the AI shopping assistant. Every turn is stored
// so we can (a) rebuild history cheaply, (b) audit what the model said, and
// (c) mine intents for catalog gaps — the same reason BOQ gaps are tracked.
const mongoose = require("mongoose");

const turnSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "" },
    // Structured intent extracted for a user turn (null on assistant turns).
    intent: { type: mongoose.Schema.Types.Mixed, default: null },
    // Product shortlist shown with an assistant turn.
    products: { type: [mongoose.Schema.Types.Mixed], default: [] },
    mode: { type: String, default: "product_search" },
    // Cost/telemetry so the router hit-rate is measurable.
    aiCalls: { type: Number, default: 0 },
    chargedCredits: { type: Number, default: 0 },
    runIds: { type: [String], default: [] },
    latencyMs: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const assistantThreadSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    lang: { type: String, enum: ["en", "ar"], default: "en" },
    turns: { type: [turnSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now },
    totalAiCalls: { type: Number, default: 0 },
    totalChargedCredits: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

assistantThreadSchema.index({ customerId: 1, lastMessageAt: -1 });

module.exports = mongoose.model("AssistantThread", assistantThreadSchema);
