// backend/app/user/controller/assistant.controller.js
const { handleTurn } = require("../services/assistant/orchestrator");
const quota = require("../services/assistant/quota");
const AssistantThread = require("../model/assistantThread.model");

const customerIdOf = (req) =>
  req.user?.id || req.user?._id?.toString() || req.userId || null;

/** POST /api/users/website/assistant/chat — Server-Sent Events. */
const chat = async (req, res) => {
  const customerId = customerIdOf(req);
  if (!customerId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const message = String(req.body?.message || "").trim();
  if (!message) {
    return res.status(400).json({ success: false, message: "message is required" });
  }
  if (message.length > 2000) {
    return res.status(400).json({ success: false, message: "message is too long" });
  }

  const threadId = req.body?.threadId || null;
  const lang = req.body?.lang === "ar" ? "ar" : "en";

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  const emit = (event, data) => {
    if (closed || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Keep proxies from idling the connection out during a long reasoning run.
  const heartbeat = setInterval(() => {
    if (!closed && !res.writableEnded) res.write(": ping\n\n");
  }, 15000);

  try {
    await handleTurn({ customerId, message, threadId, lang, emit });
  } catch {
    // handleTurn already emitted an `error` event with a usable fallback.
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  }
};

/** GET /assistant/quota */
const getQuota = async (req, res) => {
  const customerId = customerIdOf(req);
  if (!customerId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    return res.json({ success: true, data: await quota.getQuota(customerId) });
  } catch (err) {
    console.error("[ASSISTANT] quota failed:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load quota" });
  }
};

/** GET /assistant/threads */
const listThreads = async (req, res) => {
  const customerId = customerIdOf(req);
  if (!customerId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const threads = await AssistantThread.find(
      { customerId, archived: { $ne: true } },
      { title: 1, lang: 1, lastMessageAt: 1, totalAiCalls: 1, turns: { $slice: -1 } },
    )
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: threads.map((t) => ({
        threadId: String(t._id),
        title: t.title,
        lang: t.lang,
        lastMessageAt: t.lastMessageAt,
        preview: t.turns?.[0]?.content?.slice(0, 140) || "",
      })),
    });
  } catch (err) {
    console.error("[ASSISTANT] listThreads failed:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load conversations" });
  }
};

/** GET /assistant/threads/:threadId */
const getThread = async (req, res) => {
  const customerId = customerIdOf(req);
  if (!customerId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    const thread = await AssistantThread.findOne({
      _id: req.params.threadId,
      customerId,
    }).lean();
    if (!thread) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    return res.json({
      success: true,
      data: {
        threadId: String(thread._id),
        title: thread.title,
        lang: thread.lang,
        turns: (thread.turns || []).map((t) => ({
          role: t.role,
          content: t.content,
          products: t.products || [],
          mode: t.mode,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (err) {
    console.error("[ASSISTANT] getThread failed:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load conversation" });
  }
};

/** DELETE /assistant/threads/:threadId */
const deleteThread = async (req, res) => {
  const customerId = customerIdOf(req);
  if (!customerId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    const result = await AssistantThread.updateOne(
      { _id: req.params.threadId, customerId },
      { $set: { archived: true } },
    );
    if (!result.matchedCount) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("[ASSISTANT] deleteThread failed:", err.message);
    return res.status(500).json({ success: false, message: "Failed to delete conversation" });
  }
};

module.exports = { chat, getQuota, listThreads, getThread, deleteThread };
