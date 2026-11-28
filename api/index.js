// Vercel serverless entry point.
//
// Vercel turns every file in /api into a serverless function. The
// rewrites in vercel.json send all /api/* and /health traffic here,
// and this module hands those requests to the exact same Express app
// that server.js serves locally and on Render. The static web UI in
// /public is served by Vercel's own static layer, so this function
// only ever handles API requests.
require("dotenv").config();

const mongoose = require("mongoose");
const app = require("../src/app");
const connectDB = require("../src/config/db");

// Attempt the MongoDB connection when the function module loads,
// mirroring server.js. connectDB is fail-soft: failures are logged,
// never thrown, and /health keeps reporting the live connection
// state. On Vercel this runs once per cold start; warm invocations
// reuse the already-loaded module (and its Mongoose connection).
connectDB();

// Serverless functions can be frozen between invocations, which can
// interrupt the fire-and-forget connection above. Before handing a
// request to the app, make sure a connection attempt has completed:
// if Mongoose is not connected, await one (shared) attempt first.
// The attempt is fail-soft and time-bounded by the driver's own
// serverSelectionTimeoutMS, so a down database delays the request
// but never crashes the function.
let pendingConnection = null;

function ensureConnection() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }
  if (!pendingConnection) {
    pendingConnection = connectDB().finally(() => {
      pendingConnection = null;
    });
  }
  return pendingConnection;
}

module.exports = async (req, res) => {
  await ensureConnection();
  return app(req, res);
};
