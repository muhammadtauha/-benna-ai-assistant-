// backend/app/user/services/assistant/orchestrator.js
// Pipeline: router -> (intent) -> hybrid retrieval -> deterministic rank -> synthesis.
// At most 2 AI calls per turn, and the catalog never enters a prompt.
const { route } = require("./router");
const { extractIntent } = require("./intent");
const { retrieve } = require("./retrieval");
const { rank } = require("./ranker");
const { synthesize, fallbackText } = require("./synthesize");
const AssistantThread = require("../../model/assistantThread.model");
const quota = require("./quota");

const HANDOFF = {
  boq: { action: "boq", href: "/build-my-project" },
  rfq: { action: "rfq", href: "/rfq" },
};

async function loadThread(customerId, threadId) {
  if (threadId) {
    const existing = await AssistantThread.findOne({ _id: threadId, customerId });
    if (existing) return existing;
  }
  return new AssistantThread({ customerId, turns: [] });
}

function historyOf(thread) {
  return (thread.turns || [])
    .slice(-8)
    .map((t) => ({ role: t.role, content: t.content }));
}

/**
 * @param {Object} args
 * @param {string} args.customerId
 * @param {string} args.message
 * @param {string} [args.threadId]
 * @param {'en'|'ar'} [args.lang]
 * @param {(event:string, data:Object)=>void} [args.emit]  SSE emitter
 */
async function handleTurn({ customerId, message, threadId, lang, emit = () => {} }) {
  const startedAt = Date.now();
  const thread = await loadThread(customerId, threadId);
  const history = historyOf(thread);
  const decision = route(message, { lang, hasHistory: history.length > 0 });

  emit("meta", { threadId: String(thread._id), lang: decision.lang });

  // ---- Free lane: deterministic answer, zero AI calls -------------------
  if (!decision.needsAi) {
    emit("delta", { text: decision.reply });
    await quota.recordRoutedTurn(customerId);
    const result = {
      threadId: String(thread._id),
      reply: decision.reply,
      products: [],
      links: decision.links || [],
      mode: "support",
      aiCalls: 0,
      charged: 0,
      lang: decision.lang,
    };
    await persist(thread, { message, decision, result, startedAt });
    emit("done", result);
    return result;
  }

  // ---- Paid lane: reserve budget BEFORE spending anything ---------------
  const reservation = await quota.reserveAiTurn(customerId);
  if (!reservation.ok) {
    emit("limit", reservation);
    return { limited: true, ...reservation, threadId: String(thread._id) };
  }

  let aiCalls = 0;
  try {
    emit("status", { stage: "understanding" });
    const { intent, aiUsed } = await extractIntent(message, history, {
      lang: decision.lang,
      hintMode: decision.mode,
    });
    if (aiUsed) aiCalls += 1;

    let products = [];
    if (["product_search", "boq", "rfq"].includes(intent.mode)) {
      emit("status", { stage: "searching" });
      const candidates = await retrieve(intent, { limit: 40 });
      products = rank(candidates, intent, { topN: intent.mode === "boq" ? 10 : 8 });
      emit("products", { products });
    }

    emit("status", { stage: "answering" });
    const { text, aiUsed: replyAi } = await synthesize({
      message,
      intent,
      products,
      history,
      onDelta: (delta) => emit("delta", { text: delta }),
    });
    if (replyAi) aiCalls += 1;

    // The fallback path never streamed, so push the whole reply once.
    if (!replyAi) emit("delta", { text });

    const result = {
      threadId: String(thread._id),
      reply: text,
      products,
      links: [],
      handoff: HANDOFF[intent.mode] || null,
      mode: intent.mode,
      intent,
      aiCalls,
      charged: reservation.charged,
      lang: intent.language || decision.lang,
      clarifyingQuestion: intent.clarifyingQuestion || null,
    };

    await persist(thread, { message, decision, result, startedAt, intent });
    emit("done", { ...result, quota: await quota.getQuota(customerId) });
    return result;
  } catch (err) {
    // Nothing usable was produced — don't charge for it.
    if (aiCalls === 0) await quota.refundAiTurn(customerId, reservation);
    const terminal = [400, 401, 402, 403].includes(err.status);
    console.error("[ASSISTANT] turn failed:", err.status || "", err.message);
    const text = fallbackText({ language: decision.lang }, []);
    emit("error", {
      message: terminal
        ? err.message
        : "The assistant is temporarily unavailable. Please try again.",
      retryable: !terminal,
      fallback: text,
    });
    throw err;
  }
}

async function persist(thread, { message, decision, result, startedAt, intent }) {
  try {
    thread.customerId = thread.customerId;
    thread.lang = result.lang || decision.lang || "en";
    if (!thread.title) thread.title = String(message).slice(0, 80);
    thread.turns.push({
      role: "user",
      content: String(message).slice(0, 4000),
      intent: intent || null,
      mode: result.mode,
    });
    thread.turns.push({
      role: "assistant",
      content: String(result.reply || "").slice(0, 8000),
      products: (result.products || []).slice(0, 10),
      mode: result.mode,
      aiCalls: result.aiCalls || 0,
      chargedCredits: result.charged || 0,
      latencyMs: Date.now() - startedAt,
    });
    // Keep threads bounded so a long conversation can't grow past the BSON cap.
    if (thread.turns.length > 60) thread.turns = thread.turns.slice(-60);
    thread.lastMessageAt = new Date();
    thread.totalAiCalls = (thread.totalAiCalls || 0) + (result.aiCalls || 0);
    thread.totalChargedCredits =
      (thread.totalChargedCredits || 0) + (result.charged || 0);
    await thread.save();
  } catch (err) {
    console.error("[ASSISTANT] persist failed:", err.message);
  }
}

module.exports = { handleTurn };
