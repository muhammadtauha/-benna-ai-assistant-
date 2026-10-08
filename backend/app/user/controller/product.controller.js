// Public product read — used by the product detail page.
const Product = require("../../vendor/model/product.model");

/** GET /api/users/website/products/:slug */
const getBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      uniqueProductSlug: req.params.slug,
      visible: true,
      status: { $in: ["approved", "published"] },
    }).lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    return res.json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBySlug };
