const express  = require('express');
const router   = express.Router();
const Groq     = require('groq-sdk');
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const Order    = require('../models/Order');
const Product  = require('../models/Product');
const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');

// ─── Clients ──────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Auth middleware ───────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Access token required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

// ─── Catalog ───────────────────────────────────────────────────────────────────
const CATALOG_KEYWORDS = ['coffee', 'mouse', 'usb', 'cable', 'notebook', 'lamp', 'desk'];
const CATALOG_DISPLAY  = 'Coffee, Mouse, USB-C Cable, Notebook, Desk Lamp';

// ─── Audit helper (non-fatal) ─────────────────────────────────────────────────
async function audit(userId, action, status, input, output, metadata = {}) {
  try {
    await AuditLog.create({
      userId,
      orderId:   metadata.orderId || null,
      action,
      status,
      input:     String(input  || ''),
      output:    String(output || ''),
      metadata,
      timestamp: new Date(),
    });
  } catch (e) {
    console.error('[AUDIT] write failed (non-fatal):', e.message);
  }
}

// ─── Product matching helper ───────────────────────────────────────────────────
function matchProduct(name, products) {
  const n = (name || '').toLowerCase().trim();
  return products.find(p => {
    const pn = p.name.toLowerCase();
    return pn === n || pn.includes(n) || n.includes(pn);
  });
}

// ─── Finalize order (create DB order + Razorpay order) ────────────────────────
async function finalizeOrder(userId, items, address, addressSource) {
  const products = await Product.find({});
  if (!products.length) throw new Error('Product catalog is unavailable.');

  const orderItems = [];
  const notFound   = [];
  let   total      = 0;

  for (const item of items) {
    const product = matchProduct(item.name, products);
    if (product) {
      const qty = Math.max(1, parseInt(item.qty) || 1);
      orderItems.push({ name: product.name, qty, price: product.price });
      total += product.price * qty;
    } else {
      notFound.push(item.name);
    }
  }

  if (!orderItems.length) {
    throw new Error(`Product(s) not found: "${notFound.join(', ')}". Available: ${CATALOG_DISPLAY}.`);
  }

  const confidence = Math.max(0, 100 - notFound.length * 20);

  const order = new Order({
    userId,
    items:       orderItems,
    totalAmount: total,
    address,
    status:      'PENDING',
    aiLogic: {
      parsedItems:       orderItems,
      addressSource,
      confidence,
      recommendedAction: 'Proceed to checkout',
    },
  });
  await order.save();

  const rzpOrder = await razorpay.orders.create({
    amount:   total * 100,
    currency: 'INR',
    receipt:  order._id.toString(),
    notes:    { orderId: order._id.toString(), userId: String(userId) },
  });

  order.razorpayOrderId = rzpOrder.id;
  order.status          = 'ORDER_CREATED';
  order.updatedAt       = new Date();
  await order.save();

  await audit(userId, 'ORDER_CREATED', 'SUCCESS',
    `Items: ${orderItems.map(i => `${i.qty}x${i.name}`).join(', ')}`,
    `orderId=${order._id} rzp=${rzpOrder.id} total=₹${total}`,
    { orderId: order._id, address, addressSource, total }
  );

  return { order, orderItems, total, razorpayOrderId: rzpOrder.id, confidence };
}

// =============================================================================
// GET /products — public, used by ProductGrid
// =============================================================================
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({}, 'name price image').lean();
    res.json({ success: true, products });
  } catch (err) {
    console.error('[PRODUCTS]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// =============================================================================
// GET /user/profile — authenticated user dashboard data
// =============================================================================
router.get('/user/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const [totalOrders, paidOrders, pendingOrders] = await Promise.all([
      Order.countDocuments({ userId: req.user.userId }),
      Order.find({ userId: req.user.userId, status: 'PAID' }).select('totalAmount').lean(),
      Order.countDocuments({ userId: req.user.userId, status: { $in: ['PENDING', 'ORDER_CREATED', 'RETRY_GENERATED'] } }),
    ]);

    const totalSpent = paidOrders.reduce((s, o) => s + o.totalAmount, 0);

    res.json({
      success: true,
      user: {
        id:             user._id,
        name:           user.name,
        email:          user.email,
        defaultAddress: user.defaultAddress || '',
        memberSince:    user.createdAt,
      },
      stats: { totalOrders, totalSpent, pendingOrders, paidCount: paidOrders.length },
    });
  } catch (err) {
    console.error('[PROFILE]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// =============================================================================
// PATCH /user/address — save default delivery address
// =============================================================================
router.patch('/user/address', auth, async (req, res) => {
  try {
    const { address } = req.body;
    if (!address?.trim()) {
      return res.status(400).json({ success: false, error: 'Address is required' });
    }
    await User.findByIdAndUpdate(req.user.userId, { defaultAddress: address.trim() });
    await audit(req.user.userId, 'ADDRESS_SAVED', 'SUCCESS', address, 'Profile address updated', {});
    res.json({ success: true, message: 'Address saved to profile' });
  } catch (err) {
    console.error('[ADDRESS]', err.message);
    res.status(500).json({ success: false, error: 'Failed to save address' });
  }
});

// =============================================================================
// GET /cart — fetch active cart
// =============================================================================
router.get('/cart', auth, async (req, res) => {
  try {
    const cart = await Order.findOne({ userId: req.user.userId, status: 'CART' }).lean();
    res.json({ success: true, cart });
  } catch (err) {
    console.error('[GET CART]', err.message);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// =============================================================================
// POST /cart/finalize — turn cart into an order and generate Razorpay order
// =============================================================================
router.post('/cart/finalize', auth, async (req, res) => {
  try {
    const cart = await Order.findOne({ userId: req.user.userId, status: 'CART' });
    if (!cart) return res.status(400).json({ error: 'No active cart found' });

    let address = cart.address;
    if (!address || address === 'Address Pending' || address === 'NOT_PROVIDED') {
      const user = await User.findById(req.user.userId).select('defaultAddress').lean();
      address = user?.defaultAddress?.trim();
    }

    if (!address) {
      return res.status(400).json({ addressRequired: true, error: 'Delivery address is required.' });
    }

    cart.address = address;
    cart.status = 'ORDER_CREATED';
    cart.updatedAt = new Date();

    const rzpOrder = await razorpay.orders.create({
      amount: cart.totalAmount * 100,
      currency: 'INR',
      receipt: cart._id.toString(),
      notes: { orderId: cart._id.toString(), userId: String(req.user.userId) },
    });

    cart.razorpayOrderId = rzpOrder.id;
    await cart.save();

    await audit(req.user.userId, 'ORDER_CREATED', 'SUCCESS',
      `Finalized cart: ${cart.items.map(i => `${i.qty}x${i.name}`).join(', ')}`,
      `orderId=${cart._id} rzp=${rzpOrder.id} total=₹${cart.totalAmount}`,
      { orderId: cart._id, address, total: cart.totalAmount }
    );

    res.json({
      success: true,
      orderId: cart._id.toString(),
      razorpayOrderId: rzpOrder.id,
      totalAmount: cart.totalAmount,
      address: cart.address,
      items: cart.items,
    });
  } catch (err) {
    console.error('[FINALIZE CART]', err.message);
    res.status(500).json({ error: 'Failed to finalize cart' });
  }
});

// =============================================================================
// POST /chat — main AI checkout flow
// =============================================================================
router.post('/chat', auth, async (req, res) => {
  const { message, isAddress, pendingItems } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  const userId  = req.user.userId;
  const trimmed = message.trim();
  console.log(`[CHAT] userId=${userId} msg="${trimmed}" isAddress=${isAddress}`);

  await audit(userId, 'CHAT_INPUT', 'INFO', trimmed, '', {});

  // ── Case A: 2-step flow — user just provided address ─────────────────────
  if (isAddress && Array.isArray(pendingItems) && pendingItems.length > 0) {
    try {
      let cart = await Order.findOne({ userId, status: 'CART' });
      if (!cart) {
        cart = new Order({
          userId,
          items: pendingItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
          totalAmount: pendingItems.reduce((sum, i) => sum + (i.price * i.qty), 0),
          status: 'CART',
        });
      }
      cart.address = trimmed;
      cart.status = 'ORDER_CREATED';
      cart.updatedAt = new Date();

      const rzpOrder = await razorpay.orders.create({
        amount: cart.totalAmount * 100,
        currency: 'INR',
        receipt: cart._id.toString(),
        notes: { orderId: cart._id.toString(), userId: String(userId) },
      });

      cart.razorpayOrderId = rzpOrder.id;
      await cart.save();

      // Save to user profile
      await User.findByIdAndUpdate(userId, { defaultAddress: trimmed });
      await audit(userId, 'ADDRESS_SAVED', 'SUCCESS', trimmed, 'Saved from order', { orderId: cart._id });
      await audit(userId, 'ORDER_CREATED', 'SUCCESS', `Finalized cart via address input: ${cart.items.map(i => `${i.qty}x${i.name}`).join(', ')}`, `orderId=${cart._id} rzp=${rzpOrder.id}`, { orderId: cart._id, address: trimmed });

      return res.json({
        success:         true,
        message:         'Address saved for future orders. Your order is ready.',
        parsed:          { items: cart.items, address: trimmed },
        totalAmount:     cart.totalAmount,
        razorpayOrderId: rzpOrder.id,
        amountInPaise:   cart.totalAmount * 100,
        orderId:         cart._id.toString(),
        itemsSummary:    cart.items.map(i => `${i.qty}× ${i.name}`).join(', '),
        cart: null,
      });
    } catch (err) {
      console.error('[CHAT/addr]', err.message);
      return res.json({ success: false, message: err.message });
    }
  }

  const msgLower = trimmed.toLowerCase();

  // Clear Cart
  if (msgLower.includes('clear cart') || msgLower.includes('empty cart')) {
    await Order.findOneAndDelete({ userId, status: 'CART' });
    await audit(userId, 'CART_CLEARED', 'SUCCESS', trimmed, 'Cart cleared', {});
    return res.json({
      success: true,
      message: 'Cart cleared successfully.',
      cart: null,
    });
  }

  // Remove/Delete item from Cart
  if (msgLower.startsWith('remove ') || msgLower.startsWith('delete ') || msgLower.startsWith('discard ')) {
    const itemToRemove = trimmed.replace(/^(remove|delete|discard)\s+/i, '').trim();
    const cart = await Order.findOne({ userId, status: 'CART' });
    if (!cart) {
      return res.json({ success: false, message: 'Your cart is already empty.' });
    }

    const initialCount = cart.items.length;
    cart.items = cart.items.filter(item => {
      const name = item.name.toLowerCase();
      const target = itemToRemove.toLowerCase();
      return !name.includes(target) && !target.includes(name);
    });

    if (cart.items.length === initialCount) {
      return res.json({ success: false, message: `Could not find "${itemToRemove}" in your cart.` });
    }

    if (cart.items.length === 0) {
      await Order.findByIdAndDelete(cart._id);
      await audit(userId, 'CART_CLEARED', 'SUCCESS', trimmed, 'Cart cleared because all items removed', {});
      return res.json({ success: true, message: `Removed ${itemToRemove} from cart. Your cart is now empty.`, cart: null });
    }

    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    cart.updatedAt = new Date();
    await cart.save();

    await audit(userId, 'CART_ITEM_REMOVED', 'SUCCESS', trimmed, `Removed ${itemToRemove}. New total: ₹${cart.totalAmount}`, { cartId: cart._id });

    return res.json({
      success: true,
      message: `Removed ${itemToRemove} from your cart.`,
      cart: {
        items: cart.items,
        totalAmount: cart.totalAmount,
      }
    });
  }

  // ── Find matching products in database ─────────────────────────────────────
  let matches = [];
  try {
    matches = await Product.find(
      { $text: { $search: trimmed } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(5)
    .lean();
  } catch (err) {
    console.warn('[SEARCH] Text search failed, falling back to regex:', err.message);
  }

  if (!matches || matches.length === 0) {
    const words = trimmed.split(/\s+/).filter(w => w.length > 2 && !['add', 'buy', 'get', 'with', 'from', 'your', 'need'].includes(w.toLowerCase()));
    if (words.length > 0) {
      const regexQueries = words.map(w => ({ name: { $regex: w, $options: 'i' } }));
      matches = await Product.find({ $or: regexQueries }).limit(5).lean();
    }
  }

  // Fallback to any 5 popular products if still no matches
  if (!matches || matches.length === 0) {
    matches = await Product.find({}).limit(5).lean();
  }

  // ── Groq intent parsing ────────────────────────────────────────────────────
  let groqResponse = '';
  try {
    const systemPrompt = `You are a shopping checkout bot. Extract product names, quantities, and delivery address from the user message.
RULES:
1. Return ONLY valid JSON. No markdown, no explanations, no code fences.
2. Valid products you can select from: ${matches.map(p => p.name).join(', ')}.
3. qty defaults to 1 if not specified.
4. If address is in the message, include it. Otherwise set address to "NOT_PROVIDED".
5. Output EXACTLY: {"items":[{"name":"Product Name","qty":2}],"address":"Tadipatri Station"}`;

    const stream = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: trimmed },
      ],
      model:       'openai/gpt-oss-20b',
      temperature: 0,
      max_tokens:  256,
      stream:      true,
    });
    for await (const chunk of stream) {
      groqResponse += chunk.choices[0]?.delta?.content || '';
    }
    console.log('[CHAT] Groq:', groqResponse);
  } catch (groqErr) {
    console.error('[CHAT] GROQ ERROR:', groqErr.message);
    return res.json({ success: false, message: 'AI service unavailable. Please try again.' });
  }

  await audit(userId, 'CHAT_OUTPUT', 'INFO', trimmed, groqResponse, {});

  // Parse JSON
  let parsed;
  try {
    const cleaned = groqResponse.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[CHAT] JSON parse fail:', groqResponse);
    return res.json({ success: false, message: "I couldn't understand your order. Try: \"Add 2 Coffee\"." });
  }

  if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) {
    return res.json({ success: false, message: 'No products detected. Try: "Add 2 Coffee".' });
  }

  // ── Cart management ────────────────────────────────────────────────────────
  let cart = await Order.findOne({ userId, status: 'CART' });
  const userDoc = await User.findById(userId).select('defaultAddress').lean();
  const defaultAddr = userDoc?.defaultAddress?.trim() || 'NOT_PROVIDED';
  const hasAddressInMessage = parsed.address && parsed.address !== 'NOT_PROVIDED' && parsed.address.trim();
  const cartAddress = hasAddressInMessage ? parsed.address : (cart?.address || defaultAddr);

  if (!cart) {
    cart = new Order({
      userId,
      items: [],
      totalAmount: 0,
      address: cartAddress === 'NOT_PROVIDED' ? 'Address Pending' : cartAddress,
      status: 'CART',
    });
  } else if (hasAddressInMessage) {
    cart.address = parsed.address;
  }

  const allProducts = await Product.find({});
  const resolvedItems = [];
  const notFound = [];

  for (const item of parsed.items) {
    const product = matchProduct(item.name, matches.concat(allProducts));
    if (product) {
      const qty = Math.max(1, parseInt(item.qty) || 1);
      const existing = cart.items.find(i => i.name.toLowerCase() === product.name.toLowerCase());
      if (existing) {
        existing.qty += qty;
      } else {
        cart.items.push({ name: product.name, qty, price: product.price });
      }
      resolvedItems.push({ name: product.name, qty, price: product.price });
    } else {
      notFound.push(item.name);
    }
  }

  if (cart.items.length === 0) {
    return res.json({ success: false, message: 'No valid products detected. Try: "Add 2 Coffee".' });
  }

  cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  cart.updatedAt = new Date();
  await cart.save();

  await audit(userId, 'CART_UPDATED', 'SUCCESS', trimmed, `Cart updated, total items: ${cart.items.length}`, { cartId: cart._id });

  const total = cart.totalAmount;
  const addressMessage = (cart.address && cart.address !== 'Address Pending' && cart.address !== 'NOT_PROVIDED')
    ? ` Delivering to ${cart.address}.`
    : '';

  const finalMessage = addressMessage
    ? `Found your items.${addressMessage} Total: ₹${total}.`
    : `Found your items. Total: ₹${total}. Please provide your delivery address.`;

  return res.json({
    success: true,
    message: finalMessage,
    cart: {
      items: cart.items,
      totalAmount: cart.totalAmount,
      address: cart.address,
    },
    parsed: { items: cart.items, address: cart.address },
    totalAmount: cart.totalAmount,
    aiLogic: {
      parsedItems: cart.items,
      addressSource: hasAddressInMessage ? 'message' : (userDoc?.defaultAddress ? 'profile' : 'not_provided'),
      confidence: 100,
      recommendedAction: 'Proceed to payment',
    }
  });
});

// =============================================================================
// GET /products/search?q=rice&limit=5
// Public-ish (still needs auth so we can audit) — autocomplete search
// =============================================================================
router.get('/products/search', auth, async (req, res) => {
  try {
    const q         = (req.query.q || '').trim();
    const limit     = Math.min(parseInt(req.query.limit) || 5, 20);
    const byCategory = req.query.category === 'true';

    if (!q) {
      return res.json({ success: true, products: [] });
    }

    let products;

    if (byCategory) {
      // Exact category match, sorted by price ascending
      products = await Product.find(
        { category: { $regex: q, $options: 'i' } },
        'name price category'
      ).sort({ price: 1 }).limit(limit).lean();
    } else {
      // Try MongoDB text search first (fastest)
      try {
        products = await Product.find(
          { $text: { $search: q } },
          { score: { $meta: 'textScore' }, name: 1, price: 1, category: 1 }
        ).sort({ score: { $meta: 'textScore' } }).limit(limit).lean();
      } catch {
        products = [];
      }

      // Fallback: regex on name field
      if (!products || products.length === 0) {
        products = await Product.find(
          { name: { $regex: q, $options: 'i' } },
          'name price category'
        ).limit(limit).lean();
      }
    }

    res.json({
      success: true,
      products: (products || []).map(p => ({
        id:       p._id,
        name:     p.name,
        price:    p.price,
        category: p.category,
      })),
    });
  } catch (err) {
    console.error('[PRODUCT SEARCH]', err.message);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});



// =============================================================================
// POST /verify-payment
// =============================================================================
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      await audit(req.user.userId, 'PAYMENT_CAPTURED', 'FAILURE', razorpay_payment_id, 'Signature mismatch', {});
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id }) || (req.body.orderId ? await Order.findById(req.body.orderId) : null);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status === 'PAID') {
      return res.json({
        success: true,
        message: 'Payment already recorded',
        duplicate: true,
        receipt: {
          orderId:           order._id.toString(),
          razorpayPaymentId: order.razorpayPaymentId || razorpay_payment_id,
          items:             order.items,
          totalAmount:       order.totalAmount,
          address:           order.address,
          paidAt:            order.updatedAt ? order.updatedAt.toISOString() : new Date().toISOString(),
        }
      });
    }

    order.razorpayPaymentId = razorpay_payment_id;
    order.status            = 'PAID';
    order.updatedAt         = new Date();
    await order.save();

    await audit(order.userId, 'PAYMENT_CAPTURED', 'SUCCESS',
      razorpay_payment_id, `Order ${order._id} paid ₹${order.totalAmount}`,
      { orderId: order._id, total: order.totalAmount }
    );

    res.json({
      success: true,
      message: 'Payment verified successfully',
      receipt: {
        orderId:           order._id.toString(),
        razorpayPaymentId: razorpay_payment_id,
        items:             order.items,
        totalAmount:       order.totalAmount,
        address:           order.address,
        paidAt:            new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[VERIFY]', err.message);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// =============================================================================
// POST /retry-payment
// =============================================================================
router.post('/retry-payment', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Unauthorized' });

    if ((order.retryCount || 0) >= 3) {
      return res.status(400).json({
        error: 'Maximum retry attempts (3) reached. Please start a new order.',
        maxRetriesReached: true,
      });
    }

    if (order.status === 'PAID') {
      return res.status(400).json({ error: 'This order is already paid.' });
    }

    const rzpOrder = await razorpay.orders.create({
      amount:   order.totalAmount * 100,
      currency: 'INR',
      receipt:  `retry${(order.retryCount || 0) + 1}_${order._id}`,
      notes:    { orderId: order._id.toString(), userId: req.user.userId, retry: 'true' },
    });

    order.razorpayOrderId = rzpOrder.id;
    order.status          = 'RETRY_GENERATED';
    order.retryCount      = (order.retryCount || 0) + 1;
    order.updatedAt       = new Date();
    await order.save();

    await audit(order.userId, 'PAYMENT_RETRY', 'INFO',
      `Retry #${order.retryCount}`, `New rzpOrderId: ${rzpOrder.id}`,
      { orderId: order._id, retryCount: order.retryCount }
    );

    res.json({
      razorpayOrderId:  rzpOrder.id,
      amount:           order.totalAmount,
      currency:         'INR',
      keyId:            process.env.RAZORPAY_KEY_ID,
      retryCount:       order.retryCount,
      retriesRemaining: 3 - order.retryCount,
    });
  } catch (err) {
    console.error('[RETRY]', err.message);
    res.status(500).json({ error: 'Failed to generate retry payment' });
  }
});

// =============================================================================
// GET /orders/me
// =============================================================================
router.get('/orders/me', auth, async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.userId,
      status: { $nin: ['CART'] },          // exclude in-progress carts
    }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, orders });
  } catch (err) {
    console.error('[ORDERS]', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// =============================================================================
// POST /webhook — Razorpay webhook (raw body required)
// =============================================================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig  = req.headers['x-razorpay-signature'];
    const body = req.rawBody || req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (sig !== expected) return res.status(400).json({ error: 'Invalid signature' });

    const event = JSON.parse(body);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const order = await Order.findOne({ razorpayOrderId: payment.order_id }) || await Order.findById(payment.notes?.orderId);
      if (order && order.status !== 'PAID') {
        order.razorpayPaymentId = payment.id;
        order.status            = 'PAID';
        order.updatedAt         = new Date();
        await order.save();
        await audit(order.userId, 'PAYMENT_CAPTURED', 'SUCCESS', payment.id, 'Webhook', { orderId: order._id });
      }
    }

    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const order = await Order.findOne({ razorpayOrderId: payment.order_id }) || await Order.findById(payment.notes?.orderId);
      if (order) {
        order.status    = 'FAILED';
        order.updatedAt = new Date();
        await order.save();
        await audit(order.userId, 'PAYMENT_FAILED', 'FAILURE', payment.id,
          payment.error_description || 'failed', { orderId: order._id });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[WEBHOOK]', err.message);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// =============================================================================
// POST /create-razorpay-order (alternative endpoint)
// =============================================================================
router.post('/create-razorpay-order', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Unauthorized' });

    const rzpOrder = await razorpay.orders.create({
      amount:   order.totalAmount * 100,
      currency: 'INR',
      receipt:  order._id.toString(),
      notes:    { orderId: order._id.toString(), userId: req.user.userId },
    });

    order.razorpayOrderId = rzpOrder.id;
    order.status          = 'ORDER_CREATED';
    await order.save();

    res.json({
      razorpayOrderId: rzpOrder.id,
      amount:          order.totalAmount,
      currency:        'INR',
      keyId:           process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[CREATE-RZP]', err.message);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

module.exports = router;
