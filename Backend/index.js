const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - configure CORS to allow known frontends and enable credentials
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  process.env.FRONTEND_PROD_ORIGIN // optional production frontend URL
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // allow requests with no origin (e.g. curl, mobile apps, or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  credentials: true
}));
app.use(bodyParser.json())

// Enable preflight for all routes
app.options('*', cors())

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
