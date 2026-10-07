// helpers/searchApi.js - Convert to CommonJS syntax

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  if (!str) return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate search variants for a term to handle:
 *  - Plural/singular (rebars → rebar, pipes → pipe, boxes → box, batteries → battery)
 *  - Common suffixes (-ing, -ed, -er)
 *  - Multi-word: generates variants for each word + the full phrase
 */
function buildSearchVariants(term) {
  const variants = new Set();
  const lower = term.toLowerCase();
  variants.add(lower);

  // Generate stem variants for a single word
  const stemWord = (word) => {
    const stems = [word];
    // Plural → singular
    if (word.endsWith("ies") && word.length > 4) {
      stems.push(word.slice(0, -3) + "y"); // batteries → battery
    }
    if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("zes")) {
      stems.push(word.slice(0, -2)); // boxes → box
    }
    if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) {
      stems.push(word.slice(0, -1)); // rebars → rebar, pipes → pipe
    }
    // Singular → plural (so "rebar" also matches "rebars")
    if (!word.endsWith("s")) {
      stems.push(word + "s");
    }
    // Common suffixes
    if (word.endsWith("ing") && word.length > 5) {
      stems.push(word.slice(0, -3)); // welding → weld
      stems.push(word.slice(0, -3) + "e"); // piping → pipe
    }
    if (word.endsWith("ed") && word.length > 4) {
      stems.push(word.slice(0, -2)); // coated → coat
      stems.push(word.slice(0, -1)); // coated → coate (fallback, harmless)
    }
    return stems;
  };

  // Single word
  const words = lower.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 1) {
    stemWord(words[0]).forEach((s) => variants.add(s));
    return [...variants];
  }

  // Multi-word: full phrase variants + individual word variants
  // Full phrase as-is
  variants.add(lower);

  // Full phrase with each word stemmed
  const allWordStems = words.map((w) => stemWord(w));
  // Add the "all singular" version: "steel pipes" → "steel pipe"
  const singularPhrase = allWordStems
    .map((stems) =>
      stems[0] === words[allWordStems.indexOf(stems)]
        ? stems[1] || stems[0]
        : stems[0],
    )
    .join(" ");
  variants.add(singularPhrase);

  // Individual words + their stems (for partial matching)
  words.forEach((w) => {
    stemWord(w).forEach((s) => variants.add(s));
  });

  return [...variants];
}

/**
 * Build $cond expressions for exact match scoring.
 * Uses $toLower for case-insensitive comparison without regex overhead.
 */
function buildExactMatchScores(searchTerm, fieldWeights) {
  const lower = searchTerm.toLowerCase();
  return Object.entries(fieldWeights).map(([field, weight]) => ({
    $cond: [
      { $eq: [{ $toLower: { $ifNull: [`$${field}`, ""] } }, lower] },
      weight,
      0,
    ],
  }));
}

/**
 * Build $cond expressions for regex (contains) match scoring.
 */
function buildRegexMatchScores(pattern, fieldWeights) {
  return Object.entries(fieldWeights).map(([field, weight]) => ({
    $cond: [
      {
        $regexMatch: {
          input: { $ifNull: [`$${field}`, ""] },
          regex: pattern,
          options: "i",
        },
      },
      weight,
      0,
    ],
  }));
}

/**
 * Build per-word match bonus: rewards documents that match MORE of the search words.
 * Each matched word adds `weight` points.
 */
function buildWordMatchBonus(wordPatterns, fieldWeights) {
  if (wordPatterns.length <= 1) return [];

  return Object.entries(fieldWeights).map(([field, weight]) => ({
    $multiply: [
      {
        $size: {
          $filter: {
            input: wordPatterns,
            as: "wp",
            cond: {
              $regexMatch: {
                input: { $ifNull: [`$${field}`, ""] },
                regex: "$$wp",
                options: "i",
              },
            },
          },
        },
      },
      weight,
    ],
  }));
}

/**
 * Brand aggregation pipeline.
 */
function buildBrandPipeline(searchRegex, combinedPattern, searchTerm, limit) {
  return [
    {
      $match: {
        visible: true,
        status: { $in: ["approved", "published"] },
        brand: searchRegex,
      },
    },
    {
      $group: {
        _id: "$brand",
        brandLogoUrl: { $first: "$brandLogoUrl" },
        productCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        relevanceScore: {
          $cond: [
            { $eq: [{ $toLower: "$_id" }, searchTerm.toLowerCase()] },
            100,
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$_id",
                    regex: combinedPattern,
                    options: "i",
                  },
                },
                80,
                60,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        brand: "$_id",
        brandLogoUrl: { $ifNull: ["$brandLogoUrl", null] },
        productCount: 1,
        relevanceScore: 1,
      },
    },
    { $sort: { relevanceScore: -1, productCount: -1 } },
    { $limit: limit },
  ];
}

module.exports = {
  escapeRegex,
  buildSearchVariants,
  buildExactMatchScores,
  buildRegexMatchScores,
  buildWordMatchBonus,
  buildBrandPipeline,
};
