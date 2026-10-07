// backend/app/user/services/assistant/synthesize.js
// The talking layer. It sees ONLY the already-ranked shortlist, so it cannot
// hallucinate products, prices, or stock. Streams to the client.
const { respond } = require("../../../../helpers/lovableAiGateway");

const MODEL = process.env.ASSISTANT_REPLY_MODEL || "openai/gpt-5.6-sol";

const BASE_RULES = `You are Benna's procurement assistant for a Saudi B2B building-materials marketplace.
Hard rules:
- Use ONLY the products in PRODUCTS. Never invent a product, price, brand, or availability.
- Prices are in Saudi Riyals. Write amounts as plain numbers (e.g. 1,250) — the UI adds the riyal symbol.
- Reply in the shopper's language: Arabic if language is "ar", otherwise English.
- Be short and operational: 2-4 sentences, then at most 3 bullet lines naming specific products and why they fit.
- Never output markdown tables, images, links, or product IDs — product cards are rendered separately by the UI.
- If PRODUCTS is empty, say so plainly in one sentence and ask one focused question (spec, size, brand or budget) that would let you search again.
- Never promise delivery dates, discounts, or negotiated prices.`;

const MODE_RULES = {
  boq: `The shopper described a project. Explain in one line that Benna can generate a full bill of quantities with quantities calculated for their project, and that the products listed are a starting shortlist. Invite them to open the BOQ builder.`,
  rfq: `The shopper wants bulk/negotiated pricing. Explain in one line that they should post an RFQ so vendors bid, and that the listed products indicate what Benna stocks in that category.`,
  product_search: `Focus on helping them pick between the listed products.`,
  support: `Answer the operational question briefly using general marketplace facts only; do not speculate about their specific order.`,
  smalltalk: `Answer briefly, then steer back to what they need for their project.`,
};

function buildPayload({ message, intent, products, history }) {
  const compact = products.map((p, i) => ({
    n: i + 1,
    name: p.name,
    nameAr: p.nameArabic || undefined,
    brand: p.brand || undefined,
    price: p.effectivePrice || p.price || undefined,
    unit: p.unit || undefined,
    inStock: p.inStock,
    quote_only: p.isRFQ || undefined,
    why: p.reasons.slice(0, 3),
  }));

  const items = [];
  for (const turn of (history || []).slice(-6)) {
    items.push({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: [
        {
          type: turn.role === "assistant" ? "output_text" : "input_text",
          text: String(turn.content || "").slice(0, 1200),
        },
      ],
    });
  }
  items.push({
    role: "user",
    content: [
      {
        type: "input_text",
        text: `SHOPPER: ${message}
LANGUAGE: ${intent.language || "en"}
INTENT: ${JSON.stringify({
          mode: intent.mode,
          searchQuery: intent.searchQuery,
          brands: intent.brands,
          categories: intent.categories,
          priceMin: intent.priceMin,
          priceMax: intent.priceMax,
          quantity: intent.quantity,
          unit: intent.unit,
        })}
PRODUCTS: ${JSON.stringify(compact)}`,
      },
    ],
  });
  return items;
}

/**
 * @param {Object} args
 * @param {(delta:string)=>void} [args.onDelta]
 * @returns {Promise<{ text: string, aiUsed: boolean }>}
 */
async function synthesize({ message, intent, products, history, onDelta }) {
  const mode = intent.mode || "product_search";
  try {
    const { text } = await respond({
      model: MODEL,
      instructions: `${BASE_RULES}\n${MODE_RULES[mode] || MODE_RULES.product_search}`,
      input: buildPayload({ message, intent, products, history }),
      maxOutputTokens: 700,
      onDelta,
    });
    if (text && text.trim()) return { text: text.trim(), aiUsed: true };
    return { text: fallbackText(intent, products), aiUsed: true };
  } catch (err) {
    if (err.status && [401, 402, 403].includes(err.status)) throw err;
    console.error("[ASSISTANT synthesize] falling back:", err.message);
    return { text: fallbackText(intent, products), aiUsed: false };
  }
}

/** Deterministic reply used when the gateway is unavailable — never a blank answer. */
function fallbackText(intent, products) {
  const ar = intent.language === "ar";
  if (!products.length) {
    return ar
      ? "لم أجد منتجات مطابقة تماماً. هل يمكنك تحديد المقاس أو الماركة أو الميزانية؟"
      : "I couldn't find a close match. Can you tell me the size, brand, or budget you need?";
  }
  const names = products.slice(0, 3).map((p) => (ar && p.nameArabic ? p.nameArabic : p.name));
  return ar
    ? `وجدت ${products.length} منتجاً مناسباً لطلبك، أفضلها: ${names.join("، ")}. يمكنك إضافتها إلى السلة مباشرة.`
    : `I found ${products.length} matching products — the closest are: ${names.join(", ")}. You can add them straight to your cart.`;
}

module.exports = { synthesize, MODEL, fallbackText };
