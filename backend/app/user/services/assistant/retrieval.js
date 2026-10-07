// backend/app/user/services/assistant/retrieval.js
// Hybrid retrieval: Mongo keyword relevance (authoritative business data) +
// pgvector semantic recall (best-effort). No AI call happens here.
const Product = require("../../../vendor/model/product.model");
const {
  buildSearchVariants,
  escapeRegex,
  buildExactMatchScores,
  buildRegexMatchScores,
  buildWordMatchBonus,
} = require("../../../../helpers/searchApi");

const VISIBLE_STATUSES = ["approved", "published"];
const PROJECTION = {
  name: 1,
  nameArabic: 1,
  productImageUrl: 1,
  uniqueProductSlug: 1,
  price: 1,
  discountMode: 1,
  discountValue: 1,
  brand: 1,
  sku: 1,
  collections: 1,
  inventory: 1,
  unitOfMeasurement: 1,
  isRFQ: 1,
  uploadedByVendorId: 1,
  isFeatured: 1,
  relevanceScore: 1,
};

const escapeLiteral = (v) => String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildFilters(intent) {
  const filter = {
    visible: true,
    status: { $in: VISIBLE_STATUSES },
  };
  const and = [];

  if (intent.inStockOnly) filter.inventory = "InStock";

  if (typeof intent.priceMin === "number" || typeof intent.priceMax === "number") {
    filter.price = {};
    if (typeof intent.priceMin === "number") filter.price.$gte = intent.priceMin;
    if (typeof intent.priceMax === "number") filter.price.$lte = intent.priceMax;
    // A zero price means "call for price" on this catalog — never a match for a budget query.
    filter.price.$gt = Math.max(filter.price.$gte ?? 0, 0);
  }

  if (Array.isArray(intent.brands) && intent.brands.length) {
    and.push({
      $or: intent.brands.map((b) => ({
        brand: { $regex: new RegExp(escapeLiteral(b), "i") },
      })),
    });
  }

  if (Array.isArray(intent.categories) && intent.categories.length) {
    and.push({
      $or: intent.categories.map((c) => ({
        collections: { $regex: new RegExp(escapeLiteral(c), "i") },
      })),
    });
  }

  if (and.length) filter.$and = and;
  return filter;
}

/** Mongo keyword pass — same scoring model as site search, so results agree. */
async function keywordSearch(intent, { limit = 40 } = {}) {
  const term = String(intent.searchQuery || "").trim();
  if (!term) return [];

  const variants = buildSearchVariants(term);
  const escaped = variants.map(escapeRegex);
  const combined = escaped.join("|");
  const searchRegex = new RegExp(combined, "i");

  const words = [
    ...new Set([
      ...term.split(/\s+/).filter((w) => w.length > 1),
      ...(intent.keywords || []).filter((w) => String(w).length > 1),
    ]),
  ];
  const wordPatterns = [...new Set(words.flatMap(buildSearchVariants))].map(escapeRegex);

  const SEARCHABLE = [
    "name",
    "nameArabic",
    "description",
    "descriptionArabic",
    "collections",
    "sku",
    "brand",
  ];

  const match = {
    ...buildFilters(intent),
    $or: SEARCHABLE.map((field) => ({ [field]: searchRegex })),
  };

  const rows = await Product.aggregate(
    [
      { $match: match },
      {
        $addFields: {
          relevanceScore: {
            $sum: [
              ...buildExactMatchScores(term, {
                name: 1000,
                nameArabic: 1000,
                sku: 1000,
                collections: 200,
              }),
              ...buildRegexMatchScores(combined, {
                name: 300,
                nameArabic: 300,
                sku: 400,
                brand: 120,
                description: 50,
                descriptionArabic: 50,
                collections: 80,
              }),
              ...buildWordMatchBonus(wordPatterns, {
                name: 100,
                nameArabic: 100,
                collections: 60,
              }),
            ],
          },
        },
      },
      { $match: { relevanceScore: { $gt: 40 } } },
      { $sort: { relevanceScore: -1, isFeatured: -1, createdAt: -1 } },
      { $limit: limit },
      { $project: PROJECTION },
    ],
    { allowDiskUse: true, maxTimeMS: 20000 },
  );

  return rows.map((r) => ({ ...r, source: "keyword" }));
}

/**
 * pgvector semantic pass. Best-effort: the catalog mirror + embeddings are
 * populated lazily, so a miss here must never fail the turn.
 */
async function semanticSearch(intent, { limit = 25 } = {}) {
  try {
    const { query, toVectorLiteral } = require("../../../../helpers/pgClient");
    const { embed } = require("../../../../helpers/lovableAiGateway");
    const text = [intent.searchQuery, ...(intent.keywords || [])]
      .filter(Boolean)
      .join(" \n ");
    if (!text) return [];

    const [vector] = await embed(text);
    const { rows } = await query(
      `SELECT * FROM public."matchCatalogProducts"($1::vector, $2, $3::text[], $4)`,
      [toVectorLiteral(vector), limit, null, Number(process.env.ASSISTANT_SIM_FLOOR || 0.42)],
    );
    return rows.map((r) => ({
      productId: String(r.productId),
      similarity: Number(r.similarity) || 0,
      source: "semantic",
    }));
  } catch (err) {
    console.warn("[ASSISTANT retrieval] semantic pass skipped:", err.message);
    return [];
  }
}

/** Hydrate semantic-only hits from Mongo so every candidate has real business data. */
async function hydrate(productIds, intent) {
  if (!productIds.length) return [];
  const mongoose = require("mongoose");
  const ids = productIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (!ids.length) return [];
  const rows = await Product.find(
    { _id: { $in: ids }, ...buildFilters(intent) },
    PROJECTION,
  )
    .limit(ids.length)
    .lean()
    .maxTimeMS(15000);
  return rows;
}

/**
 * @returns {Promise<Array>} candidate products with `relevanceScore` and/or `similarity`
 */
async function retrieve(intent, { limit = 40 } = {}) {
  const [keyword, semantic] = await Promise.all([
    keywordSearch(intent, { limit }),
    semanticSearch(intent, { limit: 25 }),
  ]);

  const byId = new Map();
  for (const p of keyword) byId.set(String(p._id), p);

  const simById = new Map(semantic.map((s) => [s.productId, s.similarity]));
  for (const [id, sim] of simById) {
    const existing = byId.get(id);
    if (existing) existing.similarity = sim;
  }

  const missing = [...simById.keys()].filter((id) => !byId.has(id));
  if (missing.length) {
    const hydrated = await hydrate(missing.slice(0, 20), intent);
    for (const p of hydrated) {
      byId.set(String(p._id), {
        ...p,
        relevanceScore: 0,
        similarity: simById.get(String(p._id)) || 0,
        source: "semantic",
      });
    }
  }

  return [...byId.values()];
}

module.exports = { retrieve, keywordSearch, semanticSearch };
