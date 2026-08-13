const mongoose = require("mongoose");
const config = require("./utils/config");

const connectDB = async () => {
  try {
    let dbName = "";
    if (process.env.NODE_ENV === "development") {
      dbName = "gosolar_dev";
      console.log("connecting to go_solar development DB...");
    }

    const db = await mongoose.connect(config.MONGO_URI, {
      dbName,
    });
    console.log(
      `✅ MongoDB Connected to: ${db.connection.host || "localhost"} (${db.connection.name})`,
    );
    return db;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
