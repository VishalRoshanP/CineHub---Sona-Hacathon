import mongoose from "mongoose";
import dns from "node:dns";
import logger from "./logger.js";

// Use Google public DNS to resolve MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  try {
    // Enable Mongoose debug mode — routes queries through our logger
    mongoose.set("debug", (collectionName, method, query, doc) => {
      logger.dbQuery(collectionName, method, query, doc);
    });

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME,
    });
    console.log(`✅ MongoDB Connected (${conn.connection.host})`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
