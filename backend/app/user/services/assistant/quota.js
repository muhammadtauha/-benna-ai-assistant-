// backend/app/user/services/assistant/quota.js
// Cost control. Router-answered turns are always free; AI turns consume the
// daily free allowance first, then one credit from the SAME balance the BOQ
// tiers top up via PayTabs (50 free, then 100/250/500/1000 packs).
const mongoose = require("mongoose");
const AssistantUsage = require("../../model/assistantUsage.model");
const UserCredits = require("../../model/userCredits.model");
const CreditTransaction = require("../../model/creditTransaction.model");

const FREE_DAILY = Number(process.env.ASSISTANT_FREE_DAILY_TURNS || 15);
const HARD_DAILY_CAP = Number(process.env.ASSISTANT_DAILY_CAP || 120);

const today = () => new Date().toISOString().slice(0, 10);

async function getUsage(customerId) {
  const day = today();
  const doc = await AssistantUsage.findOneAndUpdate(
    { customerId, day },
    { $setOnInsert: { customerId, day } },
    { new: true, upsert: true, lean: true },
  );
  return doc;
}

async function getQuota(customerId) {
  const [usage, credits] = await Promise.all([
    getUsage(customerId),
    UserCredits.findOne({ customerId }, { balance: 1, subscriptionPlan: 1, subscriptionExpiresAt: 1 }).lean(),
  ]);
  const unlimited =
    !!credits?.subscriptionPlan?.includes("business") &&
    credits?.subscriptionExpiresAt &&
    new Date() <= new Date(credits.subscriptionExpiresAt);

  return {
    freeDaily: FREE_DAILY,
    freeRemaining: Math.max(FREE_DAILY - (usage.aiTurns || 0), 0),
    usedToday: usage.aiTurns || 0,
    dailyCap: HARD_DAILY_CAP,
    creditBalance: unlimited ? null : credits?.balance ?? 0,
    unlimited,
  };
}

/** Free bookkeeping for a turn the deterministic router answered. */
async function recordRoutedTurn(customerId) {
  await AssistantUsage.updateOne(
    { customerId, day: today() },
    { $inc: { routedTurns: 1 }, $setOnInsert: { customerId, day: today() } },
    { upsert: true },
  );
}

/**
 * Reserve one AI turn.
 * @returns {Promise<{ ok: true, charged: number, source: 'free'|'credit'|'subscription' }
 *                  | { ok: false, code: string, message: string, quota: Object }>}
 */
async function reserveAiTurn(customerId) {
  const day = today();

  // Hard cap first — protects against a runaway client loop even for
  // customers with a large credit balance.
  const capped = await AssistantUsage.findOne({ customerId, day }, { aiTurns: 1 }).lean();
  if ((capped?.aiTurns || 0) >= HARD_DAILY_CAP) {
    return {
      ok: false,
      code: "DAILY_LIMIT_REACHED",
      message: "You've reached today's assistant limit. It resets at midnight UTC.",
      quota: await getQuota(customerId),
    };
  }

  // Free allowance: atomic, so parallel tabs can't both take the last one.
  const free = await AssistantUsage.findOneAndUpdate(
    { customerId, day, aiTurns: { $lt: FREE_DAILY } },
    { $inc: { aiTurns: 1, freeTurns: 1 }, $setOnInsert: { customerId, day } },
    { new: true, upsert: false, lean: true },
  );
  if (free) return { ok: true, charged: 0, source: "free" };

  // Business subscription: unlimited, no deduction.
  const sub = await UserCredits.findOne(
    {
      customerId,
      subscriptionPlan: { $regex: /^business_/ },
      subscriptionExpiresAt: { $gt: new Date() },
    },
    { _id: 1 },
  ).lean();
  if (sub) {
    await AssistantUsage.updateOne(
      { customerId, day },
      { $inc: { aiTurns: 1 }, $setOnInsert: { customerId, day } },
      { upsert: true },
    );
    return { ok: true, charged: 0, source: "subscription" };
  }

  // Paid path: one credit, atomically, mirroring credits.controller deduction.
  const updated = await UserCredits.findOneAndUpdate(
    { customerId, balance: { $gt: 0 } },
    { $inc: { balance: -1, totalUsed: 1 } },
    { new: true, lean: true },
  );
  if (!updated) {
    return {
      ok: false,
      code: "INSUFFICIENT_CREDITS",
      message:
        "You've used today's free assistant messages. Add credits to keep going.",
      quota: await getQuota(customerId),
    };
  }

  await Promise.all([
    AssistantUsage.updateOne(
      { customerId, day },
      { $inc: { aiTurns: 1, chargedTurns: 1 }, $setOnInsert: { customerId, day } },
      { upsert: true },
    ),
    CreditTransaction.create({
      customerId,
      type: "usage",
      amount: -1,
      balanceAfter: updated.balance,
      description: "1 credit used for AI shopping assistant",
      metadata: { source: "ai_assistant" },
    }),
  ]);

  return { ok: true, charged: 1, source: "credit", balanceAfter: updated.balance };
}

/** Give the credit back when the AI turn failed before producing an answer. */
async function refundAiTurn(customerId, reservation) {
  if (!reservation || reservation.charged !== 1) return;
  try {
    const updated = await UserCredits.findOneAndUpdate(
      { customerId },
      { $inc: { balance: 1, totalUsed: -1 } },
      { new: true, lean: true },
    );
    await CreditTransaction.create({
      customerId,
      type: "refund",
      amount: 1,
      balanceAfter: updated?.balance ?? 0,
      description: "Refund — AI assistant turn failed",
      metadata: { source: "ai_assistant" },
    });
  } catch (err) {
    console.error("[ASSISTANT quota] refund failed:", err.message);
  }
}

module.exports = {
  getQuota,
  reserveAiTurn,
  refundAiTurn,
  recordRoutedTurn,
  FREE_DAILY,
  HARD_DAILY_CAP,
};
