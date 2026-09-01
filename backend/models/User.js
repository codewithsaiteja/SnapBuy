const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    default: '',
    trim: true,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  phoneVerificationCode: {
    type: String,
    default: '',
  },
  phoneVerificationExpires: {
    type: Date,
    default: null,
  },
  phoneVerificationAttempts: {
    type: Number,
    default: 0,
  },
  phoneVerificationCooldownUntil: {
    type: Date,
    default: null,
  },
  password: {
    type: String,
    required: true,
  },
  // Feature 1: saved delivery address — auto-filled on next order
  defaultAddress: {
    type: String,
    default: '',
    trim: true,
  },
  selectedVoice: {
    type: String,
    default: "Google UK English Female"
  },
  voicePreferences: {
    ttsEnabled: { type: Boolean, default: true },
    sttEnabled: { type: Boolean, default: true }
  },
  addresses: [{
    label: { type: String, required: true },
    address: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
  }],
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);
