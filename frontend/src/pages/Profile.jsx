import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';

export default function Profile() {
  const [data,         setData]        = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState('');
  const [newAddress,   setNewAddress]  = useState('');
  const [savingAddr,   setSavingAddr]  = useState(false);
  const [addrFeedback, setAddrFeedback]= useState(null); // { type, msg }

  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/user/profile')
      .then(r => {
        setData(r.data);
        setNewAddress(r.data.user?.defaultAddress || '');
      })
      .catch(err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        setError('Could not load profile. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSaveAddress = async () => {
    if (!newAddress.trim()) return;
    setSavingAddr(true);
    setAddrFeedback(null);
    try {
      await axios.patch('/api/user/address', { address: newAddress.trim() });
      setData(prev => ({ ...prev, user: { ...prev.user, defaultAddress: newAddress.trim() } }));
      setAddrFeedback({ type: 'success', msg: 'Address saved successfully.' });
    } catch {
      setAddrFeedback({ type: 'error', msg: 'Failed to save address. Please try again.' });
    } finally {
      setSavingAddr(false);
      setTimeout(() => setAddrFeedback(null), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const avatarLetter = data?.user?.name?.[0]?.toUpperCase() || '?';
  const memberSince  = data?.user?.memberSince
    ? new Date(data.user.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  if (loading) {
    return (
      <div className="profile-container">
        <button className="profile-back" onClick={() => navigate('/chat')}>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Chat
        </button>
        <div className="profile-loading">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="#94a3b8" strokeWidth="2" fill="none" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
          <span>Loading profile…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <button className="profile-back" onClick={() => navigate('/chat')}>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Chat
        </button>
        <div className="profile-error">
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      </div>
    );
  }

  const { user, stats } = data;

  return (
    <div className="profile-container">
      <button className="profile-back" onClick={() => navigate('/chat')}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Chat
      </button>

      <div className="profile-page-header">
        <div className="profile-page-brand">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span>SnapBuy</span>
        </div>
        <h1 className="profile-page-title">My Account</h1>
      </div>
      <div className="profile-card">
        {/* Identity */}
        <div className="profile-identity">
          <div className="profile-avatar">{avatarLetter}</div>
          <div className="profile-identity__info">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            {memberSince && <span className="profile-since">Member since {memberSince}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat__value">{stats.totalOrders}</div>
            <div className="profile-stat__label">Total Orders</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat__value">₹{stats.totalSpent.toLocaleString('en-IN')}</div>
            <div className="profile-stat__label">Total Spent</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat__value">{stats.pendingOrders}</div>
            <div className="profile-stat__label">Pending</div>
          </div>
        </div>

        {/* Default address */}
        <div className="profile-section">
          <h3>Default Delivery Address</h3>
          {user.defaultAddress ? (
            <div className="profile-address">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#2563eb" strokeWidth="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {user.defaultAddress}
            </div>
          ) : (
            <div className="profile-address profile-address--empty">No default address saved</div>
          )}
          <div className="profile-address-form">
            <input
              className="profile-address-input"
              type="text"
              placeholder="Enter new delivery address…"
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveAddress()}
            />
            <button
              className="profile-address-save"
              onClick={handleSaveAddress}
              disabled={savingAddr || !newAddress.trim()}
            >
              {savingAddr ? 'Saving…' : 'Save'}
            </button>
          </div>
          {addrFeedback && (
            <div className={`profile-toast profile-toast--${addrFeedback.type}`}>
              {addrFeedback.msg}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <button className="profile-action-btn profile-action-btn--outline" onClick={() => navigate('/history')}>
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            View Order History
          </button>
          <button className="profile-action-btn profile-action-btn--danger" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
