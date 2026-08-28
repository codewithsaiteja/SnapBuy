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
  // Bounded retry tracking — max 3 retries allowed
  retryCount: {
    type: Number,
    default: 0,
    max: 3,
  },
  // AI explainability data — stored with each order
  aiLogic: {
    parsedItems:     { type: mongoose.Schema.Types.Mixed, default: null },
    addressSource:   { type: String, default: '' },  // 'message' | 'profile' | 'provided'
    confidence:      { type: Number, default: 0 },
    recommendedAction: { type: String, default: '' },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for fast user order lookups
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Order', OrderSchema);
