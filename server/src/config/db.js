// config/db.js - Unified: supports both MONGODB_URI and MONGO_URI for compatibility

const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";
    await mongoose.connect(uri);
    logger.info("MongoDB Connected");
    console.log("MongoDB Connected");
  } catch (error) {
    logger.error("MongoDB connection error: " + error.message);
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;