const mongoose = require("mongoose");
const config = require("./utils/config");

const connectDB = async () => {
  try {
    let dbName = "";
    if (process.env.NODE_ENV === "development") {
      dbName = "gosolar_dev";
      console.log("connecting to go_solar development DB...");
    } else {
      dbName = "gosolar_prod";
      console.log("connecting to go_solar production DB...");
    }

    const db = await mongoose.connect(config.MONGO_URI, {
      dbName,
    });
    console.log(
      `✅ MongoDB Connected to: ${db.connection.host || "localhost"} (${db.connection.name})`,
    );

    // Run database migrations on startup
    const runDbMigration = require("./utils/migration");
    await runDbMigration();

    return db;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
