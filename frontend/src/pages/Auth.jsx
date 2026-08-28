import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

/* ── Password strength ──────────────────────────────────────────────────── */
function strengthOf(pw) {
  if (!pw) return { score: 0, label: '', pct: 0, color: '' };
  let s = 0;
  if (pw.length >= 8)            s++;
  if (/[A-Z]/.test(pw))          s++;
  if (/[a-z]/.test(pw))          s++;
  if (/[0-9]/.test(pw))          s++;
  if (/[^A-Za-z0-9]/.test(pw))   s++;
  const map = [
    null,
    { label: 'Weak',   pct: 20,  color: '#dc2626' },
    { label: 'Fair',   pct: 40,  color: '#d97706' },
    { label: 'Good',   pct: 70,  color: '#2563eb' },
    { label: 'Strong', pct: 85,  color: '#16a34a' },
    { label: 'Strong', pct: 100, color: '#16a34a' },
  ];
  return { score: s, ...(map[s] || map[1]) };
}

/* ── Eye SVG icon ───────────────────────────────────────────────────────── */
function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2"
         fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2"
         fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

/* ── Main Auth component ─────────────────────────────────────────────────── */
export default function Auth() {
  const [mode, setMode]           = useState('login'); // login | register | forgot
  const [form, setForm]           = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const navigate = useNavigate();

  const strength = useMemo(() => strengthOf(form.password), [form.password]);
  const isSubmitDisabled = loading || (mode === 'register' && strength.score < 3);

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        await axios.post('/api/auth/forgot-password', { email: form.email });
        setSuccess('Reset link logged to the server console. Check your backend terminal.');
        setLoading(false);
        return;
      }
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload  = mode === 'register'
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const { data } = await axios.post(endpoint, payload);
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        navigate('/');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach server. Is the backend running on port 5000?');
      } else {
        setError(err.response.data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setSuccess('');
    setForm({ name: '', email: '', password: '' });
  };

  const titles = {
    login:    { h: 'Welcome back',   sub: 'Sign in to continue' },
    register: { h: 'Create account', sub: 'AI-powered commerce' },
    forgot:   { h: 'Reset password', sub: 'We\'ll log the link to the console' },
  };

  return (
    <div className="page-auth">
      <div className="auth-card card anim-fade-up">

        {/* Brand */}
        <div className="auth-brand">SnapBuy</div>

        {/* Heading */}
        <h1 className="auth-title">{titles[mode].h}</h1>
        <p  className="auth-sub">{titles[mode].sub}</p>

        {/* Alerts */}
        {error   && <div className="auth-alert auth-alert--error">{error}</div>}
        {success && <div className="auth-alert auth-alert--success">{success}</div>}

        <form onSubmit={handleSubmit} noValidate>

          {/* Name — register only */}
          {mode === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Full name</label>
              <input
                className="field-input"
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Your name"
                required
                autoComplete="name"
                autoFocus
              />
            </div>
          )}

          {/* Email */}
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="field-input"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus={mode !== 'register'}
            />
          </div>

          {/* Password — login + register only */}
          {mode !== 'forgot' && (
            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label">Password</label>
                {mode === 'login' && (
                  <button type="button" className="auth-link-sm"
                    onClick={() => switchMode('forgot')}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="auth-pw-wrap">
                <input
                  className="field-input auth-pw-input"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder={mode === 'register' ? 'Create a strong password' : 'Your password'}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>

              {/* Strength meter — register only */}
              {mode === 'register' && form.password.length > 0 && (
                <div className="auth-strength">
                  <div className="auth-strength-track">
                    <div
                      className="auth-strength-fill"
                      style={{ width: `${strength.pct}%`, background: strength.color }}
                    />
                  </div>
                  <span className="auth-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                  {strength.score < 3 && (
                    <p className="auth-strength-hint">
                      Add uppercase letters, numbers, or special characters.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-full btn-pill auth-submit"
            disabled={isSubmitDisabled}
          >
            {loading ? <span className="spinner spinner-sm spinner-white" /> : null}
            {loading
              ? 'Please wait...'
              : mode === 'login'    ? 'Sign in'
              : mode === 'register' ? (strength.score < 3 ? 'Password too weak' : 'Create account')
              :                       'Send reset link'}
          </button>
        </form>

        {/* Footer toggle */}
        <p className="auth-footer">
          {mode === 'login' && (
            <>No account?{' '}
              <button className="auth-link" onClick={() => switchMode('register')}>
                Create one
              </button>
            </>
          )}
          {mode === 'register' && (
            <>Already have an account?{' '}
              <button className="auth-link" onClick={() => switchMode('login')}>
                Sign in
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <button className="auth-link" onClick={() => switchMode('login')}>
              Back to sign in
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
