const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - configure CORS based on env var.
// If ALLOW_ALL_ORIGINS=true the server will allow any origin (useful for testing).
// Otherwise we build an allowlist from FRONTEND_ORIGIN and FRONTEND_PROD_ORIGIN.
const allowAll = String(process.env.ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true'
if (allowAll) {
  console.log('CORS: allowing all origins (ALLOW_ALL_ORIGINS=true)')
  app.use(cors())
} else {
  const allowedOrigins = [process.env.FRONTEND_ORIGIN, process.env.FRONTEND_PROD_ORIGIN].filter(Boolean)
  console.log('CORS: using allowlist for origins:', allowedOrigins)
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow non-browser requests (curl, server-to-server) when origin is undefined
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true
  }
  app.use(cors(corsOptions))
}

app.use(bodyParser.json())

// Explicitly handle OPTIONS preflight requests to ensure CORS headers are present
// This is useful in some hosting/proxy environments where the cors middleware
// may not always add headers for preflight.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    try {
      const origin = req.headers.origin || ''
      const allowedOrigins = [process.env.FRONTEND_ORIGIN, process.env.FRONTEND_PROD_ORIGIN].filter(Boolean)
      if (allowAll) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Credentials', 'true')
      } else if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        // If origin is falsy (server-to-server or curl), echo back nothing
        if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Credentials', 'true')
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      return res.sendStatus(204)
    } catch (err) {
      // Ensure we never crash on OPTIONS - log and return permissive headers for debugging
      console.error('OPTIONS handler error:', err)
      try {
        if (allowAll) {
          res.setHeader('Access-Control-Allow-Origin', '*')
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return res.sendStatus(204)
      } catch (err2) {
        console.error('OPTIONS fallback error:', err2)
        return res.status(500).end()
      }
    }
  }
  next()
})

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
