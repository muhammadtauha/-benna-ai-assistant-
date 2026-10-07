// models/userCredits.model.js
const mongoose = require("mongoose");

const userCreditsSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true, // Explicit index declaration
    },
    balance: {
      type: Number,
      default: 50,
      min: 0, // Prevent negative balances at schema level
    },
    freeTrialUsed: {
      type: Boolean,
      default: false,
    },
    totalPurchased: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscriptionPlan: {
      type: String,
      // `null` must be a valid enum value here — it's the explicit "no
      // active plan" state, set as the schema default AND written directly
      // via $set: { subscriptionPlan: null } when a subscription expires
      // (see getCredits). Without `null` in this list, Mongoose's enum
      // validator rejected the default itself on every UserCredits.create()
      // call, so ANY brand-new customer's first credits/BOQ interaction
      // (grantFreeBOQsIfEligible's create-new-doc path) threw a
      // ValidationError and 500'd — free-trial grant, GET credits, and
      // "claim free 50" purchase were all broken for first-time users.
      enum: [
        "starter_monthly",
        "pro_monthly",
        "business_monthly",
        "starter_yearly",
        "pro_yearly",
        "business_yearly",
        null,
      ],
      default: null,
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    isUnlimited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index for subscription queries
userCreditsSchema.index({ subscriptionPlan: 1, subscriptionExpiresAt: 1 });

// Virtual to check if subscription is currently active
userCreditsSchema.virtual("subscriptionActive").get(function () {
  if (!this.subscriptionPlan || !this.subscriptionExpiresAt) return false;
  return new Date() <= new Date(this.subscriptionExpiresAt);
});

// Pre-save hook to auto-set isUnlimited flag
userCreditsSchema.pre("save", function (next) {
  if (this.subscriptionPlan?.includes("business") && this.subscriptionActive) {
    this.isUnlimited = true;
  } else {
    this.isUnlimited = false;
  }
  next();
});

module.exports = mongoose.model("UserCredits", userCreditsSchema);
