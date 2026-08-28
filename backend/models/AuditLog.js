const mongoose = require('mongoose');

// Enriched audit trail — records every significant system event
const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  action: {
    type: String,
    required: true,
    // Allowed actions:
    // CHAT_INPUT, CHAT_OUTPUT, INTENT_PARSED, PRODUCT_MATCHED,
    // ADDRESS_USED, ADDRESS_SAVED, ORDER_CREATED, ORDER_EDITED,
    // PAYMENT_INITIATED, PAYMENT_CAPTURED, PAYMENT_FAILED,
    // PAYMENT_RETRY, ORDER_COMPLETED, RECOVERY_SUGGESTED
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'INFO'],
    default: 'INFO',
  },
  input: {
    type: String,
    default: '',
  },
  output: {
    type: String,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for fast user-specific queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
