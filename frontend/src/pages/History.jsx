import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './History.css';

// ── Human-readable status config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  CART:            { label: 'In Cart',        cls: 'badge-cart'    },
  PENDING:         { label: 'Pending',        cls: 'badge-pending' },
  ORDER_CREATED:   { label: 'Awaiting Payment', cls: 'badge-pending' },
  PAID:            { label: 'Paid',           cls: 'badge-paid'    },
  FAILED:          { label: 'Payment Failed', cls: 'badge-failed'  },
  RETRY_GENERATED: { label: 'Retrying',       cls: 'badge-pending' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'badge-info' };
  return <span className={`hist-badge ${cfg.cls}`}>{cfg.label}</span>;
}

// ── Order detail modal ────────────────────────────────────────────────────────
function OrderModal({ order, onClose }) {
  if (!order) return null;

  const date = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Order details">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Order Details</div>
            <div className="modal-subtitle">#{order._id.slice(-10).toUpperCase()}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Status + date */}
        <div className="modal-meta-row">
          <StatusBadge status={order.status} />
          <span className="modal-date">{date}</span>
        </div>

        {/* Items */}
        <div className="modal-section-label">Items</div>
        <div className="modal-items">
          {order.items.map((item, i) => (
            <div key={i} className="modal-item-row">
              <div className="modal-item-info">
                <span className="modal-item-name">{item.name}</span>
                <span className="modal-item-qty">× {item.qty}</span>
              </div>
              <span className="modal-item-price">
                ₹{(item.price * item.qty).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
          <div className="modal-total-row">
            <span>Total</span>
            <span className="modal-total-amount">₹{order.totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Delivery address */}
        {order.address && order.address !== 'Address Pending' && (
          <div className="modal-detail-row">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="#64748b" strokeWidth="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{order.address}</span>
          </div>
        )}

        {/* Payment ID */}
        {order.razorpayPaymentId && (
          <div className="modal-detail-row modal-detail-mono">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="#64748b" strokeWidth="2" fill="none"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <span>{order.razorpayPaymentId}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main History component ─────────────────────────────────────────────────────
export default function History() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/orders/me')
      .then(r => setOrders(r.data.orders || []))
      .catch(() => setError('Could not load order history. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = orders
    .filter(o => o.status === 'PAID')
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="hist-container">

      {/* Header */}
      <div className="hist-header">
        <button className="hist-back" onClick={() => navigate('/chat')}>
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Chat
        </button>
        <h1 className="hist-title">Order History</h1>
      </div>

      {/* Stats strip */}
      {!loading && !error && orders.length > 0 && (
        <div className="hist-stats">
          <div className="hist-stat">
            <span className="hist-stat__value">{orders.length}</span>
            <span className="hist-stat__label">Total Orders</span>
          </div>
          <div className="hist-stat-divider" />
          <div className="hist-stat">
            <span className="hist-stat__value">{orders.filter(o => o.status === 'PAID').length}</span>
            <span className="hist-stat__label">Completed</span>
          </div>
          <div className="hist-stat-divider" />
          <div className="hist-stat">
            <span className="hist-stat__value">₹{totalSpent.toLocaleString('en-IN')}</span>
            <span className="hist-stat__label">Total Spent</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="hist-content">
        {loading ? (
          <div className="hist-state">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#94a3b8" strokeWidth="2" fill="none" className="spin-icon"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
            <span>Loading orders…</span>
          </div>
        ) : error ? (
          <div className="hist-state hist-state--error">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{error}</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="hist-state">
            <svg viewBox="0 0 24 24" width="44" height="44" stroke="#cbd5e1" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="hist-empty-title">No orders yet</span>
            <span className="hist-empty-sub">Place your first order from the chat.</span>
            <button className="hist-cta" onClick={() => navigate('/chat')}>Start Shopping</button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hist-table-wrap">
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order._id} className="hist-row" onClick={() => setSelected(order)}>
                      <td className="hist-id">#{order._id.slice(-8).toUpperCase()}</td>
                      <td className="hist-date">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="hist-items">
                        {order.items.slice(0, 2).map((item, i) => (
                          <div key={i} className="hist-item-chip">{item.qty}× {item.name}</div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="hist-item-more">+{order.items.length - 2} more</div>
                        )}
                      </td>
                      <td className="hist-amount">₹{order.totalAmount.toLocaleString('en-IN')}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>
                        <button className="hist-detail-btn" onClick={e => { e.stopPropagation(); setSelected(order); }} aria-label="View order details">
                          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="hist-cards">
              {orders.map(order => (
                <div key={order._id} className="hist-card" onClick={() => setSelected(order)}>
                  <div className="hist-card__top">
                    <span className="hist-card__id">#{order._id.slice(-8).toUpperCase()}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="hist-card__items">
                    {order.items.map((item, i) => (
                      <span key={i} className="hist-item-chip">{item.qty}× {item.name}</span>
                    ))}
                  </div>
                  <div className="hist-card__bottom">
                    <span className="hist-card__date">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="hist-card__amount">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Order detail modal */}
      {selected && <OrderModal order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
