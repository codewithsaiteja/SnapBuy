const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [{
    name:  { type: String, required: true },
    qty:   { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  }],
  // Financial breakdown — always server-calculated, never trusted from client
  subtotalAmount: {
    type: Number,
    default: 0,
  },
  couponCode: {
    type: String,
    default: '',
    uppercase: true,
    trim: true,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  deliveryCharge: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    default: 'Address Pending',
    trim: true,
  },
  razorpayOrderId: {
    type: String,
    default: '',
  },
  razorpayPaymentId: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['CART', 'PENDING', 'ORDER_CREATED', 'PAID', 'FAILED', 'RETRY_GENERATED'],
    default: 'PENDING',
  },
  retryCount: {
    type: Number,
    default: 0,
    max: 3,
  },
  aiLogic: {
    parsedItems:      { type: mongoose.Schema.Types.Mixed, default: null },
    addressSource:    { type: String, default: '' },
    confidence:       { type: Number, default: 0 },
    recommendedAction:{ type: String, default: '' },
  },
  trackingStatus: {
    type: String,
    enum: ['PLACED', 'PACKAGING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  },
  trackingUpdates: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    description: String
  }],
  deliveryPartner: { type: String, default: 'Suresh' },
  deliveryPhone: { type: String, default: '+91 98765 43210' },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ razorpayOrderId: 1 });

/**
 * Recalculate subtotal, discountAmount (if coupon provided), and totalAmount.
 * Call this whenever items or coupon changes.
 * Returns discountAmount so callers can report it.
 */
OrderSchema.methods.recalculate = function (discountAmount = 0) {
  this.subtotalAmount = this.items.reduce((s, i) => s + i.price * i.qty, 0);
  this.discountAmount = Math.min(Math.max(0, discountAmount), this.subtotalAmount);
  this.totalAmount    = Math.max(0, this.subtotalAmount - this.discountAmount + (this.deliveryCharge || 0));
  this.updatedAt      = new Date();
};

module.exports = mongoose.model('Order', OrderSchema);
