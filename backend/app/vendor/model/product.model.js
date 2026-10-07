const mongoose = require("mongoose");

const QuantityTierSchema = new mongoose.Schema(
  {
    minQty: { type: Number, required: true, min: 1 },
    maxQty: { type: Number, min: 1, default: null },
    pricePerUnit: { type: Number, min: 0, default: null },
  },
  { _id: false },
);

const RelatedDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    documentUrl: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const ProductVariantValueSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const ProductVariantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    optionType: { type: String, trim: true, default: "" },
    values: { type: [ProductVariantValueSchema], default: [] },
    rawValue: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const VariantPriceSchema = new mongoose.Schema(
  {
    combination: { type: [String], default: [] },
    priceDifference: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true, default: "" },
    imageUrls: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const EmbeddedVariantSchema = new mongoose.Schema(
  {
    combination: { type: [String], default: [] },
    combinationKey: { type: String, trim: true, default: "" },
    sku: { type: String, trim: true, default: "" },
    stock: { type: Number, default: 0, min: 0 },
    inventory: {
      type: String,
      enum: ["InStock", "OutOfStock"],
      default: "InStock",
    },
    priceDifference: { type: Number, default: 0, min: 0 },
    surcharge: { type: Number, default: 0, min: 0 },
    imageUrls: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const ValueWithUnitSchema = new mongoose.Schema(
  {
    value: { type: Number, default: 0, min: 0 },
    unit: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const CustomFieldSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "" },
    value: { type: String, trim: true, default: "" },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true, default: "" },
    imageUrls: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const DimensionsSchema = new mongoose.Schema(
  {
    length: { type: Number, default: 0, min: 0 },
    width: { type: Number, default: 0, min: 0 },
    height: { type: Number, default: 0, min: 0 },
    unit: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const TechnicalSpecificationsSchema = new mongoose.Schema(
  {
    materialType: { type: String, trim: true, default: "" },
    dimensions: { type: DimensionsSchema, default: () => ({}) },
    weightPerUnit: { type: ValueWithUnitSchema, default: () => ({}) },
    gradeStandard: { type: String, trim: true, default: "" },
    color: { type: String, trim: true, default: "" },
    fireRating: { type: String, trim: true, default: "" },
    waterResistance: { type: String, trim: true, default: "" },
    loadCapacity: { type: String, trim: true, default: "" },
    warrantyPeriod: { type: ValueWithUnitSchema, default: () => ({}) },
  },
  { _id: false },
);

const LocationShippingSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    shippingCharge: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const WholesalePriceTierSchema = new mongoose.Schema(
  {
    minQuantity: { type: Number, default: 1, min: 1 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false },
);

const InventoryTrackingSchema = new mongoose.Schema(
  {
    trackInventory: { type: Boolean, default: false },
    quantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const RfqDetailsSchema = new mongoose.Schema(
  {
    budgetMin: { type: Number, min: 0, default: null },

    budgetMax: { type: Number, min: 0, default: null },

    quoteValidityDays: { type: Number, min: 1, default: null },

    currency: { type: String, default: "SAR" },

    quantityTiers: { type: [QuantityTierSchema], default: [] },

    requireTechnicalDrawings: { type: Boolean, default: false },

    sampleRequired: { type: Boolean, default: false },

    inspectionRequired: { type: Boolean, default: false },

    deliveryLocation: { type: String, trim: true, default: "" },

    preferredDeliveryDate: { type: Date, default: null },

    incoterms: {
      type: String,
      trim: true,
      default: "",
      enum: ["FOB", "CIF", "EXW", ""],
    },

    leadTimeForQuote: { type: Number, min: 1, default: null },

    expectedDeliveryTimeDays: { type: Number, min: 0, default: null },

    paymentTerms: {
      type: String,
      trim: true,
      default: "",
      enum: ["ADVANCE", "LC", "CREDIT", "NET_30", ""],
    },

    vatHandling: {
      type: String,
      trim: true,
      default: "",
      enum: ["BUYER", "SELLER", "SPLIT", ""],
    },

    customsClearance: {
      type: String,
      trim: true,
      default: "",
      enum: ["BUYER", "SELLER", "SPLIT", ""],
    },

    warrantyRequired: { type: String, trim: true, default: "" },

    requireSasoCertification: { type: Boolean, default: false },

    requireHalalCertification: { type: Boolean, default: false },

    requireCeMarking: { type: Boolean, default: false },

    requireIsoCertification: { type: Boolean, default: false },

    otherCertifications: { type: String, trim: true, default: "" },

    preferredVendors: { type: String, trim: true, default: "" },

    vendorLocation: {
      type: String,
      trim: true,
      default: "",
      enum: ["LOCAL", ""],
    },

    vendorRatingMin: { type: Number, min: 0, max: 5, default: null },

    previouslyWorkedWith: {
      type: String,
      trim: true,
      default: "",
      enum: ["YES", "NO", "ANY", ""],
    },

    projectReference: { type: String, trim: true, default: "" },

    rfqPublishedDate: { type: Date, default: Date.now },

    rfqClosingDate: { type: Date, default: null },

    expectedDecisionDate: { type: Date, default: null },

    rfqStatus: {
      type: String,
      default: "OPEN",
      enum: ["OPEN", "CLOSED", "AWARDED", "DRAFT"],
    },

    isPublicRfq: { type: Boolean, default: true },

    visibleToVerifiedOnly: { type: Boolean, default: false },

    technicalDrawingsUrl: { type: String, trim: true, default: "" },

    receivedBids: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Bid",
      default: [],
    },

    awardedBidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },

    rfqReferenceNumber: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const ProductSchema = new mongoose.Schema(
  {
    handleId: {
      type: String,
      trim: true,
      index: true,
    },

    fieldType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      index: true,
    },

    nameArabic: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    descriptionArabic: {
      type: String,
      trim: true,
      default: "",
    },

    uniqueProductSlug: {
      type: String,
      required: true,
      trim: true,
    },

    productImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    productVideoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    relatedDocuments: {
      type: [RelatedDocumentSchema],
      default: [],
    },

    collections: {
      type: String,
      trim: true,
      index: true,
    },
    warehouseLocationId: {
      type: mongoose.Types.ObjectId,
      ref: "WarehouseLocation",
      index: true,
    },
    unitOfMeasurement: {
      type: String,
      trim: true,
      default: "",
    },
    unitOfMeasurementOther: {
      type: String,
      trim: true,
      default: "",
    },

    sku: {
      type: String,
      required: true,
      trim: true,
    },

    ribbon: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    surcharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    visible: {
      type: Boolean,
      default: true,
      index: true,
    },

    discountMode: {
      type: String,
      enum: ["PERCENT", "FIXED"],
      default: "PERCENT",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    inventory: {
      type: String,
      enum: ["InStock", "OutOfStock"],
      default: "InStock",
      index: true,
    },

    inventoryTracking: {
      type: InventoryTrackingSchema,
      default: () => ({}),
    },

    weight: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedDeliveryTime: {
      type: String,
      trim: true,
      default: "",
    },
    freeShipping: {
      type: Boolean,
      default: false,
    },
    locationBasedShipping: {
      type: Boolean,
      default: false,
    },
    locationShipping: {
      type: [LocationShippingSchema],
      default: [],
    },
    leadDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    cost: {
      type: Number,
      default: 0,
      min: 0,
    },

    productVariants: {
      type: [ProductVariantSchema],
      default: [],
    },

    variantPrices: {
      type: [VariantPriceSchema],
      default: [],
    },
    variants: {
      type: [EmbeddedVariantSchema],
      default: [],
    },

    productOptionName1: { type: String, trim: true, default: "" },
    productOptionType1: { type: String, trim: true, default: "" },
    productOptionDescription1: { type: String, trim: true, default: "" },

    productOptionName2: { type: String, trim: true, default: "" },
    productOptionType2: { type: String, trim: true, default: "" },
    productOptionDescription2: { type: String, trim: true, default: "" },

    productOptionName3: { type: String, trim: true, default: "" },
    productOptionType3: { type: String, trim: true, default: "" },
    productOptionDescription3: { type: String, trim: true, default: "" },

    productOptionName4: { type: String, trim: true, default: "" },
    productOptionType4: { type: String, trim: true, default: "" },
    productOptionDescription4: { type: String, trim: true, default: "" },

    productOptionName5: { type: String, trim: true, default: "" },
    productOptionType5: { type: String, trim: true, default: "" },
    productOptionDescription5: { type: String, trim: true, default: "" },

    productOptionName6: { type: String, trim: true, default: "" },
    productOptionType6: { type: String, trim: true, default: "" },
    productOptionDescription6: { type: String, trim: true, default: "" },

    additionalInfoTitle1: { type: String, trim: true, default: "" },
    additionalInfoDescription1: { type: String, trim: true, default: "" },
    additionalInfoTitle2: { type: String, trim: true, default: "" },
    additionalInfoDescription2: { type: String, trim: true, default: "" },
    additionalInfoTitle3: { type: String, trim: true, default: "" },
    additionalInfoDescription3: { type: String, trim: true, default: "" },
    additionalInfoTitle4: { type: String, trim: true, default: "" },
    additionalInfoDescription4: { type: String, trim: true, default: "" },
    additionalInfoTitle5: { type: String, trim: true, default: "" },
    additionalInfoDescription5: { type: String, trim: true, default: "" },
    additionalInfoTitle6: { type: String, trim: true, default: "" },
    additionalInfoDescription6: { type: String, trim: true, default: "" },

    customTextField1: { type: String, trim: true, default: "" },
    customTextCharLimit1: { type: Number, default: 0, min: 0 },
    customTextMandatory1: { type: String, default: "" },

    customTextField2: { type: String, trim: true, default: "" },
    customTextCharLimit2: { type: Number, default: 0, min: 0 },
    customTextMandatory2: { type: String, default: "" },

    installationInstructions: { type: String, trim: true, default: "" },
    installationGuideUrl: { type: String, trim: true, default: "" },
    safetyWarnings: { type: String, trim: true, default: "" },
    safetyDataSheetUrl: { type: String, trim: true, default: "" },

    technicalSpecifications: {
      type: TechnicalSpecificationsSchema,
      default: () => ({}),
    },
    dimensionUnitOther: { type: String, trim: true, default: "" },
    weightUnitOther: { type: String, trim: true, default: "" },

    brand: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    manufacturer: { type: String, trim: true, default: "" },
    countryOfOrigin: { type: String, trim: true, default: "" },
    sasoCertificate: { type: String, trim: true, default: "" },
    sasoCertificateUrl: { type: String, trim: true, default: "" },

    brandLogoUrl: {
      type: String,
      trim: true,
      default:
        "https://static.wixstatic.com/media/b99a57_aff2cf99a8a84a12b8519600aea6f667~mv2.png/v1/fit/w_2500,h_1330,al_c/b99a57_aff2cf99a8a84a12b8519600aea6f667~mv2.png",
    },

    pageTitle: { type: String, trim: true, default: "" },
    metaKeywords: { type: String, trim: true, default: "" },
    metaDescription: { type: String, trim: true, default: "" },
    imageAltText: { type: String, trim: true, default: "" },
    productUrl: { type: String, trim: true, default: "" },
    canonicalUrl: { type: String, trim: true, default: "" },

    tags: { type: [String], default: [] },
    customFields: { type: [CustomFieldSchema], default: [] },
    wholesalePriceTiers: { type: [WholesalePriceTierSchema], default: [] },

    isPurchaseSpecifyDate: { type: Boolean, default: false },
    dateFieldName: { type: String, trim: true, default: "" },
    isLimitDate: { type: Boolean, default: false },
    availableDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    status: {
      type: String,
      enum: [
        "draft",
        "review",
        "approved",
        "rejected",
        "published",
        "unpublished",
        "deactivated",
        "archived",
      ],
      default: "review",
      index: true,
    },

    beforeArchiveStatus: {
      type: String,
      trim: true,
      default: "",
    },

    rejectReason: {
      type: String,
      trim: true,
      default: "",
    },

    uploadedByVendorId: {
      type: String,
      trim: true,
      index: true,
    },

    isRFQ: {
      type: Boolean,
      default: false,
      index: true,
    },

    rfqDetails: { type: RfqDetailsSchema, default: () => ({}) },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    productWixId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: true,
  },
);

// ---------------------- INDEXES ----------------------

ProductSchema.index(
  { uniqueProductSlug: 1 },
  { unique: true, name: "unique_product_slug_idx" },
);

ProductSchema.index({ sku: 1 }, { unique: true, name: "unique_sku_idx" });

ProductSchema.index(
  { name: "text", description: "text" },
  { name: "product_text_search_idx" },
);

ProductSchema.index(
  { collections: 1, status: 1, createdAt: -1 },
  { name: "collection_status_created_idx" },
);

ProductSchema.index(
  { uploadedByVendorId: 1, status: 1, createdAt: -1 },
  { name: "vendor_status_created_idx" },
);

ProductSchema.index(
  { status: 1, visible: 1, createdAt: -1 },
  { name: "status_visible_created_idx" },
);

ProductSchema.index({ price: 1 }, { name: "price_idx" });

ProductSchema.index({ createdAt: -1 }, { name: "created_at_desc_idx" });

ProductSchema.index(
  { brand: 1, status: 1, createdAt: -1 },
  { name: "brand_status_created_idx" },
);

ProductSchema.index(
  { isRFQ: 1, "rfqDetails.rfqStatus": 1, createdAt: -1 },
  { name: "rfq_status_created_idx" },
);

ProductSchema.index(
  { isRFQ: 1, "rfqDetails.rfqClosingDate": 1 },
  { name: "rfq_closing_date_idx" },
);

ProductSchema.index(
  { isRFQ: 1, uploadedByVendorId: 1, "rfqDetails.rfqStatus": 1 },
  { name: "vendor_rfq_status_idx" },
);

// ---------------------- HOOKS ----------------------

const {
  generateStableSlug,
  reindexProductOnSlugChange,
} = require("../controller/product.helpers");

/**
 * FIXED: Single pre-save hook that handles both version tracking AND slug stability
 * Order: 1) Version bumps, 2) Slug generation
 */
ProductSchema.pre("save", async function (next) {
  try {
    // 1. Version tracking
    if (this.isModified("price")) {
      this.priceVersion = (this.priceVersion || 0) + 1;
    }
    if (
      this.isModified("inventoryTracking") ||
      this.isModified("inventoryTracking.quantity")
    ) {
      this.stockVersion = (this.stockVersion || 0) + 1;
    }

    // 2. Slug stability - only regenerate if name changed or no slug exists
    if (!this.isModified("name") && this.uniqueProductSlug) {
      return next();
    }

    const oldSlug = this.uniqueProductSlug;
    const newSlug = await generateStableSlug(this);

    if (oldSlug && oldSlug !== newSlug) {
      this.uniqueProductSlug = newSlug;
      // Background reindex, don't block save
      reindexProductOnSlugChange(this._id, oldSlug, newSlug).catch((err) => {
        console.error(`[Slug Reindex Error] Product ${this._id}:`, err);
      });
    } else if (!this.uniqueProductSlug) {
      this.uniqueProductSlug = newSlug;
    }

    next();
  } catch (error) {
    console.error("[Pre-save Hook Error]", error);
    next(error);
  }
});

ProductSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  if (!update.$inc) update.$inc = {};

  if (
    update.$set &&
    (update.$set.price !== undefined ||
      update.$set["inventoryTracking.quantity"] !== undefined)
  ) {
    if (update.$set.price !== undefined) {
      update.$inc.priceVersion = 1;
    }
    if (update.$set["inventoryTracking.quantity"] !== undefined) {
      update.$inc.stockVersion = 1;
    }
  }

  next();
});

ProductSchema.pre("updateOne", function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  if (!update.$inc) update.$inc = {};

  if (
    update.$set &&
    (update.$set.price !== undefined ||
      update.$set["inventoryTracking.quantity"] !== undefined)
  ) {
    if (update.$set.price !== undefined) {
      update.$inc.priceVersion = 1;
    }
    if (update.$set["inventoryTracking.quantity"] !== undefined) {
      update.$inc.stockVersion = 1;
    }
  }

  next();
});

module.exports =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
