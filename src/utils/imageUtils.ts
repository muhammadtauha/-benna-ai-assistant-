/**
 * Normalize image URLs that may be semicolon-separated strings or arrays.
 * Returns a clean array of image URLs.
 */
export const normalizeImageUrl = (
  url: string | string[] | undefined,
): string[] => {
  if (!url) return [];
  if (Array.isArray(url)) {
    return url.flatMap((u) =>
      u.includes(";") ? u.split(";").filter(Boolean) : [u],
    );
  }
  if (typeof url === "string" && url.includes(";")) {
    return url.split(";").filter(Boolean);
  }
  return url ? [url] : [];
};

/**
 * Get the first usable image URL from a potentially semicolon-separated string or array.
 */
export const getFirstImage = (url: string | string[] | undefined): string => {
  const images = normalizeImageUrl(url);
  return images[0] || "";
};

const INVALID_IMAGE_VALUES = new Set([
  "",
  "null",
  "undefined",
  "[object Object]",
]);

const sanitizeImageValue = (value: string): string => {
  const cleaned = value.trim().replace(/^['"]|['"]$/g, "");
  return INVALID_IMAGE_VALUES.has(cleaned) ? "" : cleaned;
};

export const getProductImages = (
  value: string | string[] | undefined,
  fallback: string = "/placeholder.svg",
): string[] => {
  const normalized = normalizeImageUrl(value)
    .map(sanitizeImageValue)
    .filter(Boolean);

  return normalized.length > 0 ? normalized : [fallback];
};

export const getProductImage = (
  value: string | string[] | undefined,
  fallback: string = "/placeholder.svg",
): string => getProductImages(value, fallback)[0];
