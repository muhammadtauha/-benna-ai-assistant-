// backend/helpers/lovableAiGateway.js
// Thin server-side client for Lovable AI Gateway (OpenAI-compatible).
// Used by BOQ v2 pipeline (chat completions + embeddings).
const axios = require("axios");

const DIRECT_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const KEY = () => process.env.LOVABLE_API_KEY;
// Fallback path: this host cannot hold LOVABLE_API_KEY, so route through the
// `ai-proxy` edge function, authenticated with a shared secret.
const PROXY_URL = () =>
  (process.env.BENNA_AI_PROXY_URL || "https://kbfnoygnuqqoabpjxomo.supabase.co/functions/v1/ai-proxy").replace(/\/+$/, "");
const PROXY_SECRET = () => process.env.BENNA_AI_PROXY_SECRET || '720bd414ba06b9607b57e0c452c7357c4c07f9ae3c61234a516c41c3cfcd793e';

function useProxy() {
  return !KEY() && Boolean(PROXY_URL() && PROXY_SECRET());
}

function endpoint(path) {
  return useProxy() ? `${PROXY_URL()}${path}` : `${DIRECT_BASE_URL}${path}`;
}

function headers() {
  if (useProxy()) {
    return {
      "x-benna-proxy-secret": PROXY_SECRET(),
      "Content-Type": "application/json",
    };
  }
  const k = KEY();
  if (!k) {
    throw new Error(
      "LOVABLE_API_KEY is not configured (and no BENNA_AI_PROXY_URL/BENNA_AI_PROXY_SECRET fallback)",
    );
  }
  return {
    "Lovable-API-Key": k,
    "X-Lovable-AIG-SDK": "benna-node",
    "Content-Type": "application/json",
  };
}


/**
 * Chat completion. Pass JSON-mode or tools as needed.
 * @param {Object} opts
 * @param {string} opts.model
 * @param {Array}  opts.messages
 * @param {Object} [opts.responseFormat] - { type: 'json_object' } for JSON mode
 * @param {Array}  [opts.tools]
 * @param {Object} [opts.toolChoice]
 * @param {number} [opts.temperature]
 */
async function chat(opts) {
  const body = {
    model: opts.model || "google/gemini-3-flash-preview",
    messages: opts.messages,
    ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
    ...(opts.tools ? { tools: opts.tools } : {}),
    ...(opts.toolChoice ? { tool_choice: opts.toolChoice } : {}),
    ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
  };
  const { data } = await axios.post(endpoint("/chat/completions"), body, {
    headers: headers(),
    timeout: 120_000,
  });
  return data;
}

/**
 * Batch embeddings.
 * @param {string|string[]} input
 * @param {string} [model]
 * @returns {Promise<number[][]>}
 */
async function embed(input, model = "openai/text-embedding-3-small") {
  const arr = Array.isArray(input) ? input : [input];
  const { data } = await axios.post(
    endpoint("/embeddings"),
    { model, input: arr },
    { headers: headers(), timeout: 120_000 }
  );
  return data.data.map((d) => d.embedding);
}

/**
 * OpenAI Responses API (/v1/responses) — ALWAYS streaming, per gateway contract.
 * Reasoning models routinely run for minutes; a buffered call would be severed
 * by request timeouts and billed anyway.
 *
 * @param {Object} opts
 * @param {string}  opts.model              e.g. "openai/gpt-5.6-terra"
 * @param {Array|string} opts.input         Responses-API input items or a plain string
 * @param {string}  [opts.instructions]     system-level instructions
 * @param {Object}  [opts.reasoning]        { effort, summary } — omit to disable reasoning
 * @param {Object}  [opts.jsonSchema]       { name, schema } strict structured output
 * @param {number}  [opts.maxOutputTokens]
 * @param {(chunk:string)=>void} [opts.onDelta]     answer text deltas
 * @param {(chunk:string)=>void} [opts.onReasoning] reasoning summary deltas
 * @returns {Promise<{text: string, reasoning: string, runId: string|null}>}
 */
async function respond(opts) {
  const body = {
    model: opts.model || "openai/gpt-5.6-sol",
    input: opts.input,
    stream: true,
    store: false,
    ...(opts.instructions ? { instructions: opts.instructions } : {}),
    ...(opts.reasoning
      ? { reasoning: opts.reasoning, include: ["reasoning.encrypted_content"] }
      : {}),
    ...(opts.maxOutputTokens ? { max_output_tokens: opts.maxOutputTokens } : {}),
    ...(opts.jsonSchema
      ? {
          text: {
            format: {
              type: "json_schema",
              name: opts.jsonSchema.name || "result",
              strict: true,
              schema: opts.jsonSchema.schema,
            },
          },
        }
      : {}),
  };

  let res;
  try {
    res = await axios.post(endpoint("/responses"), body, {
      headers: { ...headers(), Accept: "text/event-stream" },
      responseType: "stream",
      // No timeout: reasoning runs of several minutes are normal and an abort
      // discards work that is billed regardless.
      timeout: 0,
    });
  } catch (err) {
    // Non-2xx bodies arrive as a stream because responseType is "stream";
    // drain it so the gateway's own error message survives (see
    // ai-gateway-error-semantics: 400/401/402/403 are terminal, 429/5xx retryable).
    const status = err.response?.status;
    let raw = "";
    const stream = err.response?.data;
    if (stream && typeof stream.on === "function") {
      raw = await new Promise((resolve) => {
        let acc = "";
        stream.on("data", (c) => (acc += c.toString("utf8")));
        stream.on("end", () => resolve(acc));
        stream.on("error", () => resolve(acc));
      });
    }
    let message = raw;
    try {
      message = JSON.parse(raw)?.error?.message || JSON.parse(raw)?.message || raw;
    } catch {
      /* keep raw */
    }
    const wrapped = new Error(message || err.message || "AI gateway request failed");
    wrapped.status = status;
    wrapped.retryable = status === 429 || (status >= 500 && status < 600);
    throw wrapped;
  }

  const runId = res.headers?.["x-lovable-aig-run-id"] || null;

  let text = "";
  let reasoning = "";
  let buffer = "";

  await new Promise((resolve, reject) => {
    res.data.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let evt;
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }
          if (evt.type === "response.output_text.delta" && evt.delta) {
            text += evt.delta;
            opts.onDelta?.(evt.delta);
          } else if (
            evt.type === "response.reasoning_summary_text.delta" &&
            evt.delta
          ) {
            reasoning += evt.delta;
            opts.onReasoning?.(evt.delta);
          } else if (evt.type === "response.completed") {
            if (!text && evt.response?.output_text) {
              text = Array.isArray(evt.response.output_text)
                ? evt.response.output_text.join("")
                : String(evt.response.output_text);
            }
          } else if (evt.type === "error" || evt.type === "response.failed") {
            reject(
              new Error(
                evt.error?.message ||
                  evt.response?.error?.message ||
                  "AI gateway stream error",
              ),
            );
          }
        }
      }
    });
    res.data.on("end", resolve);
    res.data.on("error", reject);
  });

  return { text, reasoning, runId };
}

module.exports = { chat, embed, respond };
