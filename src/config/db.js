const mongoose = require("mongoose");

/**
 * Connect to MongoDB using the URI from the environment.
 * Follows the same defensive pattern as my earlier notes app:
 * errors are caught and logged so the HTTP server keeps running
 * (the /health endpoint reports the live connection state).
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("MONGO_URI is not set — skipping database connection.");
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

module.exports = connectDB;
