import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

// ─── Voice Selector ───────────────────────────────────────────────────────────
function VoiceSelector({ selectedVoice, onSelect }) {
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const update = () => {
      if (window.speechSynthesis) {
        const v = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
        setVoices(v);
      }
    };
    update();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = update;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  return (
    <select
      className="pf-select"
      value={selectedVoice}
      onChange={e => onSelect(e.target.value)}
      aria-label="Select AI voice"
    >
      {voices.length > 0 ? (
        voices.map(v => (
          <option key={v.name} value={v.name}>{v.name} — {v.lang}</option>
        ))
      ) : (
        <option value={selectedVoice}>{selectedVoice || 'System Default'}</option>
      )}
    </select>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, id, label, description }) {
  return (
    <label htmlFor={id} className="pf-toggle-row">
      <div className="pf-toggle-info">
        <span className="pf-toggle-label">{label}</span>
        {description && <span className="pf-toggle-desc">{description}</span>}
      </div>
      <div className="pf-toggle-wrap">
        <input
          id={id}
          type="checkbox"
          className="pf-toggle-input"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="pf-toggle-track" aria-hidden="true">
          <span className="pf-toggle-thumb" />
        </span>
      </div>
    </label>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, icon }) {
  return (
    <div className="pf-stat">
      <div className="pf-stat__icon" aria-hidden="true">{icon}</div>
      <div className="pf-stat__value">{value}</div>
      <div className="pf-stat__label">{label}</div>
    </div>
  );
}

// ─── Main Profile ─────────────────────────────────────────────────────────────
export default function Profile() {
  const [tab,          setTab]          = useState('overview');
  const [user,         setUser]         = useState(null);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState(null); // {type:'success'|'error', text}

  // Voice
  const [voicePrefs, setVoicePrefs] = useState({ ttsEnabled: true, sttEnabled: true });
  const [selectedVoice, setSelectedVoice] = useState('Google UK English Female');

  // Address
  const [addresses,    setAddresses]    = useState([]);
  const [newAddr,      setNewAddr]      = useState({ label: '', address: '', isDefault: false });
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [addrSaving,   setAddrSaving]   = useState(false);

  // Security
  const [passData, setPassData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });
  const [passMsg,  setPassMsg]  = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const authHeader = useCallback(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const flash = (setFn, type, text, ms = 3500) => {
    setFn({ type, text });
    setTimeout(() => setFn(null), ms);
  };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    axios.get('/api/user/profile', authHeader())
      .then(({ data }) => {
        setUser(data.user);
        setStats(data.stats);
        const prefs = data.user.voicePreferences || { ttsEnabled: true, sttEnabled: true };
        setVoicePrefs(prefs);
        localStorage.setItem('voicePrefs', JSON.stringify(prefs));
        if (data.user.selectedVoice) {
          setSelectedVoice(data.user.selectedVoice);
          localStorage.setItem('selectedVoice', data.user.selectedVoice);
        }
        setAddresses(data.user.addresses || []);
      })
      .catch(err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [token, navigate, authHeader]);

  const handleVoiceToggle = async (key, val) => {
    const updated = { ...voicePrefs, [key]: val };
    setVoicePrefs(updated);
    localStorage.setItem('voicePrefs', JSON.stringify(updated));
    try {
      await axios.put('/api/user/voice-settings', updated, authHeader());
    } catch { /* silent */ }
  };

  const handleVoiceSelect = async (vName) => {
    setSelectedVoice(vName);
    localStorage.setItem('selectedVoice', vName);
    setUser(prev => ({ ...prev, selectedVoice: vName }));
    try {
      await axios.put('/api/user/voice-settings', { selectedVoice: vName }, authHeader());
      flash(setSaveMsg, 'success', 'Voice preference saved.');
    } catch {
      flash(setSaveMsg, 'error', 'Could not save voice preference.');
    }
  };

  const handleUpdateAddress = async (e) => {
    e.preventDefault();
    setAddrSaving(true);
    try {
      const { data } = await axios.post('/api/user/addresses', newAddr, authHeader());
      setAddresses(data.addresses);
      setShowAddForm(false);
      setNewAddr({ label: '', address: '', isDefault: false });
      flash(setSaveMsg, 'success', 'Address saved.');
    } catch {
      flash(setSaveMsg, 'error', 'Failed to save address.');
    } finally {
      setAddrSaving(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const { data } = await axios.put(`/api/user/addresses/${id}/default`, {}, authHeader());
      setAddresses(data.addresses);
      if (data.defaultAddress) setUser(u => ({ ...u, defaultAddress: data.defaultAddress }));
      flash(setSaveMsg, 'success', 'Default address updated.');
    } catch {
      flash(setSaveMsg, 'error', 'Failed to update default address.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      flash(setPassMsg, 'error', 'Passwords do not match.');
      return;
    }
    if (passData.newPassword.length < 6) {
      flash(setPassMsg, 'error', 'Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await axios.put('/api/user/change-password', passData, authHeader());
      flash(setPassMsg, 'success', 'Password updated successfully.');
      setPassData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      flash(setPassMsg, 'error', err.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="pf-loading">
        <div className="pf-loading__spinner" aria-label="Loading profile" />
        <span>Loading your profile…</span>
      </div>
    );
  }

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'security',  label: 'Security' },
    { id: 'voice',     label: 'Voice' },
  ];

  return (
    <div className="pf-shell">
      {/* Flash message */}
      {saveMsg && (
        <div className={`pf-flash pf-flash--${saveMsg.type}`} role="alert">
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
            {saveMsg.type === 'success'
              ? <polyline points="20 6 9 17 4 12"/>
              : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
            }
          </svg>
          {saveMsg.text}
        </div>
      )}

      {/* Header */}
      <header className="pf-header">
        <button className="pf-back" onClick={() => navigate('/chat')} aria-label="Back to chat">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Chat
        </button>
        <div className="pf-header__brand">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span>SnapBuy</span>
        </div>
        <button className="pf-signout" onClick={handleLogout}>Sign Out</button>
      </header>

      <main className="pf-main">
        {/* Profile hero */}
        <div className="pf-hero">
          <div className="pf-avatar" aria-label="Profile avatar">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="pf-hero__info">
            <h1 className="pf-hero__name">{user?.name}</h1>
            <p className="pf-hero__email">{user?.email}</p>
            {user?.memberSince && (
              <p className="pf-hero__since">
                Member since {new Date(user.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="pf-stats">
          <StatCard
            value={stats?.totalOrders ?? 0}
            label="Total Orders"
            icon={<svg viewBox="0 0 24 24" width="18" height="18" stroke="#2563eb" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
          />
          <StatCard
            value={`₹${(stats?.totalSpent ?? 0).toLocaleString('en-IN')}`}
            label="Total Spent"
            icon={<svg viewBox="0 0 24 24" width="18" height="18" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
          />
          <StatCard
            value={stats?.paidCount ?? 0}
            label="Completed"
            icon={<svg viewBox="0 0 24 24" width="18" height="18" stroke="#2563eb" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          />
        </div>

        {/* Tabs */}
        <div className="pf-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`pf-tab${tab === t.id ? ' pf-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pf-panel" role="tabpanel">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="pf-section anim-fade-in">
              <h2 className="pf-section__title">Account Overview</h2>
              <div className="pf-info-grid">
                <div className="pf-info-row">
                  <span className="pf-info-label">Full Name</span>
                  <span className="pf-info-value">{user?.name}</span>
                </div>
                <div className="pf-info-row">
                  <span className="pf-info-label">Email</span>
                  <span className="pf-info-value">{user?.email}</span>
                </div>
                <div className="pf-info-row">
                  <span className="pf-info-label">Default Address</span>
                  <span className="pf-info-value">{user?.defaultAddress || <em style={{color:'#94a3b8'}}>Not set</em>}</span>
                </div>
                <div className="pf-info-row">
                  <span className="pf-info-label">Active Coupons</span>
                  <span className="pf-info-value pf-coupon-hint">
                    Try <code>WELCOME10</code>, <code>STUDENT15</code>, or <code>TECH20</code> in chat
                  </span>
                </div>
              </div>
              <button className="pf-btn-primary pf-mt" onClick={() => navigate('/history')}>
                View Order History
              </button>
            </div>
          )}

          {/* ADDRESSES */}
          {tab === 'addresses' && (
            <div className="pf-section anim-fade-in">
              <div className="pf-section__head">
                <h2 className="pf-section__title">Saved Addresses</h2>
                <button
                  className="pf-btn-outline"
                  onClick={() => setShowAddForm(s => !s)}
                >
                  {showAddForm ? 'Cancel' : '+ Add Address'}
                </button>
              </div>

              {showAddForm && (
                <form className="pf-addr-form" onSubmit={handleUpdateAddress}>
                  <div className="pf-field">
                    <label className="pf-label">Label (e.g. Home, Office)</label>
                    <input
                      className="pf-input"
                      required
                      placeholder="Home"
                      value={newAddr.label}
                      onChange={e => setNewAddr(a => ({ ...a, label: e.target.value }))}
                    />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Full Address</label>
                    <textarea
                      className="pf-input pf-textarea"
                      required
                      rows={3}
                      placeholder="12 MG Road, Bangalore 560001…"
                      value={newAddr.address}
                      onChange={e => setNewAddr(a => ({ ...a, address: e.target.value }))}
                    />
                  </div>
                  <label className="pf-checkbox-row">
                    <input
                      type="checkbox"
                      checked={newAddr.isDefault}
                      onChange={e => setNewAddr(a => ({ ...a, isDefault: e.target.checked }))}
                    />
                    <span>Set as default address</span>
                  </label>
                  <button type="submit" className="pf-btn-primary" disabled={addrSaving}>
                    {addrSaving ? 'Saving…' : 'Save Address'}
                  </button>
                </form>
              )}

              <div className="pf-addr-list">
                {addresses.length === 0 && (
                  <p className="pf-empty">No saved addresses yet. Add one above.</p>
                )}
                {addresses.map(a => (
                  <div key={a._id} className={`pf-addr-card${a.isDefault ? ' pf-addr-card--default' : ''}`}>
                    <div className="pf-addr-card__left">
                      <div className="pf-addr-card__label">
                        {a.label}
                        {a.isDefault && <span className="pf-badge-default">Default</span>}
                      </div>
                      <div className="pf-addr-card__text">{a.address}</div>
                    </div>
                    {!a.isDefault && (
                      <button className="pf-btn-ghost" onClick={() => handleSetDefault(a._id)}>
                        Set Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY */}
          {tab === 'security' && (
            <div className="pf-section anim-fade-in">
              <h2 className="pf-section__title">Change Password</h2>
              <p className="pf-section__sub">Update your password regularly to keep your account secure.</p>

              {passMsg && (
                <div className={`pf-inline-msg pf-inline-msg--${passMsg.type}`} role="alert">
                  {passMsg.text}
                </div>
              )}

              <form className="pf-pass-form" onSubmit={handleChangePassword}>
                {[
                  { key: 'oldPassword',     label: 'Current Password',     vis: 'old' },
                  { key: 'newPassword',     label: 'New Password',         vis: 'new' },
                  { key: 'confirmPassword', label: 'Confirm New Password', vis: 'confirm' },
                ].map(({ key, label, vis }) => (
                  <div key={key} className="pf-field">
                    <label className="pf-label">{label}</label>
                    <div className="pf-pass-wrap">
                      <input
                        className="pf-input"
                        type={showPasswords[vis] ? 'text' : 'password'}
                        required
                        value={passData[key]}
                        onChange={e => setPassData(p => ({ ...p, [key]: e.target.value }))}
                        autoComplete={key === 'oldPassword' ? 'current-password' : 'new-password'}
                      />
                      <button
                        type="button"
                        className="pf-eye"
                        onClick={() => setShowPasswords(s => ({ ...s, [vis]: !s[vis] }))}
                        aria-label={showPasswords[vis] ? 'Hide password' : 'Show password'}
                      >
                        {showPasswords[vis] ? (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                <button type="submit" className="pf-btn-primary" disabled={saving}>
                  {saving ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {/* VOICE SETTINGS */}
          {tab === 'voice' && (
            <div className="pf-section anim-fade-in">
              <h2 className="pf-section__title">Voice & Speech</h2>
              <p className="pf-section__sub">Control how SnapBuy listens and speaks to you.</p>

              {saveMsg?.type === 'success' && tab === 'voice' && (
                <div className="pf-inline-msg pf-inline-msg--success" role="alert">{saveMsg.text}</div>
              )}

              <div className="pf-voice-options">
                <Toggle
                  id="stt-toggle"
                  label="Voice Input (Speech-to-Text)"
                  description="Tap the microphone to dictate your messages."
                  checked={voicePrefs.sttEnabled}
                  onChange={val => handleVoiceToggle('sttEnabled', val)}
                />
                <Toggle
                  id="tts-toggle"
                  label="Voice Replies (Text-to-Speech)"
                  description="AI responses will be read aloud automatically."
                  checked={voicePrefs.ttsEnabled}
                  onChange={val => handleVoiceToggle('ttsEnabled', val)}
                />
              </div>

              <div className="pf-voice-selector">
                <label className="pf-label">Preferred AI Voice</label>
                <p className="pf-voice-selector__hint">
                  Select from the English voices available on your device.
                </p>
                <VoiceSelector
                  selectedVoice={selectedVoice}
                  onSelect={handleVoiceSelect}
                />
                <button
                  type="button"
                  className="pf-btn-outline pf-mt-sm"
                  onClick={() => {
                    if (!window.speechSynthesis) return;
                    const u = new SpeechSynthesisUtterance('Hi there! This is your selected voice from SnapBuy.');
                    const voices = window.speechSynthesis.getVoices();
                    const found = voices.find(v => v.name === selectedVoice);
                    if (found) u.voice = found;
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(u);
                  }}
                >
                  Preview Voice
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
