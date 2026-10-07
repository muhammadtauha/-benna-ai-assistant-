// Minimal user model for the standalone assistant demo.
// Mirrors the fields the assistant + auth flow actually use.
const mongoose = require("mongoose");

const authSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    password: { type: String, required: true },
    // 0 = Admin, 1 = User, 2 = Vendor (same convention as Benna)
    roleId: { type: Number, default: 1 },
    stateId: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Auth", authSchema);
