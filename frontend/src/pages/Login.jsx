import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

// Requests use Vite proxy (/api → localhost:5000) — no hardcoded URL needed
const API_URL = '';

// Pure JS password strength checker — no library needed
function checkPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };

  score += checks.length    ? 1 : 0;
  score += checks.uppercase ? 1 : 0;
  score += checks.lowercase ? 1 : 0;
  score += checks.number    ? 1 : 0;
  score += checks.special   ? 1 : 0;

  if (score <= 1) return { score: 1, label: 'Weak',   color: '#e53935', percent: 25,  checks };
  if (score === 2) return { score: 2, label: 'Fair',   color: '#fb8c00', percent: 50,  checks };
  if (score === 3) return { score: 3, label: 'Good',   color: '#1e88e5', percent: 75,  checks };
  return               { score: 4, label: 'Strong', color: '#43a047', percent: 100, checks };
}

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const strength = useMemo(
    () => checkPasswordStrength(formData.password),
    [formData.password]
  );

  const isSubmitDisabled = loading || (isRegister && strength.score < 3);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload  = isRegister
        ? formData
        : { email: formData.email, password: formData.password };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user',  JSON.stringify(response.data.user));
        navigate('/chat');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to server. Make sure the backend is running on port 5000.');
      } else {
        setError(err.response.data?.error || 'Something went wrong. Please try again.');
      }
      console.error('[Auth error]', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const switchMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span>SnapBuy</span>
        </div>
        <h2>{isRegister ? 'Create Account' : 'Checkout in a Snap.'}</h2>

        {error && (
          <div className="error-message">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your name"
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder={isRegister ? 'Create a strong password' : 'Enter your password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>

            {/* Forgot Password Link - Only show on Login mode */}
            {!isRegister && (
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <span 
                  onClick={() => navigate('/forgot-password')} 
                  style={{ color: '#2563eb', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Forgot Password?
                </span>
              </div>
            )}

            {/* Password strength meter — only shown on register */}
            {isRegister && formData.password.length > 0 && (
              <div className="strength-container">
                <div className="strength-bar-track">
                  <div
                    className="strength-bar-fill"
                    style={{
                      width: `${strength.percent}%`,
                      backgroundColor: strength.color,
                    }}
                  />
                </div>
                <span className="strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>

                {/* Suggestion box for weak passwords */}
                {strength.score < 3 && (
                  <div className="strength-suggestion">
                    <strong>Tip:</strong> Add{' '}
                    {!strength.checks?.uppercase && 'an uppercase letter, '}
                    {!strength.checks?.number    && 'a number, '}
                    {!strength.checks?.special   && 'a special character like @ # $ !, '}
                    {!strength.checks?.length    && 'at least 8 characters '}
                    to make it stronger.
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={isSubmitDisabled}>
            {loading
              ? 'Please wait…'
              : isRegister
                ? strength.score < 3
                  ? `Password too ${strength.label || 'short'}`
                  : 'Register'
                : 'Login'}
          </button>
        </form>

        <p className="toggle-text">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={switchMode}>
            {isRegister ? 'Login' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
