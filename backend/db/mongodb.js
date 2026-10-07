const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.DB_URL || "mongodb://127.0.0.1:27017/benna_assistant";
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
