// models/creditTransaction.model.js
const mongoose = require("mongoose");

const creditTransactionSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "free_trial",
        "purchase",
        "subscription",
        "usage",
        "refund",
        "manual_adjustment",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient querying
creditTransactionSchema.index({ customerId: 1, createdAt: -1 });
creditTransactionSchema.index(
  { "metadata.idempotencyKey": 1 },
  { sparse: true },
);

module.exports = mongoose.model("CreditTransaction", creditTransactionSchema);
