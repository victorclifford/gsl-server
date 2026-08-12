const mongoose = require("mongoose");
const config = require("./utils/config");

const connectDB = async () => {
  try {
    const dbName = "gosolar_dev";

    const db = await mongoose.connect(config.MONGO_URI, {
      dbName,
    });
    console.log(
      `✅ MongoDB Connected to: ${db.connection.host || "localhost"} (${db.connection.name})`,
    );
    return db;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    console.log(
      "💡 Tip: Ensure MongoDB service is running locally or verify your MONGO_URI in .env",
    );
  }
};

module.exports = connectDB;
