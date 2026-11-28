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
      // Serverless cold starts plus a free-tier Atlas cluster can be
      // slow to select a server; 5s was too tight and caused false
      // "disconnected" results in production, so allow up to 30s.
      serverSelectionTimeoutMS: 30000,
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
