import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const API_URL = '';

function checkPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '', percent: 0, checks: {} };

  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  score += checks.length ? 1 : 0;
  score += checks.uppercase ? 1 : 0;
  score += checks.lowercase ? 1 : 0;
  score += checks.number ? 1 : 0;
  score += checks.special ? 1 : 0;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#e53935', percent: 25, checks };
  if (score === 2) return { score: 2, label: 'Fair', color: '#fb8c00', percent: 50, checks };
  if (score === 3) return { score: 3, label: 'Good', color: '#1e88e5', percent: 75, checks };
  return { score: 4, label: 'Strong', color: '#43a047', percent: 100, checks };
}

function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  return digits;
}

function OTPInput({ otp, setOtp, onComplete, disabled, devOtp }) {
  const otpRefs = Array.from({ length: 6 }, () => React.createRef());

  useEffect(() => {
    if (devOtp && otp.join('') === '') {
      const digits = String(devOtp).split('');
      setOtp(digits.slice(0, 6));
      digits.forEach((digit, index) => {
        const ref = otpRefs[index];
        if (ref && ref.current) ref.current.value = digit;
      });
    }
  }, [devOtp, otp, setOtp, otpRefs]);

  const handleChange = (index, rawValue) => {
    const value = rawValue.replace(/\D/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < 5) {
      otpRefs[index + 1]?.current?.focus();
    }
    if (nextOtp.every(Boolean)) {
      onComplete(nextOtp.join(''));
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1]?.current?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextOtp = [...Array(6)].map((_, idx) => pasted[idx] || '');
    setOtp(nextOtp);
    if (nextOtp.every(Boolean)) onComplete(nextOtp.join(''));
    const lastIndex = Math.min(pasted.length, 5);
    otpRefs[lastIndex]?.current?.focus();
  };

  return (
    <div className="otp-input-row" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={index}
          ref={otpRefs[index]}
          className="otp-box"
          inputMode="numeric"
          maxLength={1}
          value={otp[index] || ''}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          aria-label={`Verification digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phoneNumber: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationState, setVerificationState] = useState({ active: false, token: '', phone: '', devOtp: '', expiresAt: null });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const navigate = useNavigate();

  useEffect(() => {
    if (!verificationState.active) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verificationState.active]);

  const strength = useMemo(
    () => checkPasswordStrength(formData.password),
    [formData.password]
  );

  const isSubmitDisabled = loading || (isRegister && strength.score < 3);

  const resetForm = () => {
    setFormData({ name: '', email: '', phoneNumber: '', password: '', confirmPassword: '' });
    setError('');
    setOtp(['', '', '', '', '', '']);
    setResendSeconds(30);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? {
            name: formData.name,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          }
        : { email: formData.email, password: formData.password };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);

      if (response.data.requiresPhoneVerification || response.data.phoneVerificationRequired) {
        const token = response.data.token || localStorage.getItem('token');
        setVerificationState({
          active: true,
          token,
          phone: response.data.otpSentTo || response.data.phoneNumber || formData.phoneNumber || '',
          devOtp: response.data.devOtp || '',
          expiresAt: response.data.expiresAt || null,
        });
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(response.data.user || {}));
        setOtp(['', '', '', '', '', '']);
        setError('');
        return;
      }

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/chat');
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.requiresPhoneVerification) {
        const token = err.response.data.token || localStorage.getItem('token');
        setVerificationState({
          active: true,
          token,
          phone: err.response.data.phoneNumber || formData.phoneNumber || '',
          devOtp: err.response.data.devOtp || '',
          expiresAt: err.response.data.expiresAt || null,
        });
        localStorage.setItem('token', token || '');
        localStorage.setItem('user', JSON.stringify(err.response.data.user || {}));
        setOtp(['', '', '', '', '', '']);
        return;
      }

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phoneNumber') {
      setFormData({ ...formData, phoneNumber: formatPhoneInput(value) });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleOtpSubmit = async (code) => {
    if (!code || code.length !== 6) return;
    setOtpLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/verify-phone', { code }, {
        headers: { Authorization: `Bearer ${verificationState.token}` },
      });

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setVerificationSuccess(true);
      // Automatically switch mode and clear verification active after 3 seconds
      setTimeout(() => {
        setVerificationState({ active: false, token: '', phone: '', devOtp: '', expiresAt: null });
        setVerificationSuccess(false);
        setIsRegister(false);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verificationState.token || resendSeconds > 0) return;
    try {
      const response = await axios.post('/api/auth/resend-otp', {}, {
        headers: { Authorization: `Bearer ${verificationState.token}` },
      });
      setVerificationState((prev) => ({ ...prev, devOtp: response.data.devOtp || prev.devOtp }));
      setOtp(['', '', '', '', '', '']);
      setResendSeconds(30);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to resend code right now.');
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setVerificationState({ active: false, token: '', phone: '', devOtp: '', expiresAt: null });
    setVerificationSuccess(false);
    resetForm();
  };

  if (verificationSuccess) {
    return (
      <div className="login-container">
        <div className="login-card otp-card">
          <div className="login-brand">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span>SnapBuy</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem', color: '#43a047' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1e293b' }}>Verification successful</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Your SnapBuy account is ready. Please log in to continue.</p>
          </div>
          <button className="submit-btn" onClick={() => { setVerificationSuccess(false); setVerificationState({ active: false, token: '', phone: '', devOtp: '', expiresAt: null }); setIsRegister(false); }}>
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  if (verificationState.active) {
    return (
      <div className="login-container">
        <div className="login-card otp-card">
          <div className="login-brand">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span>SnapBuy</span>
          </div>
          <h2>Verify your phone number</h2>

          <p className="otp-subtitle">
            We sent a verification code to<br />
            <strong>{verificationState.phone}</strong>
          </p>

          {error && <div className="error-message">{error}</div>}

          <div className="otp-box-wrap">
            <OTPInput otp={otp} setOtp={setOtp} onComplete={handleOtpSubmit} disabled={otpLoading} devOtp={verificationState.devOtp} />
          </div>

          {verificationState.devOtp && (
            <div className="otp-dev-box">Development code: <strong>{verificationState.devOtp}</strong></div>
          )}

          <button className="submit-btn" disabled={otpLoading || otp.join('').length !== 6} onClick={() => handleOtpSubmit(otp.join(''))}>
            {otpLoading ? 'Verifying…' : 'Verify'}
          </button>

          <div className="otp-meta">
            <button type="button" className="otp-link" disabled={resendSeconds > 0} onClick={handleResendOtp}>
              {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
            </button>
            <button type="button" className="otp-link subtle" onClick={() => setVerificationState({ active: false, token: '', phone: '', devOtp: '', expiresAt: null })}>
              Change phone number
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <h2>{isRegister ? 'Create Account' : 'SnapBuy — Everything you need.'}</h2>

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

          {isRegister && (
            <div className="form-group">
              <label>Phone Number</label>
              <div className="phone-wrapper">
                <span className="phone-prefix">+91</span>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  placeholder="9876543210"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}

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

            {isRegister && (
              <div className="form-group confirm-group">
                <label>Confirm Password</label>
                <div className="password-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

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

                {strength.score < 3 && (
                  <div className="strength-suggestion">
                    <strong>Tip:</strong> Add{' '}
                    {!strength.checks?.uppercase && 'an uppercase letter, '}
                    {!strength.checks?.number && 'a number, '}
                    {!strength.checks?.special && 'a special character like @ # $ !, '}
                    {!strength.checks?.length && 'at least 8 characters '}
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
