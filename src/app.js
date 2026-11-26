const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// ---- View engine (minimal EJS landing page) ----
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---- Global middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ---- Landing page ----
app.get("/", (req, res) => {
  res.render("index", {
    dbState: mongoose.connection.readyState === 1 ? "connected" : "not connected",
  });
});

// ---- Health check ----
app.get("/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    status: "ok",
    database: dbConnected ? "connected" : "disconnected",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// ---- Errors ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
