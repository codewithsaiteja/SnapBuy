import React, { useState } from 'react';
import axios from 'axios';
import './CategoryChips.css';

const API = '/api';

const CATEGORIES = [
  { label: 'Groceries',      icon: '🛒', value: 'Groceries' },
  { label: 'Electronics',    icon: '💻', value: 'Electronics' },
  { label: 'Personal Care',  icon: '🧴', value: 'Personal Care' },
  { label: 'Home & Kitchen', icon: '🏠', value: 'Home & Kitchen' },
  { label: 'Snacks',         icon: '🍪', value: 'Snacks' },
];

/**
 * CategoryChips
 *
 * Props:
 *   onCategorySelect(categoryLabel, items[]) — called with top 4 products from that category
 */
export default function CategoryChips({ onCategorySelect, disabled }) {
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(null);

  const handleClick = async (cat) => {
    if (disabled || loading) return;
    setActive(cat.value);
    setLoading(cat.value);
    try {
      const { data } = await axios.get(`${API}/products/search`, {
        params: { q: cat.value, limit: 4, category: true },
      });
      const items = data.products || [];
      onCategorySelect(cat.label, items);
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
          <span className="category-chip__icon" aria-hidden="true">{cat.icon}</span>
          {loading === cat.value ? (
            <span className="category-chip__label">Loading…</span>
          ) : (
            <span className="category-chip__label">{cat.label}</span>
          )}
        </button>
      ))}
    </div>
  );
}
