import React, { useEffect, useState } from 'react';
import './ProductGrid.css';

// SVG icons keyed by product name (lowercase)
const PRODUCT_ICONS = {
  coffee: (
    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  mouse: (
    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="7"/>
      <line x1="12" y1="6" x2="12" y2="10"/>
    </svg>
  ),
  'usb-c cable': (
    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h8v4H8z"/><line x1="12" y1="10" x2="12" y2="21"/>
      <path d="M9 21h6"/>
    </svg>
  ),
  notebook: (
    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  'desk lamp': (
    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6M8 8h8M12 8l-3 12M9 20h6"/>
      <circle cx="12" cy="5" r="1" fill="currentColor"/>
    </svg>
  ),
};

function getIcon(name) {
  const key = name.toLowerCase();
  for (const [k, icon] of Object.entries(PRODUCT_ICONS)) {
    if (key.includes(k) || k.includes(key)) return icon;
  }
  // Fallback
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
    </svg>
  );
}

export default function ProductGrid({ onBuy }) {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { if (d.products) setProducts(d.products); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="product-grid product-grid--loading">
        {[1,2,3,4,5].map(i => <div key={i} className="product-card product-card--skeleton"/>)}
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="product-grid">
      {products.map(p => (
        <button key={p._id} className="product-card" onClick={() => onBuy(p.name)}>
          <div className="product-card__icon" aria-hidden="true">
            {p.emoji || getIcon(p.name)}
          </div>
          <div className="product-card__name">{p.name}</div>
          <div className="product-card__price">₹{p.price.toLocaleString('en-IN')}</div>
          <div className="product-card__add">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </div>
        </button>
      ))}
    </div>
  );
}
