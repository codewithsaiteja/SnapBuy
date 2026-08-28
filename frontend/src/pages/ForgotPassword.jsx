import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>⚡ SnapBuy</h1>
        <h2>Reset Password</h2>
        
        {error && <div className="error-message">⚠️ {error}</div>}
        {message && <div style={{ color: 'green', marginBottom: '1rem', background: '#dcfce7', padding: '0.75rem', borderRadius: '4px' }}>✅ {message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="Enter your email"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading || !email}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <p className="toggle-text" style={{ marginTop: '1rem' }}>
          Remember your password? <span onClick={() => navigate('/login')}>Back to Login</span>
        </p>
      </div>
    </div>
  );
}
