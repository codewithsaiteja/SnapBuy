import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './OrderSummaryCard.css';

/**
 * OrderSummaryCard v2
 *
 * Props:
 *   orderData  { orderId, razorpayOrderId, items[], totalAmount, subtotalAmount,
 *                discountAmount, couponCode, deliveryCharge, address, isEdit }
 *   onPay      (razorpayOrderId, totalAmount, orderId) => void
 *   onCartUpdate (newCart) => void   — called when item qty/coupon changes
 *   processing boolean
 */
export default function OrderSummaryCard({ orderData, onPay, onCartUpdate, processing = false }) {
  const {
    orderId          = '',
    razorpayOrderId  = '',
    items            = [],
    totalAmount      = 0,
    subtotalAmount   = totalAmount,
    discountAmount   = 0,
    couponCode       = '',
    deliveryCharge   = 0,
    address          = '',
    isEdit           = false,
  } = orderData || {};

  const [couponInput,  setCouponInput]  = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // {type:'success'|'error', msg, code, discount}
  const [couponLoading, setCouponLoading] = useState(false);
  const [editLoading,  setEditLoading]  = useState(null);  // productName being edited

  // ── Coupon apply ────────────────────────────────────────────────────────────
  const handleApplyCoupon = useCallback(async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponStatus(null);
    try {
      const { data } = await axios.post('/api/coupon/apply', { couponCode: code });
      if (data.success) {
        setCouponStatus({
          type:     'success',
          msg:      data.message,
          code:     data.couponCode,
          discount: data.discountAmount,
        });
        setCouponInput('');
        if (data.cart && onCartUpdate) onCartUpdate(data.cart);
      } else {
        setCouponStatus({ type: 'error', msg: data.error });
      }
    } catch (err) {
      setCouponStatus({ type: 'error', msg: err.response?.data?.error || 'Could not apply coupon. Try again.' });
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput, onCartUpdate]);

  // ── Coupon remove ───────────────────────────────────────────────────────────
  const handleRemoveCoupon = useCallback(async () => {
    setCouponStatus(null);
    try {
      const { data } = await axios.delete('/api/coupon/remove');
      if (data.success && data.cart && onCartUpdate) onCartUpdate(data.cart);
    } catch { /* non-fatal */ }
  }, [onCartUpdate]);

  // ── Item quantity change ─────────────────────────────────────────────────────
  const handleQtyChange = useCallback(async (productName, newQty) => {
    if (editLoading) return;
    setEditLoading(productName);
    try {
      const { data } = await axios.post('/api/cart/update', { productName, qty: newQty });
      if (data.success !== false && data.cart !== undefined && onCartUpdate) {
        onCartUpdate(data.cart);
      }
    } catch { /* non-fatal */ }
    finally { setEditLoading(null); }
  }, [editLoading, onCartUpdate]);

  // ── Item remove ─────────────────────────────────────────────────────────────
  const handleRemoveItem = useCallback(async (productName) => {
    if (editLoading) return;
    setEditLoading(productName);
    try {
      const { data } = await axios.post('/api/cart/update', { productName, qty: 0 });
      if (onCartUpdate) onCartUpdate(data.cart ?? null);
    } catch { /* non-fatal */ }
    finally { setEditLoading(null); }
  }, [editLoading, onCartUpdate]);

  const effectiveCoupon    = couponStatus?.type === 'success' ? couponStatus.code   : couponCode;
  const effectiveDiscount  = couponStatus?.type === 'success' ? couponStatus.discount : discountAmount;
  const effectiveSubtotal  = subtotalAmount || totalAmount;
  const effectiveTotal     = Math.max(0, effectiveSubtotal - effectiveDiscount + deliveryCharge);
  const formattedTotal     = effectiveTotal.toLocaleString('en-IN');

  return (
    <div className="osc-card" role="region" aria-label="Order summary">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="osc-header">
        <svg className="osc-header-check" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="10" fill="#16a34a"/>
          <polyline points="5.5,10.5 8.5,13.5 14.5,7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="osc-header-title">
          {isEdit ? 'Order Updated' : 'Your Order'}
        </span>
      </div>

      {/* ── Items with edit controls ─────────────────────────────────── */}
      <div className="osc-items">
        {items.length === 0 ? (
          <div className="osc-empty">
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="#cbd5e1" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p>Your cart is empty</p>
          </div>
        ) : (
          items.map((item, i) => {
            const isEditing = editLoading === item.name;
            return (
              <div key={i} className="osc-item-row">
                {/* Left: name */}
                <div className="osc-item-left">
                  <span className="osc-item-name">{item.name}</span>
                  <span className="osc-item-unit-price">₹{item.price.toLocaleString('en-IN')} each</span>
                </div>

                {/* Middle: qty controls */}
                <div className="osc-item-qty-ctrl" aria-label={`Quantity for ${item.name}`}>
                  <button
                    className="osc-qty-btn"
                    onClick={() => item.qty > 1 ? handleQtyChange(item.name, item.qty - 1) : handleRemoveItem(item.name)}
                    disabled={isEditing || processing}
                    aria-label="Decrease quantity"
                  >
                    {item.qty === 1
                      ? <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                      : <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    }
                  </button>
                  <span className="osc-qty-value">{isEditing ? '…' : item.qty}</span>
                  <button
                    className="osc-qty-btn osc-qty-btn--add"
                    onClick={() => handleQtyChange(item.name, item.qty + 1)}
                    disabled={isEditing || processing}
                    aria-label="Increase quantity"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>

                {/* Right: subtotal */}
                <span className="osc-item-price">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Coupon input ──────────────────────────────────────────────── */}
      <div className="osc-coupon-section">
        {/* Active coupon badge */}
        {effectiveCoupon ? (
          <div className="osc-coupon-applied">
            <div className="osc-coupon-applied__left">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#16a34a" strokeWidth="2" fill="none" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="osc-coupon-applied__code">{effectiveCoupon}</span>
              <span className="osc-coupon-applied__msg">applied — saving ₹{effectiveDiscount.toLocaleString('en-IN')}</span>
            </div>
            <button className="osc-coupon-remove" onClick={handleRemoveCoupon} aria-label="Remove coupon">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ) : (
          <div className="osc-coupon-row">
            <input
              className="osc-coupon-input"
              type="text"
              placeholder="Have a coupon code?"
              value={couponInput}
              onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponStatus(null); }}
              onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
              disabled={couponLoading || processing}
              aria-label="Coupon code"
              maxLength={20}
            />
            <button
              className="osc-coupon-apply-btn"
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponInput.trim() || processing}
              aria-label="Apply coupon"
            >
              {couponLoading ? <span className="osc-spin" aria-hidden="true"/> : 'Apply'}
            </button>
          </div>
        )}

        {/* Coupon error */}
        {couponStatus?.type === 'error' && (
          <div className="osc-coupon-error" role="alert">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {couponStatus.msg}
          </div>
        )}
      </div>

      {/* ── Price breakdown ───────────────────────────────────────────── */}
      <div className="osc-breakdown">
        <div className="osc-breakdown__divider"/>

        <div className="osc-breakdown__row">
          <span>Subtotal</span>
          <span>₹{effectiveSubtotal.toLocaleString('en-IN')}</span>
        </div>

        {effectiveDiscount > 0 && (
          <div className="osc-breakdown__row osc-breakdown__row--discount">
            <span>
              Discount
              {effectiveCoupon && <span className="osc-breakdown__coupon-tag">{effectiveCoupon}</span>}
            </span>
            <span>−₹{effectiveDiscount.toLocaleString('en-IN')}</span>
          </div>
        )}

        <div className="osc-breakdown__row">
          <span>Delivery</span>
          <span>{deliveryCharge > 0 ? `₹${deliveryCharge.toLocaleString('en-IN')}` : 'Free'}</span>
        </div>

        <div className="osc-breakdown__divider"/>

        <div className="osc-breakdown__row osc-breakdown__row--total">
          <span>Total</span>
          <span>₹{formattedTotal}</span>
        </div>
      </div>

      {/* ── Address ───────────────────────────────────────────────────── */}
      {address && address !== 'Address Pending' && (
        <div className="osc-address">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="osc-address-icon" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="osc-address-text">{address}</span>
        </div>
      )}

      {/* ── Pay button ────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="osc-pay-wrap">
          <button
            className="osc-pay-btn"
            onClick={() => onPay(razorpayOrderId, effectiveTotal, orderId)}
            disabled={processing}
            aria-label={`Pay ₹${formattedTotal} now`}
          >
            {processing ? (
              <><span className="osc-pay-spinner" aria-hidden="true"/>Processing…</>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Pay ₹{formattedTotal}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
