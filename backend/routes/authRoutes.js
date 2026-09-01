const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const rateLimit = require('express-rate-limit');
const User     = require('../models/User');

// ── Rate limiters ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again in 1 hour.' },
});

// ── Helpers ────────────────────────────────────────────────────────────────
const PASSWORD_MIN = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const DEV_MODE = process.env.NODE_ENV !== 'production' || process.env.SMS_PROVIDER === 'development';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

function normalizePhoneNumber(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length > 10 && !digits.startsWith('91')) return `+${digits}`;
  return digits.length >= 10 ? `+${digits}` : '';
}

function validateIndianPhoneNumber(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  return /^\+91[6-9]\d{9}$/.test(normalized);
}

function buildUserPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber || '',
    phoneVerified: Boolean(user.phoneVerified),
    defaultAddress: user.defaultAddress || '',
    selectedVoice: user.selectedVoice || 'Google UK English Female',
    memberSince: user.createdAt,
    addresses: user.addresses || [],
    voicePreferences: user.voicePreferences || { ttsEnabled: true, sttEnabled: true },
  };
}

async function issuePhoneVerificationCode(user, { resend = false } = {}) {
  const now = Date.now();
  const cooldownUntil = user.phoneVerificationCooldownUntil ? new Date(user.phoneVerificationCooldownUntil).getTime() : 0;

  if (!resend && cooldownUntil > now) {
    return { ok: false, reason: 'Please wait before requesting another code.' };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const hashedOtp = await bcrypt.hash(otp, 12);

  user.phoneVerificationCode = hashedOtp;
  user.phoneVerificationExpires = new Date(now + OTP_TTL_MS);
  user.phoneVerificationAttempts = 0;
  user.phoneVerificationCooldownUntil = new Date(now + RESEND_COOLDOWN_MS);
  user.phoneVerified = false;
  await user.save();

  return { ok: true, code: otp, expiresAt: user.phoneVerificationExpires };
}

// =============================================================================
// POST /register
// =============================================================================
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phoneNumber } = req.body;
    console.log('[REGISTER] Attempt for email:', email);

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!email?.trim() || !validateEmail(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!phoneNumber?.trim() || !validateIndianPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Please enter a valid Indian mobile number.' });
    }
    if (!confirmPassword || password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phoneNumber: normalizedPhone },
      ],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      if (existingUser.phoneNumber === normalizedPhone) {
        return res.status(409).json({ error: 'This phone number is already registered.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      phoneVerified: false,
      password: hashedPassword,
    });
    await user.save();

    const verification = await issuePhoneVerificationCode(user, { resend: false });
    if (!verification.ok) {
      return res.status(429).json({ error: verification.reason });
    }

    console.log('[REGISTER] User created successfully:', normalizedEmail, 'Phone:', normalizedPhone);
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully. Please verify your phone number.',
      token,
      requiresPhoneVerification: true,
      otpSentTo: normalizedPhone,
      expiresAt: verification.expiresAt,
      devOtp: DEV_MODE ? verification.code : undefined,
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error('[REGISTER] Error:', error.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// =============================================================================
// POST /verify-phone
// =============================================================================
router.post('/verify-phone', authLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token is required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.phoneNumber) {
      return res.status(400).json({ error: 'No phone number is associated with this account.' });
    }

    if (user.phoneVerified) {
      return res.json({ success: true, message: 'Phone number already verified.', user: buildUserPayload(user) });
    }

    const expiry = user.phoneVerificationExpires ? new Date(user.phoneVerificationExpires).getTime() : 0;
    if (!user.phoneVerificationCode || expiry < Date.now()) {
      return res.status(400).json({ error: 'Verification code expired. Please request a new one.', expired: true });
    }

    if (user.phoneVerificationAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    const otp = String(code || '').trim();
    const isMatch = await bcrypt.compare(otp, user.phoneVerificationCode);

    if (!isMatch) {
      user.phoneVerificationAttempts += 1;
      await user.save();
      return res.status(400).json({
        error: `Invalid verification code. ${MAX_OTP_ATTEMPTS - user.phoneVerificationAttempts} attempts remaining.`,
        attemptsLeft: Math.max(0, MAX_OTP_ATTEMPTS - user.phoneVerificationAttempts),
      });
    }

    user.phoneVerified = true;
    user.phoneVerificationCode = '';
    user.phoneVerificationExpires = null;
    user.phoneVerificationAttempts = 0;
    await user.save();

    const refreshedToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Phone number verified successfully.',
      token: refreshedToken,
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error('[VERIFY_PHONE] Error:', error.message);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    res.status(500).json({ error: 'Failed to verify phone number.' });
  }
});

// =============================================================================
// POST /resend-otp
// =============================================================================
router.post('/resend-otp', authLimiter, async (req, res) => {
  try {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication token is required.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.phoneNumber) return res.status(400).json({ error: 'No phone number is attached to this account.' });
    if (user.phoneVerified) return res.json({ success: true, message: 'Phone number is already verified.' });

    const cooldownMs = user.phoneVerificationCooldownUntil ? new Date(user.phoneVerificationCooldownUntil).getTime() - Date.now() : 0;
    if (cooldownMs > 0) {
      return res.status(429).json({ error: `Please wait ${Math.ceil(cooldownMs / 1000)}s before requesting a new code.` });
    }

    const verification = await issuePhoneVerificationCode(user, { resend: true });
    if (!verification.ok) {
      return res.status(429).json({ error: verification.reason });
    }

    res.json({
      success: true,
      message: 'A new verification code has been sent.',
      otpSentTo: user.phoneNumber,
      expiresAt: verification.expiresAt,
      devOtp: DEV_MODE ? verification.code : undefined,
    });
  } catch (error) {
    console.error('[RESEND_OTP] Error:', error.message);
    res.status(500).json({ error: 'Failed to send a new verification code.' });
  }
});

// =============================================================================
// POST /change-phone
// =============================================================================
router.post('/change-phone', authLimiter, async (req, res) => {
  try {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication token is required.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { phoneNumber } = req.body;
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!validateIndianPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Please enter a valid Indian mobile number.' });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const duplicate = await User.findOne({ phoneNumber: normalizedPhone, _id: { $ne: user._id } });
    if (duplicate) {
      return res.status(409).json({ error: 'This phone number is already registered.' });
    }

    user.phoneNumber = normalizedPhone;
    user.phoneVerified = false;
    const verification = await issuePhoneVerificationCode(user, { resend: true });

    res.json({
      success: true,
      message: 'Phone number updated. Please verify your new number.',
      otpSentTo: normalizedPhone,
      expiresAt: verification.expiresAt,
      devOtp: DEV_MODE ? verification.code : undefined,
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error('[CHANGE_PHONE] Error:', error.message);
    res.status(500).json({ error: 'Failed to update phone number.' });
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
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.phoneNumber && !user.phoneVerified) {
      const verification = await issuePhoneVerificationCode(user, { resend: true });
      return res.status(403).json({
        error: 'Phone verification required before continuing.',
        requiresPhoneVerification: true,
        userId: user._id,
        phoneNumber: user.phoneNumber,
        devOtp: DEV_MODE ? verification.code : undefined,
      });
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
      user: buildUserPayload(user),
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

    if (!user) {
      return res.json({ message: 'If an account exists for that email, a reset link has been generated.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

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

