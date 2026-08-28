import React, { useRef } from 'react';
import './PaymentSuccess.css';

/**
 * PaymentSuccess — shown after /verify-payment returns success.
 * Displays order details + receipt download + start new order.
 *
 * Props:
 *   receipt         – { orderId, razorpayPaymentId, items, totalAmount, address, paidAt }
 *   onStartNewOrder – called when user wants to shop again
 */
export default function PaymentSuccess({ receipt, onStartNewOrder }) {
  const receiptRef = useRef(null);

  const {
    orderId          = '',
    razorpayPaymentId = '',
    items            = [],
    totalAmount      = 0,
    address          = '',
    paidAt           = new Date().toISOString(),
  } = receipt || {};

  const formattedDate = new Date(paidAt).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const handleDownload = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt – ${orderId.slice(-8).toUpperCase()}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
  .header { text-align: center; margin-bottom: 32px; }
  .header h1 { font-size: 1.8rem; color: #2563eb; }
  .header p  { color: #64748b; margin-top: 4px; }
  .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; margin-top: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th { text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
  .total-row td { font-weight: 700; font-size: 1rem; border-top: 2px solid #e2e8f0; border-bottom: none; }
  .meta { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-top: 20px; }
  .meta-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.88rem; }
  .meta-label { color: #64748b; }
  .footer { text-align: center; margin-top: 32px; font-size: 0.8rem; color: #94a3b8; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <h1>SnapBuy</h1>
  <p>Payment Receipt</p>
  <span class="badge">Payment Successful</span>
</div>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
  <tbody>
    ${items.map(i => `<tr>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>₹${i.price.toLocaleString('en-IN')}</td>
      <td>₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
    </tr>`).join('')}
    <tr class="total-row">
      <td colspan="3">Total Paid</td>
      <td>₹${totalAmount.toLocaleString('en-IN')}</td>
    </tr>
  </tbody>
</table>
<div class="meta">
  <div class="meta-row"><span class="meta-label">Order ID</span><span>${orderId}</span></div>
  <div class="meta-row"><span class="meta-label">Payment ID</span><span>${razorpayPaymentId}</span></div>
  <div class="meta-row"><span class="meta-label">Delivery Address</span><span>${address}</span></div>
  <div class="meta-row"><span class="meta-label">Date</span><span>${formattedDate}</span></div>
</div>
<div class="footer">Thank you for your order. This is a computer-generated receipt.</div>
</body>
</html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="ps-container">
      <div className="ps-card" ref={receiptRef}>
        {/* Success header */}
        <div className="ps-header">
          <div className="ps-check">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1>Payment Successful</h1>
          <p>Order #{orderId.slice(-8).toUpperCase()}</p>
        </div>

        {/* Order items */}
        <div className="ps-items">
          <div className="ps-section-label">Items Ordered</div>
          {items.map((item, i) => (
            <div key={i} className="ps-item-row">
              <span>{item.qty}× {item.name}</span>
              <span>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="ps-total-row">
            <span>Total Paid</span>
            <span>₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="ps-meta">
          <div className="ps-meta-row">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{address}</span>
          </div>
          <div className="ps-meta-row">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{formattedDate}</span>
          </div>
          {razorpayPaymentId && (
            <div className="ps-meta-row ps-meta-row--mono">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <span>Payment ID: {razorpayPaymentId}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="ps-actions">
          <button className="ps-btn ps-btn--secondary" onClick={handleDownload}>
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'6px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Receipt
          </button>
          <button className="ps-btn ps-btn--primary" onClick={onStartNewOrder}>
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'6px'}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Start New Order
          </button>
        </div>
      </div>
    </div>
  );
}
