// backend/app/user/services/assistant/ranker.js
// Deterministic ranking. The AI never orders products — this file does, so
// results are explainable, reproducible and free.

function effectivePrice(p) {
  const price = Number(p.price) || 0;
  const value = Number(p.discountValue) || 0;
  if (!value) return price;
  if (p.discountMode === "FIXED") return Math.max(price - value, 0);
  return Math.max(price - (price * value) / 100, 0);
}

function normalize(values) {
  const max = Math.max(...values, 0);
  return (v) => (max > 0 ? v / max : 0);
}

/**
 * @param {Array} candidates
 * @param {Object} intent
 * @param {{ topN?: number }} opts
 */
function rank(candidates, intent, { topN = 8 } = {}) {
  if (!candidates.length) return [];

  const normRelevance = normalize(candidates.map((c) => Number(c.relevanceScore) || 0));
  const prices = candidates.map(effectivePrice).filter((p) => p > 0);
  const median = prices.length
    ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    : 0;

  const budgetMax = typeof intent.priceMax === "number" ? intent.priceMax : null;
  const budgetMin = typeof intent.priceMin === "number" ? intent.priceMin : null;

  const scored = candidates.map((c) => {
    const price = effectivePrice(c);
    const inStock = c.inventory !== "OutOfStock";

    // Price fit: inside budget wins; without a budget, prefer near-median
    // pricing so we don't lead with outliers.
    let priceFit = 0.5;
    if (budgetMax || budgetMin) {
      const okMax = budgetMax ? price <= budgetMax : true;
      const okMin = budgetMin ? price >= budgetMin : true;
      priceFit = okMax && okMin ? 1 : 0.1;
    } else if (median > 0 && price > 0) {
      priceFit = 1 / (1 + Math.abs(price - median) / median);
    } else if (price === 0) {
      priceFit = 0.2;
    }

    const parts = {
      relevance: 0.42 * normRelevance(Number(c.relevanceScore) || 0),
      semantic: 0.18 * Math.min(Number(c.similarity) || 0, 1),
      stock: 0.16 * (inStock ? 1 : 0),
      price: 0.12 * priceFit,
      quality:
        0.12 *
        ((c.productImageUrl ? 0.4 : 0) +
          (c.brand ? 0.3 : 0) +
          (c.isFeatured ? 0.2 : 0) +
          (c.isRFQ ? 0 : 0.1)),
    };

    const score = Object.values(parts).reduce((a, b) => a + b, 0);
    const reasons = [];
    if (parts.relevance > 0.3) reasons.push("close spec match");
    if (parts.semantic > 0.1) reasons.push("semantically similar");
    if (inStock) reasons.push("in stock");
    if (budgetMax && price <= budgetMax) reasons.push("within budget");
    if (c.brand) reasons.push(`brand ${c.brand}`);

    return {
      productId: String(c._id),
      name: c.name || "",
      nameArabic: c.nameArabic || "",
      slug: c.uniqueProductSlug || "",
      image: c.productImageUrl || "",
      brand: c.brand || "",
      sku: c.sku || "",
      collections: c.collections || "",
      unit: c.unitOfMeasurement || "",
      price: Number(c.price) || 0,
      effectivePrice: price,
      inStock,
      isRFQ: !!c.isRFQ,
      vendorId: c.uploadedByVendorId || "",
      score: Number(score.toFixed(4)),
      reasons,
    };
  });

  // Diversify: at most 3 items per brand so one supplier can't own the answer.
  const perBrand = new Map();
  const out = [];
  for (const item of scored.sort((a, b) => b.score - a.score)) {
    const key = (item.brand || "_").toLowerCase();
    const used = perBrand.get(key) || 0;
    if (used >= 3) continue;
    perBrand.set(key, used + 1);
    out.push(item);
    if (out.length >= topN) break;
  }
  return out;
}

module.exports = { rank, effectivePrice };
