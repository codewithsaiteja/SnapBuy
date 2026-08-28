import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { triggerRazorpay } from '../utils/razorpay';
import OrderSummaryCard from '../components/OrderSummaryCard';
import CategoryChips from '../components/CategoryChips';
import VoiceButton from '../components/VoiceButton';
import PaymentSuccess from '../components/PaymentSuccess';
import './Chat.css';

// All API calls go through Vite proxy → /api → localhost:5000
const API = '/api';

// Attach JWT to every axios call
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Quick-reply chips shown below the input ────────────────────────────────
const QUICK_CHIPS = ['Coffee', 'Mouse', 'USB-C Cable', 'Notebook', 'Desk Lamp'];

// ── Typing indicator (three bouncing dots) ─────────────────────────────────
function TypingIndicator() {
  return (
    <div className="msg msg--ai">
      <div className="msg__bubble msg__bubble--typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

// ── Toast notification ─────────────────────────────────────────────────────
function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast--${type}`} role="alert">
      <span>{message}</span>
      <button className="toast__close" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}

// ── AI Logic collapsible panel (Label 4) ───────────────────────────────────
function AILogicPanel({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div className="ai-logic">
      <button className="ai-logic__toggle" onClick={() => setOpen(o => !o)}>
        {open ? '▾ Hide AI Logic' : '▸ Show AI Logic'}
      </button>
      {open && (
        <div className="ai-logic__panel">
          <div className="ai-logic__row">
            <span>Parsed Items</span>
            <span>
              {(data.parsedItems || []).map(i => `${i.qty}× ${i.name}`).join(', ') || '—'}
            </span>
          </div>
          <div className="ai-logic__row">
            <span>Address Source</span>
            <span>{data.addressSource || '—'}</span>
          </div>
          <div className="ai-logic__row">
            <span>Recommended</span>
            <span>{data.recommendedAction || '—'}</span>
          </div>
          <div className="ai-logic__row">
            <span>Confidence</span>
            <span className="ai-logic__confidence">
              {data.confidence != null ? `${data.confidence}%` : '—'}
            </span>
          </div>
          {/* Raw JSON for transparency */}
          <pre className="ai-logic__raw">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ── Product recovery suggestion chips ─────────────────────────────────────
function SuggestionChips({ suggestions, onSelect }) {
  if (!suggestions?.length) return null;
  return (
    <div className="suggestion-chips">
      <span className="suggestion-chips__label">Try one of these:</span>
      <div className="suggestion-chips__list">
        {suggestions.map(s => (
          <button
            key={s}
            className="suggestion-chip"
            onClick={() => onSelect(`Buy 1 ${s}`)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Autocomplete Search Bar ────────────────────────────────────────────────
function SearchBar({ onSend, disabled }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/products/search`, { params: { q, limit: 5 } });
        setResults(data.products || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  };

  const handleSelect = (product) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSend(`Add 1 ${product.name}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      setOpen(false);
      onSend(query.trim());
      setQuery('');
    }
    if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="search-bar-wrap" ref={wrapperRef}>
      <div className="search-bar-row">
        <svg className="search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          className="search-bar-input"
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Search 250+ products — Rice, Headphones, Shampoo…"
          disabled={disabled}
          autoComplete="off"
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && <span className="search-bar-spinner" />}
      </div>

      {open && (
        <ul className="search-dropdown" role="listbox">
          {results.length > 0 ? (
            results.map(p => (
              <li
                key={p.id}
                className="search-dropdown__item"
                role="option"
                onClick={() => handleSelect(p)}
              >
                <span className="search-dropdown__name">{p.name}</span>
                <span className="search-dropdown__price">₹{p.price}</span>
              </li>
            ))
          ) : (
            <li className="search-dropdown__empty" role="option" aria-disabled="true">
              No items found. Try typing &ldquo;Coffee&rdquo; or &ldquo;Rice&rdquo;.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Retry card shown when payment modal is dismissed / fails ───────────────
function RetryCard({ orderId, amount, onRetry, onDismiss, processing }) {
  return (
    <div className="retry-card">
      <span>Payment was not completed.</span>
      <button
        className="retry-card__btn"
        onClick={() => onRetry(orderId, amount)}
        disabled={processing}
      >
        {processing ? 'Retrying…' : 'Retry Payment'}
      </button>
      <button className="retry-card__skip" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Chat component
// ─────────────────────────────────────────────────────────────────────────────
export default function Chat() {
  // message shape: { id, type, content, orderData?, aiLogic?, suggestions? }
  const [messages,        setMessages]        = useState([]);
  const [inputText,       setInputText]       = useState('');
  const [isTyping,        setIsTyping]        = useState(false);
  const [isPaying,        setIsPaying]        = useState(false);
  const [toast,           setToast]           = useState(null);   // { msg, type }
  const [awaitingAddress, setAwaitingAddress] = useState(false);
  const [pendingItems,    setPendingItems]    = useState([]);
  const [receipt,         setReceipt]         = useState(null);
  const [cart,            setCart]            = useState(null);
  const [lastAiMessage,   setLastAiMessage]   = useState('');

  useEffect(() => {
    axios.get(`${API}/cart`)
      .then(({ data }) => {
        if (data.success && data.cart) {
          setCart(data.cart);
        }
      })
      .catch(() => {});
  }, []);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const navigate       = useNavigate();

  const user         = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const avatarLetter = (user.name || user.email || 'U')[0].toUpperCase();

  // Auto-scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const showToast = useCallback((msg, type = 'error') => setToast({ msg, type }), []);

  const addMsg = useCallback((type, content, extra = {}) => {
    setMessages(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, type, content, ...extra },
    ]);
    if (type === 'ai' && content) {
      setLastAiMessage(content);
    }
  }, []);

  const removeMsg = useCallback((id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ── Core send handler ────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isTyping) return;

    setInputText('');
    inputRef.current?.focus();
    addMsg('user', trimmed);
    setIsTyping(true);

    try {
      const body = awaitingAddress
        ? { message: trimmed, isAddress: true, pendingItems }
        : { message: trimmed };

      const { data } = await axios.post(`${API}/chat`, body);
      setIsTyping(false);

      if (data.cart !== undefined) {
        setCart(data.cart);
      }

      if (data.success === false && !data.isInvalid) {
        addMsg('ai', data.message || 'Something went wrong. Please try again.');
        return;
      }

      // Invalid product — show recovery suggestions
      if (data.isInvalid) {
        addMsg('ai', data.message);
        if (data.suggestions?.length) {
          addMsg('suggestions', '', { suggestions: data.suggestions });
        }
        return;
      }

      // Address required — 2-step flow step 1
      if (data.addressRequired) {
        setAwaitingAddress(true);
        setPendingItems(data.pendingItems || []);
        addMsg('ai', data.message);
        return;
      }

      // Order created successfully — show order card
      if (data.razorpayOrderId) {
        setAwaitingAddress(false);
        setPendingItems([]);

        addMsg('ai', data.message, { aiLogic: data.aiLogic });
        addMsg('order-card', '', {
          orderData: {
            orderId:         data.orderId,
            razorpayOrderId: data.razorpayOrderId,
            items:           data.parsed?.items  || [],
            totalAmount:     data.totalAmount,
            address:         data.parsed?.address || '',
            isEdit:          data.isEdit,
          },
          aiLogic: data.aiLogic,
        });
        return;
      }

      // Fallback: plain AI text
      addMsg('ai', data.message || 'Done.', { aiLogic: data.aiLogic });

    } catch (err) {
      setIsTyping(false);
      const isNetwork = !err.response;
      showToast(
        isNetwork
          ? 'Cannot reach server. Is the backend running on port 5000?'
          : err.response?.data?.error || 'Request failed. Please try again.'
      );
    }
  };

  // ── Payment handler ───────────────────────────────────────────────────────
  const handlePay = useCallback(async (razorpayOrderId, amount, orderId) => {
    if (isPaying) return;
    setIsPaying(true);

    await triggerRazorpay(
      razorpayOrderId,
      amount,
      orderId,
      // onSuccess
      async (response) => {
        try {
          const { data } = await axios.post(`${API}/verify-payment`, {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
          if (data.success) {
            setReceipt(data.receipt);
          } else {
            showToast('Payment received but verification failed. Contact support.');
          }
        } catch {
          showToast('Verification failed. Contact support with your payment ID.');
        } finally {
          setIsPaying(false);
        }
      },
      // onRetry — modal dismissed or payment.failed
      (failedOrderId) => {
        setIsPaying(false);
        addMsg('retry', '', { retryOrderId: failedOrderId, retryAmount: amount });
      },
      // onFailure — SDK load error
      (errMsg) => {
        setIsPaying(false);
        showToast(errMsg);
      }
    );
  }, [isPaying, showToast, addMsg]);

  // ── Retry payment ─────────────────────────────────────────────────────────
  const handleRetry = async (orderId, amount) => {
    setIsPaying(true);
    try {
      const { data } = await axios.post(`${API}/retry-payment`, { orderId });
      if (data.maxRetriesReached) {
        showToast('Maximum retry attempts reached. Please start a new order.');
        setIsPaying(false);
        return;
      }
      // Remove the retry prompt
      setMessages(prev => prev.filter(m => m.type !== 'retry'));
      await handlePay(data.razorpayOrderId, amount, orderId);
    } catch {
      setIsPaying(false);
      showToast('Could not generate retry. Please try again.');
    }
  };

  // ── Start new order after payment ────────────────────────────────────────
  const startNewOrder = () => {
    setReceipt(null);
    setMessages([]);
    setAwaitingAddress(false);
    setPendingItems([]);
    setCart(null);
    axios.post(`${API}/chat`, { message: 'clear cart' }).catch(() => {});
    inputRef.current?.focus();
  };

  const finalizeCart = async () => {
    setIsPaying(true);
    try {
      const { data } = await axios.post(`${API}/cart/finalize`);
      if (data.success) {
        setCart(null);
        await handlePay(data.razorpayOrderId, data.totalAmount, data.orderId);
      }
    } catch (err) {
      setIsPaying(false);
      if (err.response?.data?.addressRequired) {
        setAwaitingAddress(true);
        if (cart) {
          setPendingItems(cart.items);
        }
        addMsg('ai', 'Delivery address is required. Please type your delivery address below to complete the order.');
      } else {
        showToast(err.response?.data?.error || 'Failed to finalize cart. Please try again.');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // ── Category chip handler ──────────────────────────────────────────────────
  const handleCategorySelect = (categoryLabel, items) => {
    const countText = items.length > 0 ? `Top ${items.length} items` : 'No items';
    addMsg('category-result',
      `${countText} in ${categoryLabel}. Tap any item to add it to your cart.`,
      { items }
    );
  };

  // ── Post-payment receipt screen ───────────────────────────────────────────
  if (receipt) {
    return <PaymentSuccess receipt={receipt} onStartNewOrder={startNewOrder} />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="chat-shell">

      {/* Toast */}
      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="chat-header">
        <div className="chat-header__left">
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

      {/* ── Messages area ──────────────────────────────────────────────── */}
      <main className="chat-main">
        <div className="messages">

          {/* Welcome screen — only shown when chat is empty */}
          {messages.length === 0 && (
            <div className="welcome">
              <div className="welcome__icon" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
                  <circle cx="24" cy="24" r="24" fill="#eff6ff"/>
                  <path d="M14 24h20M24 14v20" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="welcome__heading">
                Hi {user.name?.split(' ')[0] || 'there'}, what would you like to order?
              </h2>
              <p className="welcome__hint">
                Type below, use voice, or browse by category.
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => {

            if (msg.type === 'user') {
              return (
                <div key={msg.id} className="msg msg--user">
                  <div className="msg__bubble msg__bubble--user">{msg.content}</div>
                </div>
              );
            }

            if (msg.type === 'ai') {
              return (
                <div key={msg.id} className="msg msg--ai">
                  <div className="msg__bubble msg__bubble--ai">{msg.content}</div>
                  {msg.aiLogic && <AILogicPanel data={msg.aiLogic} />}
                </div>
              );
            }

            if (msg.type === 'order-card') {
              return (
                <div key={msg.id} className="msg msg--ai">
                  <OrderSummaryCard
                    orderData={msg.orderData}
                    onPay={handlePay}
                    processing={isPaying}
                  />
                  {msg.aiLogic && <AILogicPanel data={msg.aiLogic} />}
                </div>
              );
            }

            if (msg.type === 'suggestions') {
              return (
                <div key={msg.id} className="msg msg--ai">
                  <SuggestionChips
                    suggestions={msg.suggestions}
                    onSelect={sendMessage}
                  />
                </div>
              );
            }

            if (msg.type === 'category-result') {
              return (
                <div key={msg.id} className="msg msg--ai">
                  <div className="msg__bubble msg__bubble--ai">
                    <div style={{ marginBottom: '10px' }}>{msg.content}</div>
                    {msg.items && msg.items.length > 0 ? (
                      <div className="category-result-grid">
                        {msg.items.map((p) => (
                          <div
                            key={p.id}
                            className="category-result-card"
                            onClick={() => sendMessage(`Add 1 ${p.name}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && sendMessage(`Add 1 ${p.name}`)}
                          >
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
            }

            if (msg.type === 'retry') {
              return (
                <div key={msg.id} className="msg msg--ai">
                  <RetryCard
                    orderId={msg.retryOrderId}
                    amount={msg.retryAmount}
                    onRetry={handleRetry}
                    onDismiss={() => removeMsg(msg.id)}
                    processing={isPaying}
                  />
                </div>
              );
            }

            return null;
          })}

          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ───────────────────────────────────────────────── */}
        <div className="input-area">

          {/* Cart Sticky Footer */}
          {cart && cart.items && cart.items.length > 0 && (
            <div className="cart-sticky-footer">
              <div className="cart-sticky-footer__info">
                <span className="cart-sticky-footer__count">
                  {cart.items.reduce((sum, item) => sum + item.qty, 0)}{' '}
                  {cart.items.reduce((sum, item) => sum + item.qty, 0) === 1 ? 'item' : 'items'}
                </span>
                <span className="cart-sticky-footer__divider">|</span>
                <span className="cart-sticky-footer__total">
                  Total: ₹{cart.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                className="cart-sticky-footer__pay-btn"
                onClick={finalizeCart}
                disabled={isPaying}
              >
                {isPaying ? 'Processing…' : 'Pay Now'}
              </button>
            </div>
          )}

          {/* Address mode banner */}
          {awaitingAddress && (
            <div className="address-banner">
              Enter your delivery address to complete the order
            </div>
          )}

          {/* ── Address collection row (shown only in 2-step address mode) ──────── */}
          {awaitingAddress ? (
            <div className="input-row">
              <input
                ref={inputRef}
                type="text"
                className="chat-input chat-input--address"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 12 MG Road, Bangalore 560001…"
                disabled={isTyping}
                autoComplete="street-address"
                aria-label="Delivery address"
              />
              <VoiceButton
                onTranscript={(t) => { setInputText(t); }}
                disabled={isTyping}
                lastAiMessage={lastAiMessage}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage(inputText)}
                disabled={isTyping || !inputText.trim()}
                aria-label="Send address"
              >
                {isTyping
                  ? <span className="send-spinner" />
                  : <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                }
              </button>
            </div>
          ) : (
            <>
              {/* ── Smart Search Bar ──────────────────────────────────────── */}
              <div className="input-row">
                <SearchBar onSend={sendMessage} disabled={isTyping} />
                <VoiceButton
                  onTranscript={(t) => { sendMessage(t); }}
                  disabled={isTyping}
                  lastAiMessage={lastAiMessage}
                />
                <button
                  className="send-btn"
                  onClick={() => {}}
                  style={{ display: 'none' }}    /* SearchBar has its own Enter key handler */
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>

              {/* ── Quick-reply pills ──────────────────────────────────────── */}
              <div className="quick-chips" role="list" aria-label="Quick order shortcuts">
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip}
                    role="listitem"
                    className="quick-chip"
                    onClick={() => sendMessage(`Buy 1 ${chip}`)}
                    disabled={isTyping}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* ── Category Chips ────────────────────────────────────────── */}
              <CategoryChips
                onCategorySelect={handleCategorySelect}
                disabled={isTyping}
              />
            </>
          )}

        </div>
      </main>
    </div>
  );
}
