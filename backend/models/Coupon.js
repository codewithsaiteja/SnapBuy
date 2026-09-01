const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  discountType: {
    type: String,
    enum: ['PERCENTAGE', 'FLAT'],
    required: true,
    default: 'PERCENTAGE',
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrderAmount: {
    type: Number,
    default: 0,
  },
  maxDiscount: {
    type: Number,
    default: Infinity, // no cap by default
  },
  expiresAt: {
    type: Date,
    default: null, // null = never expires
  },
  usageLimit: {
    type: Number,
    default: null, // null = unlimited
  },
  perUserLimit: {
    type: Number,
    default: 1, // 1 = each user can use once
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  // Track which users have used this coupon
  usedBy: [{
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt:  { type: Date, default: Date.now },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

CouponSchema.index({ code: 1 });

/**
 * Validate a coupon for a given user and cart subtotal.
 * Returns { valid: true, discountAmount } or { valid: false, reason }
 */
CouponSchema.methods.check = function (userId, subtotal) {
  if (!this.isActive) return { valid: false, reason: 'This coupon is no longer active.' };

  if (this.expiresAt && new Date() > this.expiresAt) {
    return { valid: false, reason: 'This coupon has expired.' };
  }

  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, reason: 'This coupon\'s usage limit has been reached.' };
  }

  if (this.perUserLimit !== null) {
    const userUses = this.usedBy.filter(u => u.userId.toString() === userId.toString()).length;
    if (userUses >= this.perUserLimit) {
      return { valid: false, reason: 'You have already used this coupon.' };
    }
  }

  if (subtotal < this.minOrderAmount) {
    return {
      valid: false,
      reason: `Minimum order amount of ₹${this.minOrderAmount.toLocaleString('en-IN')} required for this coupon.`,
    };
  }

  // Calculate discount
  let discountAmount = 0;
  if (this.discountType === 'PERCENTAGE') {
    discountAmount = Math.round((subtotal * this.discountValue) / 100);
  } else {
    discountAmount = this.discountValue;
  }

  // Apply max discount cap
  const effectiveMax = this.maxDiscount === Infinity ? discountAmount : this.maxDiscount;
  discountAmount = Math.min(discountAmount, effectiveMax);
  discountAmount = Math.max(0, discountAmount);

  return { valid: true, discountAmount };
};

module.exports = mongoose.model('Coupon', CouponSchema);
