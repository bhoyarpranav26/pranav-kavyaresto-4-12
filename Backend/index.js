const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - temporarily allow all origins while debugging CORS on Render.
// WARNING: permissive setting for testing only. Replace with an allowlist
// (using FRONTEND_PROD_ORIGIN / FRONTEND_ORIGIN env vars) before production.
app.use(cors());
app.use(bodyParser.json())

// Note: cors middleware is applied globally above. Explicit `app.options('*', ...)`
// can cause path-to-regexp issues on some environments (see Render logs). The
// global `app.use(cors(...))` handles preflight requests, so we avoid registering
// an explicit '*' options route to prevent startup errors.

// Simple request logger to help debug frontend calls
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} Origin:${req.headers.origin || 'none'}`)
  next()
})

// ==========================
// ✅ MongoDB Connection
// ==========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));


// ==========================
// ✅ Routes Import
// ==========================
console.log("📌 Loading auth routes...");
const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);
console.log("📌 Auth routes mounted at /api/auth");

// Internal/test routes for quick debugging (do not expose in production)
const internalRoutes = require('./routes/internalRoutes')
app.use('/internal', internalRoutes)
console.log('📌 Internal routes mounted at /internal')

const menuRoutes = require('./routes/menuRoutes');
app.use('/api/menu', menuRoutes);
console.log('📌 Menu routes mounted at /api/menu');

const ordersRoutes = require('./routes/ordersRoutes');
app.use('/api/orders', ordersRoutes);
console.log('📌 Orders routes mounted at /api/orders');

const paymentsRoutes = require('./routes/paymentsRoutes');
app.use('/api/payments', paymentsRoutes);
console.log('📌 Payments routes mounted at /api/payments');

// Root test
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Some hosts (Render health checks) send HEAD /. Allow it and return 200 without body.
app.head('/', (req, res) => {
  res.status(200).end();
});

// ==========================
// Start Server
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
