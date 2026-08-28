/**
 * Razorpay integration utility
 * - Dynamically loads the Razorpay checkout script
 * - Opens the payment modal
 * - Handles success, failure, and dismiss without native browser dialogs
 */

let scriptLoadPromise = null;

function loadRazorpayScript() {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => { scriptLoadPromise = null; resolve(false); };
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Open Razorpay checkout modal.
 *
 * @param {string}   razorpayOrderId  Razorpay order ID (order_xxx)
 * @param {number}   amount           Amount in INR (rupees, not paise)
 * @param {string}   orderId          Internal MongoDB order ID
 * @param {function} onSuccess        Called with Razorpay response on success
 * @param {function} onRetry          Called with orderId when user wants to retry
 * @param {function} onFailure        Optional — called with error on hard failure
 */
export async function triggerRazorpay(razorpayOrderId, amount, orderId, onSuccess, onRetry, onFailure) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    onFailure?.('Payment service unavailable. Please check your connection.');
    return;
  }

  const user  = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

  if (!keyId || keyId === 'rzp_test_xxxxxx') {
    console.error('[Razorpay] VITE_RAZORPAY_KEY_ID is not set');
    onFailure?.('Payment configuration error. Please contact support.');
    return;
  }

  const rzp = new window.Razorpay({
    key:         keyId,
    amount:      amount * 100,
    currency:    'INR',
    name:        'SnapBuy',
    description: 'AI-powered commerce checkout',
    order_id:    razorpayOrderId,
    handler(response) {
      onSuccess?.(response);
    },
    modal: {
      ondismiss() {
        // Non-blocking — surface to parent via onRetry so UI can offer retry button
        onRetry?.(orderId);
      },
      confirm_close: true,
      escape: false,
    },
    theme: { color: '#2563EB' },
    prefill: {
      name:  user.name  || '',
      email: user.email || '',
    },
    notes: { orderId },
  });

  rzp.on('payment.failed', (response) => {
    console.error('[Razorpay] payment.failed', response.error);
    onRetry?.(orderId);
  });

  rzp.open();
}

export default triggerRazorpay;
