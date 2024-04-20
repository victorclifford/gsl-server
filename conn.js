// require("dotenv").config();
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
      dbName: dbName,
    });
    console.log(`MONGODB CONNECTED TO: ${db.connection.host}...`);
    return db;
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;
