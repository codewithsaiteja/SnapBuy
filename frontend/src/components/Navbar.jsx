import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Navbar.css';

/* ── SVG icons — zero emojis ────────────────────────────────────────────── */
const IconCart = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor"
       strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor"
       strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
const IconProfile = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor"
       strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
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

/* ── Navbar ──────────────────────────────────────────────────────────────── */
export default function Navbar({ cart }) {
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const searchRef  = useRef(null);
  const avatarRef  = useRef(null);
  const debounceRef= useRef(null);
  const navigate   = useNavigate();
  const location   = useLocation();

  const user         = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const avatarLetter = (user.name || user.email || 'U')[0].toUpperCase();
  const cartCount    = cart?.items?.reduce((s, i) => s + i.qty, 0) || 0;

  /* Close search dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]);
        setQuery('');
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Debounced product search */
  const handleSearch = useCallback((val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await axios.get(`/api/products/search?q=${encodeURIComponent(val)}&limit=6`);
        setResults(data.products || []);
      } catch { setResults([]); }
      finally  { setSearching(false); }
    }, 280);
  }, []);

  const pickResult = (product) => {
    setQuery('');
    setResults([]);
    /* Navigate to dashboard and signal which product to add */
    navigate('/', { state: { addProduct: product.name } });
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* ── Logo ── */}
        <button className="navbar-logo" onClick={() => navigate('/')}>
          SnapBuy
        </button>

        {/* ── Search ── */}
        <div className="navbar-search" ref={searchRef}>
          <div className="nsearch-wrap">
            <span className="nsearch-icon"><IconSearch /></span>
            <input
              className="nsearch-input"
              type="search"
              placeholder="Search products..."
              value={query}
              onChange={e => handleSearch(e.target.value)}
              autoComplete="off"
            />
            {searching && <span className="nsearch-spinner"><span className="spinner spinner-sm" /></span>}
          </div>

          {/* Autocomplete dropdown */}
          {results.length > 0 && (
            <ul className="nsearch-dropdown">
              {results.map(p => (
                <li key={p.id} className="nsearch-item" onClick={() => pickResult(p)}>
                  <span className="nsearch-name">{p.name}</span>
                  <span className="nsearch-price">₹{p.price.toLocaleString('en-IN')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Right controls ── */}
        <div className="navbar-right">

          {/* Cart button */}
          <button
            className="navbar-cart-btn"
            onClick={() => navigate('/')}
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
                  <IconProfile /> Profile
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
