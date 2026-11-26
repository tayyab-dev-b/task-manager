require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB. A failed connection is logged inside connectDB and
// does NOT crash the HTTP server — /health keeps reporting the DB state.
connectDB();

app.listen(PORT, () => {
  console.log(`Task Manager API is running on port ${PORT}`);
});
