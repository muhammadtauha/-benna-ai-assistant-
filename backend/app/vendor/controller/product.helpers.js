// Standalone trim of Benna's product.helpers — only the two exports the
// product model's hooks use. Search-index/Algolia/cache reindexing is a no-op
// here (no such infra in this build).
const slugify = require("slugify");

const getProductModel = () => require("../model/product.model");

/** Stable slug: reuse if the name base matches, else append a timestamp. */
const generateStableSlug = async (product) => {
  const baseSlug = slugify(product.name, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });

  if (product.uniqueProductSlug) {
    const existingBase = product.uniqueProductSlug.replace(/-[0-9]{13}$/, "");
    if (existingBase === baseSlug) return product.uniqueProductSlug;
  }

  const timestamp = Date.now();
  let newSlug = `${baseSlug}-${timestamp}`;
  const Product = getProductModel();
  let exists = await Product.findOne({ uniqueProductSlug: newSlug })
    .maxTimeMS(5000)
    .lean();
  let attempts = 0;
  while (exists && attempts < 5) {
    newSlug = `${baseSlug}-${timestamp}-${attempts}`;
    exists = await Product.findOne({ uniqueProductSlug: newSlug })
      .maxTimeMS(5000)
      .lean();
    attempts += 1;
  }
  return newSlug;
};

/** No-op: no search index / cache layer in the standalone build. */
const reindexProductOnSlugChange = async () => {};

module.exports = { generateStableSlug, reindexProductOnSlugChange };
