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

// ─── Audit helper (non-fatal) ─────────────────────────────────────────────────
async function audit(userId, action, status, input, output, metadata = {}) {
  try {
    await AuditLog.create({
      userId,
      orderId:   metadata.orderId || null,
      action,
      status,
      input:     String(input  || '').slice(0, 1000),
      output:    String(output || '').slice(0, 1000),
      metadata,
      timestamp: new Date(),
    });
  } catch (e) {
    console.error('[AUDIT] write failed (non-fatal):', e.message);
  }
}

// ─── Product matching helper ───────────────────────────────────────────────────
// Scores a candidate name against a query; returns 0 if no match.
function scoreMatch(query, productName) {
  const q  = query.toLowerCase().trim();
  const pn = productName.toLowerCase().trim();
  if (pn === q)           return 100;
  if (pn.startsWith(q))  return 90;
  if (pn.includes(q))    return 80;
  if (q.includes(pn))    return 70;

  // Token overlap scoring
  const qTokens  = q.split(/\s+/).filter(t => t.length > 1);
  const pTokens  = pn.split(/[\s\(\)\-]+/).filter(t => t.length > 1);
  let overlap = 0;
  for (const qt of qTokens) {
    if (pTokens.some(pt => pt.includes(qt) || qt.includes(pt))) overlap++;
  }
  if (overlap > 0) return Math.round((overlap / Math.max(qTokens.length, 1)) * 60);
  return 0;
}

function matchProduct(name, products) {
  let best = null, bestScore = 0;
  for (const p of products) {
    const s = scoreMatch(name, p.name);
    if (s > bestScore) { bestScore = s; best = p; }
  }
  return bestScore >= 40 ? best : null;
}

// ─── Deterministic NLP fallback (regex-based) ─────────────────────────────────
// Used when AI fails or returns empty. Handles patterns like:
//   "Add 2 Coffee", "Buy Coffee", "I want 3 Coffee", "Give me 2 Coffee"
function deterministicParse(message) {
  const msg = message.toLowerCase().trim();

  // Number word map
  const numWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    a: 1, an: 1,
  };

  // Strip intent verbs from start
  const stripped = msg
    .replace(/^(add|buy|order|i want|give me|can i get|i need|i'd like|get me|please add|please buy|could i get|bring me|i'll take|make it|change.*?to|update.*?to)\s+/i, '')
    .replace(/\s+(to my cart|in my cart|please|now)$/i, '')
    .trim();

  // Pattern: "2 Coffee", "two Coffee", "Coffee x 2", "3x Coffee"
  let qty = 1;
  let productName = stripped;

  // Match leading number or word
  const leadNum = stripped.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(.+)$/i);
  if (leadNum) {
    qty = parseInt(leadNum[1]) || numWords[leadNum[1].toLowerCase()] || 1;
    productName = leadNum[2].trim();
  }

  // Match trailing number: "Coffee 2" or "Coffee x 2"
  const trailNum = stripped.match(/^(.+?)\s+x?\s*(\d+)$/i);
  if (trailNum && !leadNum) {
    productName = trailNum[1].trim();
    qty = parseInt(trailNum[2]) || 1;
  }

  // Strip plural s at end if needed
  if (productName.endsWith('s') && productName.length > 3) {
    productName = productName.slice(0, -1);
  }

  return [{ name: productName, qty: Math.max(1, qty) }];
}

// ─── Parse quantity change commands ───────────────────────────────────────────
// "Change Coffee to 5", "Make Coffee 3", "Update Coffee quantity to 4"
function parseQtyChange(msg) {
  const m = msg.match(/(?:change|update|make|set)\s+(.+?)\s+(?:to|quantity to|qty to)\s+(\d+)/i)
         || msg.match(/(?:change|update|make|set)\s+(.+?)\s+(\d+)/i);
  if (!m) return null;
  return { productName: m[1].trim(), newQty: parseInt(m[2]) };
}

// ─── Parse remove commands ─────────────────────────────────────────────────────
function parseRemoveCommand(msg) {
  const m = msg.match(/^(remove|delete|discard|drop|take out)\s+(.+)$/i);
  if (!m) return null;
  return m[2].trim();
}

// ─── Groq AI intent parser with deterministic fallback ────────────────────────
async function parseIntent(message, catalogProducts) {
  const catalogSample = catalogProducts
    .slice(0, 30)
    .map(p => p.name)
    .join(', ');

  const systemPrompt = `You are a shopping assistant. Extract product names and quantities from user messages.
Available products (use exact names from this list when possible): ${catalogSample}
Rules:
- Return ONLY valid JSON. No markdown, no explanation, no code fences.
- Match product names to the available list. Prefer exact or closest match.
- qty defaults to 1 if not mentioned. Number words (two=2, three=3) should be converted.
- If no recognizable product, return empty items array.
- For address in message, include it. Otherwise "NOT_PROVIDED".
Output format: {"items":[{"name":"exact product name","qty":2}],"address":"NOT_PROVIDED"}`;

  let groqResult = null;
  try {
    const resp = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: message },
      ],
      model:       'qwen/qwen3.8-27b',
      temperature: 0,
      max_tokens:  256,
      stream:      false,
    });
    const raw = resp.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    if (cleaned) {
      groqResult = JSON.parse(cleaned);
    }
  } catch (e) {
    console.warn('[INTENT] Groq parse failed, using fallback:', e.message.slice(0, 80));
  }

  // Validate groqResult
  if (groqResult && Array.isArray(groqResult.items) && groqResult.items.length > 0) {
    return {
      items:   groqResult.items,
      address: groqResult.address || 'NOT_PROVIDED',
      source:  'ai',
    };
  }

  // Deterministic fallback
  console.log('[INTENT] Using deterministic fallback for:', message);
  const fallbackItems = deterministicParse(message);
  return {
    items:   fallbackItems,
    address: 'NOT_PROVIDED',
    source:  'fallback',
  };
}

// =============================================================================
// GET /products — public product catalog
// =============================================================================
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({}, 'name price image category').lean();
    res.json({ success: true, products });
  } catch (err) {
    console.error('[PRODUCTS]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// =============================================================================
// GET /products/search?q=coffee&limit=5&category=true
// =============================================================================
router.get('/products/search', auth, async (req, res) => {
  try {
    const q         = (req.query.q || '').trim();
    const limit     = Math.min(parseInt(req.query.limit) || 5, 20);
    const byCategory = req.query.category === 'true';

    if (!q) return res.json({ success: true, products: [] });

    let products;
    if (byCategory) {
      products = await Product.find(
        { category: { $regex: q, $options: 'i' } },
        'name price category'
      ).sort({ price: 1 }).limit(limit).lean();
    } else {
      try {
        products = await Product.find(
          { $text: { $search: q } },
          { score: { $meta: 'textScore' }, name: 1, price: 1, category: 1 }
        ).sort({ score: { $meta: 'textScore' } }).limit(limit).lean();
      } catch {
        products = [];
      }
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
// GET /user/profile
// =============================================================================
router.get('/user/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const [totalOrders, paidOrders, pendingOrders] = await Promise.all([
      Order.countDocuments({ userId: req.user.userId, status: { $nin: ['CART'] } }),
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
// PATCH /user/address
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
// GET /cart — fetch active CART
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
// POST /cart/add — add a single product to cart (from ProductGrid "Add" button)
// =============================================================================
router.post('/cart/add', auth, async (req, res) => {
  try {
    const { productName, qty = 1 } = req.body;
    if (!productName?.trim()) {
      return res.status(400).json({ success: false, error: 'Product name required' });
    }

    const allProducts = await Product.find({}).lean();
    const product = matchProduct(productName, allProducts);
    if (!product) {
      const suggestions = allProducts.slice(0, 5).map(p => p.name);
      return res.json({
        success: false,
        isInvalid: true,
        message: `"${productName}" is not available. Here are some products you might like:`,
        suggestions,
      });
    }

    const safeQty = Math.max(1, parseInt(qty) || 1);
    const userId  = req.user.userId;

    let cart = await Order.findOne({ userId, status: 'CART' });
    const userDoc = await User.findById(userId).select('defaultAddress').lean();
    const savedAddr = userDoc?.defaultAddress?.trim() || '';

    if (!cart) {
      cart = new Order({
        userId,
        items: [],
        totalAmount: 0,
        address: savedAddr || 'Address Pending',
        status: 'CART',
      });
    }

    const existing = cart.items.find(i => i.name.toLowerCase() === product.name.toLowerCase());
    if (existing) {
      existing.qty += safeQty;
    } else {
      cart.items.push({ name: product.name, qty: safeQty, price: product.price });
    }

    cart.totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    cart.updatedAt   = new Date();
    await cart.save();

    await audit(userId, 'CART_UPDATED', 'SUCCESS',
      `Added ${safeQty}x ${product.name}`,
      `Cart total: ₹${cart.totalAmount}`,
      { cartId: cart._id }
    );

    res.json({
      success:     true,
      message:     `Added ${safeQty}× ${product.name} to cart.`,
      cart:        { items: cart.items, totalAmount: cart.totalAmount, address: cart.address },
    });
  } catch (err) {
    console.error('[CART ADD]', err.message);
    res.status(500).json({ success: false, error: 'Failed to add to cart' });
  }
});

// =============================================================================
// POST /cart/finalize — turn CART into ORDER_CREATED + Razorpay order
// Idempotent: if already ORDER_CREATED with same items, reuse it.
// =============================================================================
router.post('/cart/finalize', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cart   = await Order.findOne({ userId, status: 'CART' });
    if (!cart) return res.status(400).json({ error: 'No active cart found' });

    // Resolve address
    let address = (cart.address && cart.address !== 'Address Pending') ? cart.address : '';
    if (!address) {
      const user = await User.findById(userId).select('defaultAddress').lean();
      address = user?.defaultAddress?.trim() || '';
    }

    if (!address) {
      return res.status(400).json({
        addressRequired: true,
        error: 'Delivery address is required.',
        pendingItems: cart.items,
      });
    }

    // Idempotency check: if ORDER_CREATED already exists for same user with same items total
    const existingOrder = await Order.findOne({
      userId,
      status: 'ORDER_CREATED',
      totalAmount: cart.totalAmount,
    }).sort({ createdAt: -1 });

    if (existingOrder && existingOrder.razorpayOrderId) {
      // Reuse the existing Razorpay order to prevent duplicate charges
      await Order.findByIdAndDelete(cart._id);
      return res.json({
        success:         true,
        orderId:         existingOrder._id.toString(),
        razorpayOrderId: existingOrder.razorpayOrderId,
        totalAmount:     existingOrder.totalAmount,
        address:         existingOrder.address,
        items:           existingOrder.items,
        reused:          true,
      });
    }

    cart.address   = address;
    cart.status    = 'ORDER_CREATED';
    cart.updatedAt = new Date();

    const rzpOrder = await razorpay.orders.create({
      amount:   cart.totalAmount * 100,
      currency: 'INR',
      receipt:  cart._id.toString().slice(-12),
      notes:    { orderId: cart._id.toString(), userId: String(userId) },
    });

    cart.razorpayOrderId = rzpOrder.id;
    await cart.save();

    await audit(userId, 'ORDER_CREATED', 'SUCCESS',
      `Finalized: ${cart.items.map(i => `${i.qty}x${i.name}`).join(', ')}`,
      `orderId=${cart._id} rzp=${rzpOrder.id} total=₹${cart.totalAmount}`,
      { orderId: cart._id, address, total: cart.totalAmount }
    );

    res.json({
      success:         true,
      orderId:         cart._id.toString(),
      razorpayOrderId: rzpOrder.id,
      totalAmount:     cart.totalAmount,
      address:         cart.address,
      items:           cart.items,
    });
  } catch (err) {
    console.error('[FINALIZE CART]', err.message);
    res.status(500).json({ error: 'Failed to finalize cart' });
  }
});

// =============================================================================
// POST /chat — main AI shopping assistant
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

  // ── Case A: Address provided for 2-step flow ─────────────────────────────
  if (isAddress && Array.isArray(pendingItems) && pendingItems.length > 0) {
    try {
      // Update or create cart with the address, then finalize
      let cart = await Order.findOne({ userId, status: 'CART' });
      if (!cart) {
        cart = new Order({
          userId,
          items:       pendingItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
          totalAmount: pendingItems.reduce((s, i) => s + i.price * i.qty, 0),
          status:      'CART',
        });
      }
      cart.address   = trimmed;
      cart.status    = 'ORDER_CREATED';
      cart.updatedAt = new Date();

      const rzpOrder = await razorpay.orders.create({
        amount:   cart.totalAmount * 100,
        currency: 'INR',
        receipt:  cart._id.toString().slice(-12),
        notes:    { orderId: cart._id.toString(), userId: String(userId) },
      });
      cart.razorpayOrderId = rzpOrder.id;
      await cart.save();

      // Save address to profile for future auto-fill
      await User.findByIdAndUpdate(userId, { defaultAddress: trimmed });
      await audit(userId, 'ADDRESS_SAVED', 'SUCCESS', trimmed, 'Saved from order', { orderId: cart._id });

      return res.json({
        success:         true,
        message:         `Address saved. Your order is ready.`,
        parsed:          { items: cart.items, address: trimmed },
        totalAmount:     cart.totalAmount,
        razorpayOrderId: rzpOrder.id,
        amountInPaise:   cart.totalAmount * 100,
        orderId:         cart._id.toString(),
        itemsSummary:    cart.items.map(i => `${i.qty}× ${i.name}`).join(', '),
        cart:            null,
        aiLogic: {
          parsedItems:       cart.items,
          addressSource:     'message',
          confidence:        100,
          recommendedAction: 'Proceed to payment',
        },
      });
    } catch (err) {
      console.error('[CHAT/addr]', err.message);
      return res.json({ success: false, message: 'Failed to process address. Please try again.' });
    }
  }

  const msgLower = trimmed.toLowerCase();

  // ── Clear cart ────────────────────────────────────────────────────────────
  if (msgLower.includes('clear cart') || msgLower.includes('empty cart') || msgLower.includes('reset cart')) {
    await Order.findOneAndDelete({ userId, status: 'CART' });
    await audit(userId, 'CART_CLEARED', 'SUCCESS', trimmed, 'Cart cleared', {});
    return res.json({ success: true, message: 'Cart cleared.', cart: null });
  }

  // ── Remove item from cart ────────────────────────────────────────────────
  const removeTarget = parseRemoveCommand(trimmed);
  if (removeTarget) {
    const cart = await Order.findOne({ userId, status: 'CART' });
    if (!cart) {
      return res.json({ success: false, message: 'Your cart is already empty.' });
    }
    const allProducts = await Product.find({}).lean();
    const matchedProduct = matchProduct(removeTarget, allProducts);
    const searchTerm = matchedProduct ? matchedProduct.name.toLowerCase() : removeTarget.toLowerCase();

    const before = cart.items.length;
    cart.items = cart.items.filter(item => !item.name.toLowerCase().includes(searchTerm) && !searchTerm.includes(item.name.toLowerCase().split(' ')[0]));

    if (cart.items.length === before) {
      return res.json({ success: false, message: `"${removeTarget}" was not found in your cart.` });
    }

    if (cart.items.length === 0) {
      await Order.findByIdAndDelete(cart._id);
      await audit(userId, 'CART_CLEARED', 'SUCCESS', trimmed, 'Cart empty after remove', {});
      return res.json({ success: true, message: `Removed ${removeTarget} from cart. Cart is now empty.`, cart: null });
    }

    cart.totalAmount = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
    cart.updatedAt   = new Date();
    await cart.save();
    await audit(userId, 'CART_ITEM_REMOVED', 'SUCCESS', trimmed, `Removed. New total: ₹${cart.totalAmount}`, { cartId: cart._id });

    return res.json({
      success: true,
      message: `Removed ${removeTarget} from your cart.`,
      cart: { items: cart.items, totalAmount: cart.totalAmount, address: cart.address },
    });
  }

  // ── Change quantity ───────────────────────────────────────────────────────
  const qtyChange = parseQtyChange(trimmed);
  if (qtyChange) {
    const cart = await Order.findOne({ userId, status: 'CART' });
    if (!cart) {
      return res.json({ success: false, message: 'No active cart to edit.' });
    }
    const allProducts = await Product.find({}).lean();
    const matched = matchProduct(qtyChange.productName, allProducts);
    const searchTerm = matched ? matched.name.toLowerCase() : qtyChange.productName.toLowerCase();

    const item = cart.items.find(i => i.name.toLowerCase().includes(searchTerm) || searchTerm.includes(i.name.toLowerCase().split(' ')[0]));
    if (!item) {
      return res.json({ success: false, message: `"${qtyChange.productName}" is not in your cart.` });
    }

    item.qty = Math.max(1, qtyChange.newQty);
    cart.totalAmount = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
    cart.updatedAt   = new Date();
    await cart.save();
    await audit(userId, 'ORDER_EDITED', 'SUCCESS', trimmed, `Updated qty. New total: ₹${cart.totalAmount}`, { cartId: cart._id });

    return res.json({
      success: true,
      message: `Updated ${item.name} quantity to ${item.qty}. Cart total: ₹${cart.totalAmount.toLocaleString('en-IN')}.`,
      cart: { items: cart.items, totalAmount: cart.totalAmount, address: cart.address },
    });
  }

  // ── Fetch user's saved address ────────────────────────────────────────────
  const userDoc   = await User.findById(userId).select('defaultAddress').lean();
  const savedAddr = userDoc?.defaultAddress?.trim() || '';

  // ── Find candidate products for AI context (text search) ─────────────────
  let searchMatches = [];
  try {
    searchMatches = await Product.find(
      { $text: { $search: trimmed } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(8).lean();
  } catch {
    // text search may fail if no index — use regex fallback
  }

  const allProducts = await Product.find({}).lean();

  // ── AI intent parsing with fallback ──────────────────────────────────────
  const candidates = searchMatches.length > 0
    ? [...searchMatches, ...allProducts].slice(0, 40)
    : allProducts;

  const intent = await parseIntent(trimmed, candidates);
  console.log(`[CHAT] Intent(${intent.source}):`, JSON.stringify(intent.items));

  await audit(userId, 'INTENT_PARSED', 'INFO', trimmed, JSON.stringify(intent), { source: intent.source });

  if (!intent.items || intent.items.length === 0) {
    // No products detected — return helpful suggestions
    const popularProducts = await Product.find({}).limit(5).lean();
    const suggestions = popularProducts.map(p => p.name);
    await audit(userId, 'CHAT_OUTPUT', 'INFO', trimmed, 'No products detected', {});
    return res.json({
      success:     false,
      isInvalid:   true,
      message:     `I couldn't find a product matching your request. Here are some popular items you can order:`,
      suggestions,
    });
  }

  // ── Resolve products from intent ──────────────────────────────────────────
  const resolvedItems = [];
  const notFound      = [];

  for (const item of intent.items) {
    const product = matchProduct(item.name, allProducts);
    if (product) {
      resolvedItems.push({
        name:  product.name,
        qty:   Math.max(1, parseInt(item.qty) || 1),
        price: product.price,
      });
    } else {
      notFound.push(item.name);
    }
  }

  await audit(userId, 'PRODUCT_MATCHED', resolvedItems.length > 0 ? 'SUCCESS' : 'FAILURE',
    intent.items.map(i => i.name).join(', '),
    resolvedItems.map(i => i.name).join(', '),
    {}
  );

  if (resolvedItems.length === 0) {
    // Product in intent but not in catalog
    const suggestions = allProducts.slice(0, 6).map(p => p.name);
    return res.json({
      success:     false,
      isInvalid:   true,
      message:     `I couldn't find "${notFound.join(', ')}" in SnapBuy's catalog. Here are available products:`,
      suggestions,
    });
  }

  // ── Update CART (create or merge) ─────────────────────────────────────────
  let cart = await Order.findOne({ userId, status: 'CART' });

  // Determine address: message > saved profile > pending
  const hasAddressInMessage = intent.address && intent.address !== 'NOT_PROVIDED';
  const cartAddress = hasAddressInMessage
    ? intent.address
    : (savedAddr || 'Address Pending');

  if (!cart) {
    cart = new Order({
      userId,
      items:       [],
      totalAmount: 0,
      address:     cartAddress,
      status:      'CART',
    });
  } else if (hasAddressInMessage) {
    cart.address = intent.address;
  } else if (savedAddr && (!cart.address || cart.address === 'Address Pending')) {
    cart.address = savedAddr;
  }

  // Merge items into cart
  for (const item of resolvedItems) {
    const existing = cart.items.find(i => i.name.toLowerCase() === item.name.toLowerCase());
    if (existing) {
      existing.qty += item.qty;
    } else {
      cart.items.push({ name: item.name, qty: item.qty, price: item.price });
    }
  }

  cart.totalAmount = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  cart.updatedAt   = new Date();
  await cart.save();

  await audit(userId, 'CART_UPDATED', 'SUCCESS',
    trimmed,
    `Cart updated. Items: ${cart.items.length}. Total: ₹${cart.totalAmount}`,
    { cartId: cart._id }
  );

  // Compose response message
  const itemsSummary = resolvedItems.map(i => `${i.qty}× ${i.name}`).join(', ');
  const addressInfo  = (cart.address && cart.address !== 'Address Pending' && cart.address !== 'NOT_PROVIDED')
    ? ` Delivering to ${cart.address}.`
    : '';
  const notFoundNote = notFound.length > 0 ? ` (Note: "${notFound.join(', ')}" not found in catalog)` : '';

  const addressSource = hasAddressInMessage ? 'message' : (savedAddr ? 'profile' : 'not_provided');

  let responseMessage;
  if (addressInfo) {
    responseMessage = `Added ${itemsSummary} to your cart.${addressInfo} Total: ₹${cart.totalAmount.toLocaleString('en-IN')}.${notFoundNote}`;
  } else {
    responseMessage = `Added ${itemsSummary} to your cart. Total: ₹${cart.totalAmount.toLocaleString('en-IN')}. Please provide your delivery address to proceed.${notFoundNote}`;
  }

  // If saved address exists, don't ask again
  if (savedAddr && !hasAddressInMessage) {
    responseMessage = `Added ${itemsSummary} to your cart. Using saved address: ${savedAddr}. Total: ₹${cart.totalAmount.toLocaleString('en-IN')}.${notFoundNote}`;
  }

  return res.json({
    success:     true,
    message:     responseMessage,
    cart:        { items: cart.items, totalAmount: cart.totalAmount, address: cart.address },
    parsed:      { items: cart.items, address: cart.address },
    totalAmount: cart.totalAmount,
    aiLogic: {
      parsedItems:       resolvedItems,
      addressSource,
      confidence:        intent.source === 'ai' ? 95 : 75,
      recommendedAction: cart.address !== 'Address Pending' ? 'Proceed to payment' : 'Provide delivery address',
      intentSource:      intent.source,
      notFound:          notFound.length > 0 ? notFound : undefined,
    },
  });
});

// =============================================================================
// POST /verify-payment
// =============================================================================
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment parameters' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      await audit(req.user.userId, 'PAYMENT_CAPTURED', 'FAILURE', razorpay_payment_id, 'Signature mismatch', {});
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id })
                || (req.body.orderId ? await Order.findById(req.body.orderId) : null);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Idempotent: if already paid, return success without re-processing
    if (order.status === 'PAID') {
      return res.json({
        success:   true,
        message:   'Payment already recorded.',
        duplicate: true,
        receipt: {
          orderId:           order._id.toString(),
          razorpayPaymentId: order.razorpayPaymentId || razorpay_payment_id,
          items:             order.items,
          totalAmount:       order.totalAmount,
          address:           order.address,
          paidAt:            order.updatedAt ? order.updatedAt.toISOString() : new Date().toISOString(),
        },
      });
    }

    order.razorpayPaymentId = razorpay_payment_id;
    order.status            = 'PAID';
    order.updatedAt         = new Date();
    await order.save();

    await audit(order.userId, 'PAYMENT_CAPTURED', 'SUCCESS',
      razorpay_payment_id,
      `Order ${order._id} paid ₹${order.totalAmount}`,
      { orderId: order._id, total: order.totalAmount }
    );

    res.json({
      success: true,
      message: 'Payment verified.',
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
// POST /retry-payment — max 3 retries, bounded
// =============================================================================
router.post('/retry-payment', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Unauthorized' });
    if (order.status === 'PAID')
      return res.status(400).json({ error: 'This order is already paid.' });
    if ((order.retryCount || 0) >= 3) {
      return res.status(400).json({
        error:            'Maximum retry attempts (3) reached. Please start a new order.',
        maxRetriesReached: true,
      });
    }

    const rzpOrder = await razorpay.orders.create({
      amount:   order.totalAmount * 100,
      currency: 'INR',
      receipt:  `retry${(order.retryCount || 0) + 1}_${order._id.toString().slice(-8)}`,
      notes:    { orderId: order._id.toString(), userId: req.user.userId, retry: 'true' },
    });

    order.razorpayOrderId = rzpOrder.id;
    order.status          = 'RETRY_GENERATED';
    order.retryCount      = (order.retryCount || 0) + 1;
    order.updatedAt       = new Date();
    await order.save();

    await audit(order.userId, 'PAYMENT_RETRY', 'INFO',
      `Retry #${order.retryCount}`,
      `New rzpOrderId: ${rzpOrder.id}`,
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
// GET /orders/me — order history (excludes in-progress carts)
// =============================================================================
router.get('/orders/me', auth, async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.userId,
      status: { $nin: ['CART'] },
    }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, orders });
  } catch (err) {
    console.error('[ORDERS]', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// =============================================================================
// POST /webhook — Razorpay payment events
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
      const order   = await Order.findOne({ razorpayOrderId: payment.order_id })
                   || await Order.findById(payment.notes?.orderId);
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
      const order   = await Order.findOne({ razorpayOrderId: payment.order_id })
                   || await Order.findById(payment.notes?.orderId);
      if (order && order.status !== 'PAID') {
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

module.exports = router;
