import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

/* ── SVG SnapBuy Brand Logo ─────────────────────────────────────────────────── */
const SnapBuyLogo = () => (
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="url(#snapbuy_grad)" />
    {/* Geometric bag/cart mark with sleek 'S' visual */}
    <path d="M12 15L15 28C15.2 28.8 15.9 29.5 16.8 29.5H27.2C28.1 29.5 28.8 28.8 29 28L32 15H12Z" stroke="white" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M16 15V12C16 9.8 17.8 8 20 8C22.2 8 24 9.8 24 12V15" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M17 21C17 21 19 19 22 21C25 23 23 25.5 21 25.5C19 25.5 17 24 17 24" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="snapbuy_grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563EB" />
        <stop offset="1" stopColor="#1E40AF" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── SVG Action Icons ──────────────────────────────────────────────────────── */
const IconCart = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor"
       strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const IconOrders = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor"
       strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const IconSignOut = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor"
       strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ── Navbar Component ───────────────────────────────────────────────────────── */
export default function Navbar({ cart, onCartClick }) {
  const [dropOpen, setDropOpen] = useState(false);
  const avatarRef = useRef(null);
  const navigate  = useNavigate();

  const user         = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const avatarLetter = (user.name || user.email || 'U')[0].toUpperCase();
  const cartCount    = cart?.items?.reduce((s, i) => s + i.qty, 0) || 0;

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* ── Brand Logo & Tagline ── */}
        <div
          className="navbar-brand-container"
          onClick={() => navigate('/chat')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}
        >
          <SnapBuyLogo />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="navbar-logo">SnapBuy</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '-2px', fontWeight: '500', letterSpacing: '-0.01em' }}>
              Everything you need.
            </span>
          </div>
        </div>

        {/* ── Right Action Controls ── */}
        <div className="navbar-right">

          {/* Cart button */}
          <button
            className="navbar-cart-btn"
            onClick={onCartClick ? onCartClick : () => navigate('/chat')}
            aria-label="View cart"
          >
            <IconCart />
            {cartCount > 0 && (
              <span className="navbar-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </button>

          {/* Avatar + dropdown */}
          <div className="navbar-avatar-wrap" ref={avatarRef}>
            <button
              className="navbar-avatar"
              onClick={() => setDropOpen(v => !v)}
              aria-label="Account menu"
              aria-expanded={dropOpen}
            >
              {avatarLetter}
            </button>

            {dropOpen && (
              <div className="navbar-dropdown anim-fade-in">
                <div className="navbar-dropdown-user">
                  <div className="navbar-dropdown-name">{user.name || 'User'}</div>
                  <div className="navbar-dropdown-email">{user.email}</div>
                </div>
                <div className="navbar-dropdown-divider" />
                <button className="navbar-dropdown-item" onClick={() => { setDropOpen(false); navigate('/history'); }}>
                  <IconOrders /> Orders
                </button>
                <button className="navbar-dropdown-item" onClick={() => { setDropOpen(false); navigate('/profile'); }}>
                  Account &amp; Settings
                </button>
                <div className="navbar-dropdown-divider" />
                <button className="navbar-dropdown-item navbar-dropdown-item--danger" onClick={signOut}>
                  <IconSignOut /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
