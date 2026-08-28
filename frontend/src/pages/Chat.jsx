import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { triggerRazorpay } from '../utils/razorpay';
import OrderSummaryCard from '../components/OrderSummaryCard';
import PaymentSuccess from '../components/PaymentSuccess';
import './Chat.css';

const API = '/api';

// Attach JWT to every axios request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Welcome screen example prompts ─────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  { text: 'Buy 2 Coffee',            icon: 'coffee'  },
  { text: 'Find a wireless mouse',   icon: 'search'  },
  { text: 'Order a desk lamp',       icon: 'lamp'    },
  { text: 'Show my recent orders',   icon: 'orders'  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="msg msg--ai">
      <div className="msg__bubble msg__bubble--typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast--${type}`} role="alert">
      <span>{message}</span>
      <button className="toast__close" onClick={onClose} aria-label="Dismiss">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

function AILogicPanel({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const addressLabels = { message: 'From your message', profile: 'Saved address', not_provided: 'Not yet provided' };
  const intentLabels  = { ai: 'AI (Groq)', fallback: 'Pattern match' };
  const confidenceColor = data.confidence >= 90 ? '#16a34a' : data.confidence >= 70 ? '#d97706' : '#dc2626';
  return (
    <div className="ai-logic">
      <button className="ai-logic__toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" strokeWidth="2.5" fill="none"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        AI Decision
      </button>
      {open && (
        <div className="ai-logic__panel">
          {[
            ['Intent',         'Add to cart'],
            ['Items matched',  (data.parsedItems || []).map(i => `${i.qty}× ${i.name}`).join(', ') || '—'],
            ['Address source', addressLabels[data.addressSource] || data.addressSource || '—'],
            ['Parser used',    intentLabels[data.intentSource] || '—'],
            ['Next step',      data.recommendedAction || '—'],
          ].map(([label, value]) => (
            <div key={label} className="ai-logic__row">
              <span>{label}</span><span>{value}</span>
            </div>
          ))}
          <div className="ai-logic__row">
            <span>Confidence</span>
            <span style={{ color: confidenceColor, fontWeight: 700 }}>
              {data.confidence != null ? `${data.confidence}%` : '—'}
            </span>
          </div>
          {data.notFound?.length > 0 && (
            <div className="ai-logic__row ai-logic__row--warn">
              <span>Not found</span><span>{data.notFound.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionChips({ suggestions, onSelect }) {
  if (!suggestions?.length) return null;
  return (
    <div className="suggestion-chips">
      <span className="suggestion-chips__label">Try one of these:</span>
      <div className="suggestion-chips__list">
        {suggestions.map(s => (
          <button key={s} className="suggestion-chip" onClick={() => onSelect(`Buy 1 ${s}`)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function RetryCard({ orderId, amount, onRetry, onDismiss, processing }) {
  return (
    <div className="retry-card">
      <span>Payment was not completed.</span>
      <button className="retry-card__btn" onClick={() => onRetry(orderId, amount)} disabled={processing}>
        {processing ? 'Retrying…' : 'Retry Payment'}
      </button>
      <button className="retry-card__skip" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}

// ─── Speech recognition (used in both Composer and address input) ────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSupported = Boolean(SpeechRecognition);

function useSpeech(onTranscript, disabled) {
  const [listening, setListening] = useState(false);
  const [errMsg,    setErrMsg]    = useState('');
  const recRef = useRef(null);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!speechSupported || disabled) return;
    setErrMsg('');
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN'; rec.interimResults = false; rec.maxAlternatives = 1; rec.continuous = false;
    recRef.current = rec;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = (e) => {
      setListening(false);
      if (e.error === 'not-allowed') setErrMsg('Microphone permission denied.');
      else if (e.error === 'no-speech') setErrMsg('No speech detected.');
      else setErrMsg('Could not understand. Try again.');
      setTimeout(() => setErrMsg(''), 3000);
    };
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript?.trim();
      if (t) onTranscript(t);
      else setErrMsg('Could not understand. Try again.');
      setTimeout(() => setErrMsg(''), 3000);
    };
    try { rec.start(); } catch { setErrMsg('Could not start microphone.'); }
  }, [disabled, onTranscript]);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, stop, start]);

  return { listening, errMsg, toggle, supported: speechSupported };
}

// ─── Premium Composer ────────────────────────────────────────────────────────
// Used in both welcome state (large) and active chat (compact bottom bar)
function Composer({ onSend, disabled, placeholder, variant = 'welcome', inputRef: externalRef }) {
  const [value, setValue] = useState('');
  const internalRef = useRef(null);
  const ref = externalRef || internalRef;
  const wrapperRef = useRef(null);
  const [results,  setResults]  = useState([]);
  const [dropOpen, setDropOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Autocomplete search
  const doSearch = (q) => {
    if (!q.trim()) { setResults([]); setDropOpen(false); return; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API}/products/search`, { params: { q, limit: 5 } });
        setResults(data.products || []);
        setDropOpen(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 280);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const submit = (text) => {
    const t = (text || value).trim();
    if (!t || disabled) return;
    setValue('');
    setDropOpen(false);
    setResults([]);
    onSend(t);
  };

  const { listening, errMsg, toggle: toggleMic } = useSpeech(
    (transcript) => { submit(transcript); },
    disabled
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') setDropOpen(false);
  };

  const cls = variant === 'active' ? 'composer composer--active' : 'composer composer--welcome';

  return (
    <div className={cls} ref={wrapperRef}>
      <div className="composer__field">
        <input
          ref={ref}
          type="text"
          className="composer__input"
          value={value}
          onChange={(e) => { setValue(e.target.value); doSearch(e.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim() && setDropOpen(true)}
          placeholder={placeholder || 'What would you like to buy?'}
          disabled={disabled}
          autoComplete="off"
          aria-label="Message input"
          aria-autocomplete="list"
          aria-expanded={dropOpen}
        />

        {/* Microphone button */}
        <button
          type="button"
          className={`composer__mic${listening ? ' composer__mic--active' : ''}${!speechSupported ? ' composer__mic--disabled' : ''}`}
          onClick={toggleMic}
          disabled={disabled || !speechSupported}
          aria-label={listening ? 'Stop recording' : 'Start voice input'}
          title={!speechSupported ? 'Speech not supported in this browser' : listening ? 'Stop recording' : 'Speak'}
        >
          {listening ? (
            /* Stop square */
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            /* Mic */
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8"  y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>

        {/* Send button */}
        <button
          type="button"
          className="composer__send"
          onClick={() => submit()}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          {disabled ? (
            <span className="composer__spinner" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {dropOpen && (
        <ul className="composer__dropdown" role="listbox">
          {searching ? (
            <li className="composer__dropdown-empty">Searching…</li>
          ) : results.length > 0 ? (
            results.map(p => (
              <li
                key={p.id}
                className="composer__dropdown-item"
                role="option"
                onClick={() => { setValue(''); setDropOpen(false); onSend(`Add 1 ${p.name}`); }}
              >
                <span className="composer__dropdown-name">{p.name}</span>
                <span className="composer__dropdown-price">₹{p.price}</span>
              </li>
            ))
          ) : (
            <li className="composer__dropdown-empty" role="option" aria-disabled="true">
              No results. Try "Coffee" or "Mouse".
            </li>
          )}
        </ul>
      )}

      {/* Mic error tooltip */}
      {errMsg && <div className="composer__mic-error" role="alert">{errMsg}</div>}
    </div>
  );
}

// ─── AI orb mark — subtle animated identity ──────────────────────────────────
function AIMark() {
  return (
    <div className="ai-mark" aria-hidden="true">
      <svg viewBox="0 0 56 56" fill="none" width="56" height="56">
        <circle cx="28" cy="28" r="28" fill="#eff6ff"/>
        {/* Stylised S-path suggesting intelligence / flow */}
        <path
          d="M20 22c0-3.314 2.686-6 6-6h4a6 6 0 0 1 6 6v1a4 4 0 0 1-4 4h-4a4 4 0 0 0-4 4v1a6 6 0 0 0 6 6h4"
          stroke="#2563eb"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Inner dot */}
        <circle cx="28" cy="28" r="2.5" fill="#2563eb" opacity="0.18"/>
      </svg>
      <div className="ai-mark__pulse" />
    </div>
  );
}

// ─── Prompt icon helpers ─────────────────────────────────────────────────────
function PromptIcon({ type }) {
  const icons = {
    coffee: <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>,
    search: <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>,
    lamp:   <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    orders: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[type]}
    </svg>
  );
}

// ─── Address input row (for 2-step address collection) ───────────────────────
function AddressComposer({ onSend, disabled, inputRef }) {
  const [value, setValue] = useState('');
  const { listening, toggle: toggleMic } = useSpeech(
    (t) => setValue(t),
    disabled
  );

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    setValue('');
    onSend(t);
  };

  return (
    <div className="composer composer--active">
      <div className="composer__field">
        <input
          ref={inputRef}
          type="text"
          className="composer__input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="e.g. 12 MG Road, Bangalore 560001…"
          disabled={disabled}
          autoComplete="street-address"
          aria-label="Delivery address"
        />
        <button
          type="button"
          className={`composer__mic${listening ? ' composer__mic--active' : ''}`}
          onClick={toggleMic}
          disabled={disabled || !speechSupported}
          aria-label={listening ? 'Stop recording' : 'Speak your address'}
        >
          {listening ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8"  y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
        <button
          type="button"
          className="composer__send"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Confirm address"
        >
          {disabled ? <span className="composer__spinner" /> : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Chat component
// ═══════════════════════════════════════════════════════════════════════════════
export default function Chat() {
  const [messages,        setMessages]        = useState([]);
  const [isTyping,        setIsTyping]        = useState(false);
  const [isPaying,        setIsPaying]        = useState(false);
  const [toast,           setToast]           = useState(null);
  const [awaitingAddress, setAwaitingAddress] = useState(false);
  const [pendingItems,    setPendingItems]    = useState([]);
  const [receipt,         setReceipt]         = useState(null);
  const [cart,            setCart]            = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const navigate       = useNavigate();

  const user         = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const avatarLetter = (user.name || user.email || 'U')[0].toUpperCase();
  const firstName    = user.name?.split(' ')[0] || 'there';

  // Load existing cart on mount
  useEffect(() => {
    axios.get(`${API}/cart`)
      .then(({ data }) => { if (data.success && data.cart) setCart(data.cart); })
      .catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const showToast = useCallback((msg, type = 'error') => setToast({ msg, type }), []);

  const addMsg = useCallback((type, content, extra = {}) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, type, content, ...extra }]);
  }, []);

  const removeMsg = useCallback((id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ── Core send handler — ALL existing logic preserved exactly ─────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isTyping) return;
    inputRef.current?.focus();
    addMsg('user', trimmed);
    setIsTyping(true);
    try {
      const body = awaitingAddress
        ? { message: trimmed, isAddress: true, pendingItems }
        : { message: trimmed };
      const { data } = await axios.post(`${API}/chat`, body);
      setIsTyping(false);

      if (data.cart !== undefined) setCart(data.cart);

      if (data.success === false && !data.isInvalid) {
        addMsg('ai', data.message || 'Something went wrong. Please try again.');
        return;
      }
      if (data.isInvalid) {
        addMsg('ai', data.message);
        if (data.suggestions?.length) addMsg('suggestions', '', { suggestions: data.suggestions });
        return;
      }
      if (data.addressRequired) {
        setAwaitingAddress(true);
        setPendingItems(data.pendingItems || []);
        addMsg('ai', data.message);
        return;
      }
      if (data.razorpayOrderId) {
        setAwaitingAddress(false);
        setPendingItems([]);
        addMsg('ai', data.message, { aiLogic: data.aiLogic });
        addMsg('order-card', '', {
          orderData: {
            orderId: data.orderId, razorpayOrderId: data.razorpayOrderId,
            items: data.parsed?.items || [], totalAmount: data.totalAmount,
            address: data.parsed?.address || '', isEdit: data.isEdit,
          },
          aiLogic: data.aiLogic,
        });
        return;
      }
      addMsg('ai', data.message || 'Done.', { aiLogic: data.aiLogic });
    } catch (err) {
      setIsTyping(false);
      showToast(
        !err.response
          ? 'Cannot reach server. Is the backend running on port 5000?'
          : err.response?.data?.error || 'Request failed. Please try again.'
      );
    }
  }, [isTyping, awaitingAddress, pendingItems, addMsg, showToast]);

  // ── Payment handler — unchanged ──────────────────────────────────────────
  const handlePay = useCallback(async (razorpayOrderId, amount, orderId) => {
    if (isPaying) return;
    setIsPaying(true);
    await triggerRazorpay(
      razorpayOrderId, amount, orderId,
      async (response) => {
        try {
          const { data } = await axios.post(`${API}/verify-payment`, {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
          if (data.success) setReceipt(data.receipt);
          else showToast('Payment received but verification failed. Contact support.');
        } catch { showToast('Verification failed. Contact support with your payment ID.'); }
        finally { setIsPaying(false); }
      },
      (failedOrderId) => { setIsPaying(false); addMsg('retry', '', { retryOrderId: failedOrderId, retryAmount: amount }); },
      (errMsg) => { setIsPaying(false); showToast(errMsg); }
    );
  }, [isPaying, showToast, addMsg]);

  const handleRetry = async (orderId, amount) => {
    setIsPaying(true);
    try {
      const { data } = await axios.post(`${API}/retry-payment`, { orderId });
      if (data.maxRetriesReached) { showToast('Maximum retry attempts reached. Please start a new order.'); setIsPaying(false); return; }
      setMessages(prev => prev.filter(m => m.type !== 'retry'));
      await handlePay(data.razorpayOrderId, amount, orderId);
    } catch { setIsPaying(false); showToast('Could not generate retry. Please try again.'); }
  };

  const startNewOrder = () => {
    setReceipt(null); setMessages([]); setAwaitingAddress(false);
    setPendingItems([]); setCart(null);
    axios.post(`${API}/chat`, { message: 'clear cart' }).catch(() => {});
  };

  const finalizeCart = async () => {
    setIsPaying(true);
    try {
      const { data } = await axios.post(`${API}/cart/finalize`);
      if (data.success) { setCart(null); await handlePay(data.razorpayOrderId, data.totalAmount, data.orderId); }
    } catch (err) {
      setIsPaying(false);
      if (err.response?.data?.addressRequired) {
        setAwaitingAddress(true);
        if (cart) setPendingItems(cart.items);
        addMsg('ai', 'Delivery address is required. Please type your delivery address below to complete the order.');
      } else {
        showToast(err.response?.data?.error || 'Failed to finalize cart. Please try again.');
      }
    }
  };

  if (receipt) return <PaymentSuccess receipt={receipt} onStartNewOrder={startNewOrder} />;

  const isWelcome = messages.length === 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="chat-shell">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="chat-header">
        <div className="chat-header__left">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <div>
            <div className="chat-header__brand">SnapBuy</div>
            <div className="chat-header__tagline">AI Powered Commerce</div>
          </div>
        </div>
        <nav className="chat-header__right">
          <button className="hdr-link" onClick={() => navigate('/history')}>Orders</button>
          <button className="hdr-link" onClick={() => navigate('/profile')}>Profile</button>
          <div className="avatar-menu">
            <div className="avatar" title={user.name || user.email}>{avatarLetter}</div>
            <div className="avatar-dropdown">
              <div className="avatar-name">{user.name || user.email}</div>
              <button className="avatar-logout" onClick={handleLogout}>Sign Out</button>
            </div>
          </div>
        </nav>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className="chat-main">

        {/* ══ WELCOME STATE ═══════════════════════════════════════════ */}
        {isWelcome && (
          <div className="welcome-screen">
            <div className="welcome-screen__inner">

              {/* AI identity mark */}
              <AIMark />

              {/* Greeting */}
              <h1 className="welcome-screen__title">
                Hi {firstName}, I'm your<br />
                <span className="welcome-screen__accent">AI shopping assistant</span>
              </h1>
              <p className="welcome-screen__sub">
                Tell me what you'd like to buy — I'll find it, add it to your cart,<br className="welcome-screen__br" />
                and take you through checkout.
              </p>

              {/* Cart resume banner (only when cart has items) */}
              {cart && cart.items?.length > 0 && (
                <div className="welcome-screen__cart-banner">
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="#1d4ed8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <span>
                    You have {cart.items.reduce((s, i) => s + i.qty, 0)} item{cart.items.reduce((s, i) => s + i.qty, 0) === 1 ? '' : 's'} in your cart —&nbsp;
                    <strong>₹{cart.totalAmount?.toLocaleString('en-IN')}</strong>.
                    Continue shopping or&nbsp;
                    <button className="welcome-screen__pay-link" onClick={finalizeCart} disabled={isPaying}>
                      {isPaying ? 'Processing…' : 'pay now'}
                    </button>.
                  </span>
                </div>
              )}

              {/* Main composer */}
              <div className="welcome-screen__composer-wrap">
                <Composer
                  onSend={sendMessage}
                  disabled={isTyping}
                  placeholder="What would you like to buy?"
                  variant="welcome"
                  inputRef={inputRef}
                />
              </div>

              {/* Example prompts */}
              <div className="welcome-screen__prompts" role="list" aria-label="Example prompts">
                {EXAMPLE_PROMPTS.map(({ text, icon }) => (
                  <button
                    key={text}
                    role="listitem"
                    className="prompt-card"
                    onClick={() => sendMessage(text)}
                    disabled={isTyping}
                  >
                    <span className="prompt-card__icon"><PromptIcon type={icon} /></span>
                    <span className="prompt-card__text">{text}</span>
                  </button>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* ══ ACTIVE CHAT STATE ════════════════════════════════════════ */}
        {!isWelcome && (
          <div className="messages">
            {messages.map((msg) => {
              if (msg.type === 'user') return (
                <div key={msg.id} className="msg msg--user">
                  <div className="msg__bubble msg__bubble--user">{msg.content}</div>
                </div>
              );
              if (msg.type === 'ai') return (
                <div key={msg.id} className="msg msg--ai">
                  <div className="msg__bubble msg__bubble--ai">{msg.content}</div>
                  {msg.aiLogic && <AILogicPanel data={msg.aiLogic} />}
                </div>
              );
              if (msg.type === 'order-card') return (
                <div key={msg.id} className="msg msg--ai">
                  <OrderSummaryCard orderData={msg.orderData} onPay={handlePay} processing={isPaying} />
                  {msg.aiLogic && <AILogicPanel data={msg.aiLogic} />}
                </div>
              );
              if (msg.type === 'suggestions') return (
                <div key={msg.id} className="msg msg--ai">
                  <SuggestionChips suggestions={msg.suggestions} onSelect={sendMessage} />
                </div>
              );
              if (msg.type === 'category-result') return (
                <div key={msg.id} className="msg msg--ai">
                  <div className="msg__bubble msg__bubble--ai">
                    <div style={{ marginBottom: '10px' }}>{msg.content}</div>
                    {msg.items?.length > 0 ? (
                      <div className="category-result-grid">
                        {msg.items.map((p) => (
                          <div key={p.id} className="category-result-card"
                            onClick={() => sendMessage(`Add 1 ${p.name}`)}
                            role="button" tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && sendMessage(`Add 1 ${p.name}`)}>
                            <div className="category-result-card__name">{p.name}</div>
                            <div className="category-result-card__price">₹{p.price}</div>
                            <div className="category-result-card__add">Tap to add</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No products found in this category.</div>
                    )}
                  </div>
                </div>
              );
              if (msg.type === 'retry') return (
                <div key={msg.id} className="msg msg--ai">
                  <RetryCard orderId={msg.retryOrderId} amount={msg.retryAmount}
                    onRetry={handleRetry} onDismiss={() => removeMsg(msg.id)} processing={isPaying} />
                </div>
              );
              return null;
            })}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ══ BOTTOM INPUT BAR (active chat only) ═════════════════════ */}
        {!isWelcome && (
          <div className="input-area">
            {/* Cart footer */}
            {cart?.items?.length > 0 && (
              <div className="cart-sticky-footer">
                <div className="cart-sticky-footer__info">
                  <span className="cart-sticky-footer__count">
                    {cart.items.reduce((s, i) => s + i.qty, 0)}{' '}
                    {cart.items.reduce((s, i) => s + i.qty, 0) === 1 ? 'item' : 'items'}
                  </span>
                  <span className="cart-sticky-footer__divider">|</span>
                  <span className="cart-sticky-footer__total">₹{cart.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <button className="cart-sticky-footer__pay-btn" onClick={finalizeCart} disabled={isPaying}>
                  {isPaying ? 'Processing…' : 'Pay Now'}
                </button>
              </div>
            )}

            {/* Address banner */}
            {awaitingAddress && (
              <div className="address-banner">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Enter your delivery address to complete the order
              </div>
            )}

            {/* Composer or address input */}
            {awaitingAddress ? (
              <AddressComposer onSend={sendMessage} disabled={isTyping} inputRef={inputRef} />
            ) : (
              <Composer
                onSend={sendMessage}
                disabled={isTyping}
                placeholder="Ask anything — add, remove, change…"
                variant="active"
                inputRef={inputRef}
              />
            )}
          </div>
        )}

      </main>
    </div>
  );
}
