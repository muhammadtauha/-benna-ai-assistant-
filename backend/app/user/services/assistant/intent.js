// backend/app/user/services/assistant/intent.js
// ONE cheap AI call per turn: natural language -> structured search intent.
// The model never sees the catalog and never picks products; it only extracts
// filters. Retrieval + ranking stay deterministic (and free).
const { respond } = require("../../../../helpers/lovableAiGateway");

const MODEL = process.env.ASSISTANT_INTENT_MODEL || "openai/gpt-5.6-sol";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "language",
    "mode",
    "searchQuery",
    "keywords",
    "categories",
    "brands",
    "priceMin",
    "priceMax",
    "quantity",
    "unit",
    "inStockOnly",
    "projectSummary",
    "clarifyingQuestion",
  ],
  properties: {
    language: { type: "string", enum: ["en", "ar"] },
    mode: {
      type: "string",
      enum: ["product_search", "boq", "rfq", "support", "smalltalk"],
    },
    searchQuery: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    categories: { type: "array", items: { type: "string" } },
    brands: { type: "array", items: { type: "string" } },
    priceMin: { type: ["number", "null"] },
    priceMax: { type: ["number", "null"] },
    quantity: { type: ["number", "null"] },
    unit: { type: ["string", "null"] },
    inStockOnly: { type: "boolean" },
    projectSummary: { type: ["string", "null"] },
    clarifyingQuestion: { type: ["string", "null"] },
  },
};

const INSTRUCTIONS = `You are the intent parser for Benna, a Saudi B2B building-materials marketplace (182,000+ products, 1,027+ categories).
Read the conversation and output ONLY structured search intent as json. Rules:
- language: the language the SHOPPER used ("ar" for Arabic, otherwise "en").
- mode: "boq" when they describe a whole project needing a material list/quantities; "rfq" when they want a bulk quote/tender/negotiated price; "support" for orders, returns, shipping, payments; "smalltalk" for anything unrelated to buying; otherwise "product_search".
- searchQuery: a short, catalog-friendly English search phrase (translate Arabic). Use industry terms used by suppliers, e.g. "white cement 50kg bag", "PPR pipe 32mm", "gypsum board 12mm".
- keywords: 2-6 individual English search tokens supporting searchQuery.
- categories / brands: only when the shopper named them (English spelling). Empty arrays otherwise.
- priceMin / priceMax: SAR numbers only if the shopper stated a budget or range, else null.
- quantity / unit: only when explicitly stated (e.g. 300, "sqm"), else null.
- inStockOnly: true unless the shopper said they can wait or asked about pre-order.
- projectSummary: one short sentence describing the project when mode is "boq" or "rfq", else null.
- clarifyingQuestion: one short question ONLY when the request is too vague to search at all (e.g. just "materials"), else null.
Never invent brands, prices, or product names.`;

function toInputItems(history, message) {
  const items = [];
  for (const turn of history.slice(-8)) {
    items.push({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: [
        {
          type: turn.role === "assistant" ? "output_text" : "input_text",
          text: String(turn.content || "").slice(0, 2000),
        },
      ],
    });
  }
  items.push({
    role: "user",
    content: [{ type: "input_text", text: String(message).slice(0, 2000) }],
  });
  return items;
}

const FALLBACK = (message, lang) => ({
  language: lang || "en",
  mode: "product_search",
  searchQuery: String(message || "").slice(0, 120),
  keywords: String(message || "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6),
  categories: [],
  brands: [],
  priceMin: null,
  priceMax: null,
  quantity: null,
  unit: null,
  inStockOnly: true,
  projectSummary: null,
  clarifyingQuestion: null,
});

/**
 * @param {string} message
 * @param {Array<{role:string,content:string}>} history
 * @param {{ lang?: 'en'|'ar', hintMode?: string }} ctx
 */
async function extractIntent(message, history = [], ctx = {}) {
  try {
    const { text } = await respond({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input: toInputItems(history, message),
      jsonSchema: { name: "benna_search_intent", schema: SCHEMA },
      maxOutputTokens: 600,
    });
    const parsed = JSON.parse(text);
    // Router hints win for handoff modes — regex on "BOQ"/"RFQ" is more
    // reliable than a model that sometimes reads them as product names.
    if (ctx.hintMode && ctx.hintMode !== "product_search") {
      parsed.mode = ctx.hintMode;
    }
    if (!parsed.searchQuery) parsed.searchQuery = String(message).slice(0, 120);
    return { intent: parsed, aiUsed: true };
  } catch (err) {
    if (err.status && [401, 402, 403].includes(err.status)) throw err;
    console.error("[ASSISTANT intent] falling back to keyword intent:", err.message);
    return { intent: FALLBACK(message, ctx.lang), aiUsed: false };
  }
}

module.exports = { extractIntent, MODEL };
