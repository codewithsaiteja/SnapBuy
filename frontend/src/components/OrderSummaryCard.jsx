import React from 'react';
import './OrderSummaryCard.css';

/**
 * OrderSummaryCard
 *
 * Screenshot spec:
 *   - White card, rounded corners, drop-shadow
 *   - Green "Order Ready to Pay" header
 *   - Item rows: "Desk Lamp × 1" left, "₹1,200" right (gray)
 *   - Thin gray divider
 *   - TOTAL row: "TOTAL" (uppercase, small) left, "₹1,200" (large, bold) right
 *   - Address badge: gray pill — "anantapur, 1 town"
 *   - Full-width blue pill button: "Pay Now — ₹1,200"
 *
 * Props:
 *   orderData  { orderId, razorpayOrderId, items[], totalAmount, address, isEdit }
 *   onPay      (razorpayOrderId, totalAmount, orderId) => void
 *   processing boolean — disables button while Razorpay is loading
 */
export default function OrderSummaryCard({ orderData, onPay, processing = false }) {
  const {
    orderId,
    razorpayOrderId,
    items        = [],
    totalAmount  = 0,
    address      = '',
    isEdit       = false,
  } = orderData || {};

  const formattedTotal = totalAmount.toLocaleString('en-IN');

  return (
    <div className="osc-card" role="region" aria-label="Order summary">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="osc-header">
        {/* Checkmark icon */}
        <svg
          className="osc-header-check"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="10" fill="#16a34a" />
          <polyline
            points="5.5,10.5 8.5,13.5 14.5,7.5"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="osc-header-title">
          {isEdit ? 'Order Updated' : 'Order Ready to Pay'}
        </span>
      </div>

      {/* ── Item rows ──────────────────────────────────────────────────── */}
      <div className="osc-items">
        {items.length === 0 ? (
          <p className="osc-empty">No items</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="osc-item-row">
              <span className="osc-item-name">
                {item.name}
                <span className="osc-item-qty"> × {item.qty}</span>
              </span>
              <span className="osc-item-price">
                ₹{(item.price * item.qty).toLocaleString('en-IN')}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="osc-divider" />

      {/* ── Total row ──────────────────────────────────────────────────── */}
      <div className="osc-total-row">
        <span className="osc-total-label">TOTAL</span>
        <span className="osc-total-amount">₹{formattedTotal}</span>
      </div>

      {/* ── Address badge ──────────────────────────────────────────────── */}
      {address && (
        <div className="osc-address">
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="osc-address-icon"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="osc-address-text">{address}</span>
        </div>
      )}

      {/* ── Pay Now button ─────────────────────────────────────────────── */}
      <div className="osc-pay-wrap">
        <button
          className="osc-pay-btn"
          onClick={() => onPay(razorpayOrderId, totalAmount, orderId)}
          disabled={processing || !razorpayOrderId}
          aria-label={`Pay ₹${formattedTotal} now`}
        >
          {processing ? (
            <>
              <span className="osc-pay-spinner" />
              Processing…
            </>
          ) : (
            <>
              {/* Lock icon */}
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Pay Now — ₹{formattedTotal}
            </>
          )}
        </button>
      </div>

    </div>
  );
}
