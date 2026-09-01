const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

// Force Node.js DNS to prefer IPv4 — fixes mongodb+srv SRV lookup on Windows
require('dns').setDefaultResultOrder('ipv4first');

// ─── Environment Variable Validation ───────────────────────────────────────────
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'GROQ_API_KEY'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const app = express();

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests. Please wait a moment before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── CORS — allow both localhost variants with credentials ────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

// ─── Body parser — store raw body for Razorpay webhook verification ───────────
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); },
}));

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter);

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB Connected (Primary URI)');
  } catch (err) {
    console.warn('Primary MongoDB Connection Failed, trying local fallback:', err.message);
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/agentic_checkout', { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB Connected (Local Fallback)');
    } catch (fallbackErr) {
      console.error('MongoDB Connection Error:', fallbackErr);
    }
  }
};
connectDB();

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api',      require('./routes/orderRoutes'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'SnapBuy API is running', status: 'ok', version: '2.0.0' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
