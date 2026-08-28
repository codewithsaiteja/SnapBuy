const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const rateLimit = require('express-rate-limit');
const User     = require('../models/User');

// ── Rate limiters ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again in 1 hour.' },
});

// ── Helpers ────────────────────────────────────────────────────────────────
const PASSWORD_MIN = 8;

function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null; // valid
}

// =============================================================================
// POST /register
// =============================================================================
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('[REGISTER] Attempt for email:', email);

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: hashedPassword,
    });
    await user.save();
    console.log('[REGISTER] User created successfully:', email);

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('[REGISTER] Error:', error.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// =============================================================================
// POST /login
// =============================================================================
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[LOGIN] Attempt for email:', email);

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Generic message — do not reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[LOGIN] Success for:', email);
    res.json({
      message: 'Login successful.',
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('[LOGIN] Error:', error.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// =============================================================================
// POST /forgot-password
// =============================================================================
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Respond with success regardless — prevents email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists for that email, a reset link has been generated.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // In production, send via email (e.g. Nodemailer + SendGrid).
    // For dev, log the link to the backend console.
    console.log(`[RESET LINK] http://localhost:5173/reset-password/${token}`);

    res.json({ message: 'If an account exists for that email, a reset link has been generated.' });
  } catch (error) {
    console.error('[FORGOT_PASSWORD] Error:', error.message);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// =============================================================================
// POST /reset-password/:token
// =============================================================================
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token }    = req.params;

    if (!password) return res.status(400).json({ error: 'Password is required.' });

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const user = await User.findOne({
      resetPasswordToken:   token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    user.password              = await bcrypt.hash(password, 12);
    user.resetPasswordToken    = undefined;
    user.resetPasswordExpires  = undefined;
    await user.save();

    console.log('[RESET_PASSWORD] Password reset for:', user.email);
    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('[RESET_PASSWORD] Error:', error.message);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

module.exports = router;

