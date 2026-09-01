import React, { useState } from 'react';
import api from '../utils/api';
import './CategoryChips.css';

const API = '/api';

// SVG icons for each category — no emojis
const CATEGORY_ICONS = {
  Groceries: (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  Electronics: (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  'Personal Care': (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  'Home & Kitchen': (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Snacks: (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/>
      <line x1="10" y1="1" x2="10" y2="4"/>
      <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  Electrical: (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

const CATEGORIES = [
  { label: 'Groceries & Essentials', value: 'Groceries' },
  { label: 'Electronics & Gadgets',  value: 'Electronics' },
  { label: 'Personal Care',          value: 'Personal Care' },
  { label: 'Home & Kitchen',         value: 'Home & Kitchen' },
  { label: 'Electrical',             value: 'Electrical' },
];

/**
 * CategoryChips — browse products by category
 * Props:
 *   onCategorySelect(categoryLabel, items[]) — called with top products
 *   disabled — boolean
 */
export default function CategoryChips({ onCategorySelect, disabled }) {
  const [active,  setActive]  = useState(null);
  const [loading, setLoading] = useState(null);

  const handleClick = async (cat) => {
    if (disabled || loading) return;
    setActive(cat.value);
    setLoading(cat.value);
    try {
      const { data } = await api.get(`${API}/products/search`, {
        params: { q: cat.value, limit: 4, category: true },
      });
      onCategorySelect(cat.label, data.products || []);
    } catch {
      onCategorySelect(cat.label, []);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="category-chips" role="list" aria-label="Browse by category">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          role="listitem"
          className={`category-chip${active === cat.value ? ' category-chip--active' : ''}`}
          onClick={() => handleClick(cat)}
          disabled={disabled || loading === cat.value}
          aria-pressed={active === cat.value}
        >
          <span className="category-chip__icon">
            {loading === cat.value ? (
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" className="spin-icon" aria-hidden="true">
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
            ) : (
              CATEGORY_ICONS[cat.value] || null
            )}
          </span>
          <span className="category-chip__label">{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
