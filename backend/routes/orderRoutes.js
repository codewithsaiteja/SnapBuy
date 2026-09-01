const express  = require('express');
const router   = express.Router();
const Groq     = require('groq-sdk');
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const Order    = require('../models/Order');
const Product  = require('../models/Product');
const User     = require('../models/User');
const Coupon   = require('../models/Coupon');
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

// ─── Audit helper ─────────────────────────────────────────────────────────────
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

// ─── Cart summary helper — what the client needs to display ──────────────────
function cartSummary(cart) {
  if (!cart) return null;
  return {
    items:          cart.items,
    subtotalAmount: cart.subtotalAmount,
    discountAmount: cart.discountAmount,
    deliveryCharge: cart.deliveryCharge || 0,
    totalAmount:    cart.totalAmount,
    address:        cart.address,
    couponCode:     cart.couponCode || '',
  };
}

// ─── Re-apply coupon to a cart after items change ─────────────────────────────
// Returns the new discountAmount (0 if coupon no longer valid)
async function reapplyCoupon(cart, userId) {
  if (!cart.couponCode) return 0;
  const coupon = await Coupon.findOne({ code: cart.couponCode.toUpperCase(), isActive: true });
  if (!coupon) {
    cart.couponCode    = '';
    cart.discountAmount = 0;
    return 0;
  }
  const result = coupon.check(userId, cart.subtotalAmount);
  if (!result.valid) {
    cart.couponCode    = '';
    cart.discountAmount = 0;
    return 0;
  }
  cart.discountAmount = result.discountAmount;
  return result.discountAmount;
}

// ─── Product matching helpers ──────────────────────────────────────────────────
function scoreMatch(query, product) {
  const q    = query.toLowerCase().trim();
  const name = product.name.toLowerCase().trim();
  const tags = (product.tags || []).map(t => t.toLowerCase());

  if (name === q)           return 100;
  if (name.startsWith(q))  return 90;
  if (name.includes(q))    return 80;
  if (q.includes(name))    return 70;
  if (tags.some(t => t === q || t.includes(q) || q.includes(t))) return 75;

  const qTokens = q.split(/\s+/).filter(t => t.length > 1);
  const pTokens = name.split(/[\s\(\)\-]+/).filter(t => t.length > 1);
  let overlap = 0;
  for (const qt of qTokens) {
    if (pTokens.some(pt => pt.includes(qt) || qt.includes(pt))) overlap++;
    if (tags.some(t => t.includes(qt) || qt.includes(t))) overlap += 0.5;
  }
  if (overlap > 0) return Math.round((overlap / Math.max(qTokens.length, 1)) * 60);
  return 0;
}

function matchProduct(name, products) {
  let best = null, bestScore = 0;
  for (const p of products) {
    const s = scoreMatch(name, p);
    if (s > bestScore) { bestScore = s; best = p; }
  }
  return bestScore >= 40 ? best : null;
}

// ─── Deterministic NLP fallback ───────────────────────────────────────────────
function deterministicParse(message) {
  const msg = message.toLowerCase().trim();
  const numWords = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, a:1, an:1 };
  const stripped = msg
    .replace(/^(add|buy|order|i want|give me|can i get|i need|i'd like|get me|please add|please buy|could i get|bring me|i'll take)\s+/i, '')
    .replace(/\s+(to my cart|in my cart|please|now)$/i, '')
    .trim();

  let qty = 1, productName = stripped;
  const leadNum = stripped.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(.+)$/i);
  if (leadNum) {
    qty         = parseInt(leadNum[1]) || numWords[leadNum[1].toLowerCase()] || 1;
    productName = leadNum[2].trim();
  }
  const trailNum = stripped.match(/^(.+?)\s+x?\s*(\d+)$/i);
  if (trailNum && !leadNum) { productName = trailNum[1].trim(); qty = parseInt(trailNum[2]) || 1; }
  if (productName.endsWith('s') && productName.length > 3) productName = productName.slice(0, -1);
  return [{ name: productName, qty: Math.max(1, qty) }];
}

// ─── Parse quantity change commands ───────────────────────────────────────────
function parseQtyChange(msg) {
  const m = msg.match(/(?:change|update|make|set)\s+(.+?)\s+(?:to|quantity to|qty to)\s+(\d+)/i)
         || msg.match(/(?:change|update|make|set)\s+(.+?)\s+(\d+)/i)
         || msg.match(/make it\s+(\d+)/i);
  if (!m) return null;
  if (m.length === 2) return { productName: null, newQty: parseInt(m[1]) }; // "make it 3"
  return { productName: m[1].trim(), newQty: parseInt(m[2]) };
}

function extractAddressFromMessage(message) {
  if (!message || !message.trim()) return null;

  const patterns = [
    /^(?:my|the)?\s*(?:delivery|shipping)?\s*address\s*(?:is|:|=)\s*([A-Za-z0-9#,./()& -]+?)(?=\s*(?:and\s+(?:i\s+)?(?:want|need|need|would like|would love|buy|order|add|get|please)|$|[.;!?]))/i,
    /^(?:deliver(?:y|ing)?\s+to|ship\s+to)\s*([A-Za-z0-9#,./()& -]+?)(?=\s*(?:and\s+(?:i\s+)?(?:want|need|buy|order|add|get|please)|$|[.;!?]))/i,
    /^(?:my\s+location\s+is|location\s+is)\s*([A-Za-z0-9#,./()& -]+?)(?=\s*(?:and\s+(?:i\s+)?(?:want|need|buy|order|add|get|please)|$|[.;!?]))/i,
  ];

  for (const pattern of patterns) {
    const match = message.trim().match(pattern);
    if (match) {
      const address = match[1].replace(/\s+/g, ' ').trim();
      if (address.length > 2 && !/^(buy|add|order|get|want|need|please)\b/i.test(address)) {
        return address;
      }
    }
  }

  return null;
}

// ─── Parse remove commands ─────────────────────────────────────────────────────
function parseRemoveCommand(msg) {
  const m = msg.match(/^(remove|delete|discard|drop|take out)\s+(.+)$/i);
  return m ? m[2].trim() : null;
}

// ─── Parse coupon intent ──────────────────────────────────────────────────────
function parseCouponIntent(msg) {
  const m = msg.match(/(?:apply|use|add|enter|have a?|got a?)\s+(?:coupon|code|promo|discount)?\s*([A-Z0-9]{4,20})/i)
         || msg.match(/(?:coupon|code|promo)\s+([A-Z0-9]{4,20})/i);
  if (m) return { intent: 'APPLY_COUPON', couponCode: m[1].toUpperCase() };
  if (/(?:remove|clear|cancel)\s+(?:coupon|discount|promo)/i.test(msg)) return { intent: 'REMOVE_COUPON' };
  if (/(?:do i have|any|show)\s+(?:a\s+)?(?:coupon|discount|promo|offer)/i.test(msg)) return { intent: 'LIST_COUPONS' };
  return null;
}

// ─── Intent Detection (before product search) ─────────────────────────────────
// This is the critical fix: determine intent FIRST before any product search
async function detectIntent(message, msgLower) {
  const msg = message.trim();

  // ── GENERAL_CHAT: Greetings and small talk ──────────────────────────────
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|hey there|what's up|howdy|greetings)$/i.test(msgLower)) {
    return { type: 'GENERAL_CHAT', confidence: 95, message: 'greeting' };
  }

  if (/^(how are you|how's it going|what's your status|are you there|can you hear me)$/i.test(msgLower)) {
    return { type: 'GENERAL_CHAT', confidence: 90, message: 'pleasantry' };
  }

  if (/^(thanks|thank you|thankyou|appreciate it|thanks a lot)$/i.test(msgLower)) {
    return { type: 'GENERAL_CHAT', confidence: 95, message: 'thanks' };
  }

  if (/^(ok|okay|cool|nice|good|great|alright|awesome|got it)$/i.test(msgLower)) {
    return { type: 'GENERAL_CHAT', confidence: 90, message: 'acknowledgment' };
  }

  // ── HELP: Capabilities and how to use the app ───────────────────────────
  if (/^(what can you do|help|capabilities|what are your features|how does this work|guide me|tell me about|what's this app)$/i.test(msgLower)) {
    return { type: 'HELP', confidence: 95 };
  }

  // ── CHECKOUT: Ready to pay or proceed to checkout ─────────────────────────
  if (/^(checkout|go to checkout|proceed to checkout|ready to pay|let's pay|i want to pay|pay now|complete my order|finish my order)$/i.test(msgLower)) {
    return { type: 'CHECKOUT', confidence: 95 };
  }

  if (/^(i'm ready to pay|let's checkout|take me to checkout|i'm ready to checkout|submit order)$/i.test(msgLower)) {
    return { type: 'CHECKOUT', confidence: 90 };
  }

  // ── ADDRESS_UPDATE: Delivery address changes ────────────────────────────
  const addressMatch = extractAddressFromMessage(msg);
  if (addressMatch) {
    return { type: 'ADDRESS_UPDATE', confidence: 95, address: addressMatch };
  }

  // ── CLEAR_CART: Empty the cart ──────────────────────────────────────────
  if (/^(clear cart|empty cart|reset cart)$/i.test(msgLower)) {
    return { type: 'CLEAR_CART', confidence: 95 };
  }

  // ── VIEW_CART: Show current cart ────────────────────────────────────────
  if (/^(show cart|view cart|what('s| is) in my cart|my cart|cart|what's in my cart)$/i.test(msgLower)) {
    return { type: 'VIEW_CART', confidence: 95 };
  }

  // ── ORDER_HISTORY: Recent orders ────────────────────────────────────────
  if (/^(show( my)? orders|view orders|order history|recent orders|my orders|my order history)$/i.test(msgLower)) {
    return { type: 'ORDER_HISTORY', confidence: 95 };
  }

  // ── REMOVE_FROM_CART: Remove item ──────────────────────────────────────
  if (/^(remove|delete|discard|drop|take out)\s+/i.test(msgLower)) {
    return { type: 'REMOVE_FROM_CART', confidence: 95 };
  }

  // ── UPDATE_QUANTITY: Change item quantity ──────────────────────────────
  if (/(?:change|update|make|set)\s+(.+?)\s+(?:to|quantity to|qty to)\s+(\d+)/i.test(msgLower) || /^make it\s+\d+$/i.test(msgLower)) {
    return { type: 'UPDATE_QUANTITY', confidence: 90 };
  }

  // ── COUPON: Apply or manage coupons ────────────────────────────────────
  const couponIntent = parseCouponIntent(msg);
  if (couponIntent) {
    return { type: couponIntent.intent, confidence: 95, couponCode: couponIntent.couponCode };
  }

  // ── DEFAULT: Assume PRODUCT_SEARCH for anything else ───────────────────
  return { type: 'PRODUCT_SEARCH', confidence: 50 };
}

// ─── Groq AI product extraction (only called for PRODUCT_SEARCH intent) ────────
async function parseIntent(message, catalogProducts) {
  const explicitAddress = extractAddressFromMessage(message);
  if (explicitAddress) {
    return { items: [], address: explicitAddress, source: 'address' };
  }

  const catalogSample = catalogProducts.slice(0, 40).map(p => p.name).join(', ');
  const systemPrompt = `You are a shopping assistant for SnapBuy, an AI commerce app for students and professionals.
Extract product names and quantities from user messages.
Available products (use exact names from this list): ${catalogSample}
Rules:
- Return ONLY valid JSON. No markdown, no explanation, no code fences.
- Match product names to the available list. Prefer exact or closest match using tags/synonyms.
- qty defaults to 1. Number words (two=2, three=3) should be converted.
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
    const raw     = resp.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    if (cleaned) groqResult = JSON.parse(cleaned);
  } catch (e) {
    console.warn('[INTENT] Groq parse failed, using fallback:', e.message.slice(0, 80));
  }

  if (groqResult && Array.isArray(groqResult.items) && groqResult.items.length > 0) {
    return { items: groqResult.items, address: groqResult.address || 'NOT_PROVIDED', source: 'ai' };
  }
  return { items: deterministicParse(message), address: 'NOT_PROVIDED', source: 'fallback' };
}

// =============================================================================
// ROUTES
// =============================================================================

// GET /products — public catalog
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }, 'name price image category badge tags targetAudience').lean();
    res.json({ success: true, products });
  } catch (err) {
    console.error('[PRODUCTS]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /products/search?q=&limit=5&category=true&audience=developer
router.get('/products/search', auth, async (req, res) => {
  try {
    const q          = (req.query.q || '').trim();
    const limit      = Math.min(parseInt(req.query.limit) || 5, 20);
    const byCategory = req.query.category === 'true';
    const audience   = req.query.audience || '';

    if (!q && !audience) return res.json({ success: true, products: [] });

    let products;

    if (byCategory) {
      products = await Product.find(
        { isActive: true, category: { $regex: q, $options: 'i' } },
        'name price category badge'
      ).sort({ price: 1 }).limit(limit).lean();
    } else if (audience) {
      products = await Product.find(
        { isActive: true, targetAudience: audience },
        'name price category badge'
      ).limit(limit).lean();
    } else {
      // Text search first
      try {
        products = await Product.find(
          { isActive: true, $text: { $search: q } },
          { score: { $meta: 'textScore' }, name: 1, price: 1, category: 1, badge: 1 }
        ).sort({ score: { $meta: 'textScore' } }).limit(limit).lean();
      } catch { products = []; }

      // Regex fallback
      if (!products || products.length === 0) {
        products = await Product.find(
          { isActive: true, name: { $regex: q, $options: 'i' } },
          'name price category badge'
        ).limit(limit).lean();
      }

      // Tag fallback
      if (!products || products.length === 0) {
        products = await Product.find(
          { isActive: true, tags: { $regex: q, $options: 'i' } },
          'name price category badge'
        ).limit(limit).lean();
      }
    }

    res.json({
      success: true,
      products: (products || []).map(p => ({
        id: p._id, name: p.name, price: p.price, category: p.category, badge: p.badge || '',
      })),
    });
  } catch (err) {
    console.error('[PRODUCT SEARCH]', err.message);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// GET /user/profile
router.get('/user/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const [totalOrders, paidOrders, pendingOrders] = await Promise.all([
      Order.countDocuments({ userId: req.user.userId, status: { $nin: ['CART'] } }),
      Order.find({ userId: req.user.userId, status: 'PAID' }).select('totalAmount').lean(),
      Order.countDocuments({ userId: req.user.userId, status: { $in: ['PENDING', 'ORDER_CREATED', 'RETRY_GENERATED'] } }),
    ]);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        phoneVerified: Boolean(user.phoneVerified),
        defaultAddress: user.defaultAddress || '',
        selectedVoice: user.selectedVoice || "Google UK English Female",
        memberSince: user.createdAt,
        addresses: user.addresses || [],
        voicePreferences: user.voicePreferences || { ttsEnabled: true, sttEnabled: true },
      },
      stats: {
        totalOrders,
        totalSpent:    paidOrders.reduce((s, o) => s + o.totalAmount, 0),
        pendingOrders,
        paidCount:     paidOrders.length,
      },
    });
  } catch (err) {
    console.error('[PROFILE]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// PUT /user/voice-settings
router.put('/user/voice-settings', auth, async (req, res) => {
  try {
    const { ttsEnabled, sttEnabled, selectedVoice } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (ttsEnabled !== undefined || sttEnabled !== undefined) {
      user.voicePreferences = {
        ttsEnabled: ttsEnabled !== undefined ? ttsEnabled : user.voicePreferences?.ttsEnabled,
        sttEnabled: sttEnabled !== undefined ? sttEnabled : user.voicePreferences?.sttEnabled
      };
    }
    if (selectedVoice !== undefined) {
      user.selectedVoice = selectedVoice;
    }
    await user.save();
    res.json({ success: true, voicePreferences: user.voicePreferences, selectedVoice: user.selectedVoice });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update voice settings' });
  }
});

// PUT /user/change-password
router.put('/user/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return res.status(400).json({ success: false, error: 'Incorrect old password' });
    
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// POST /user/addresses
router.post('/user/addresses', auth, async (req, res) => {
  try {
    const { label, address, isDefault } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    if (isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
      user.defaultAddress = address;
    }
    user.addresses.push({ label, address, isDefault });
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add address' });
  }
});

// PUT /user/addresses/:id/default
router.put('/user/addresses/:id/default', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    let newDefault = '';
    user.addresses.forEach(a => {
      if (a._id.toString() === req.params.id) {
        a.isDefault = true;
        newDefault = a.address;
      } else {
        a.isDefault = false;
      }
    });
    
    if (newDefault) user.defaultAddress = newDefault;
    await user.save();
    res.json({ success: true, addresses: user.addresses, defaultAddress: user.defaultAddress });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to set default address' });
  }
});

// PATCH /user/address
router.patch('/user/address', auth, async (req, res) => {
  try {
    const { address } = req.body;
    if (!address?.trim()) return res.status(400).json({ success: false, error: 'Address is required' });
    await User.findByIdAndUpdate(req.user.userId, { defaultAddress: address.trim() });
    res.json({ success: true, message: 'Address saved to profile' });
  } catch (err) {
    console.error('[ADDRESS]', err.message);
    res.status(500).json({ success: false, error: 'Failed to save address' });
  }
});

// GET /cart
router.get('/cart', auth, async (req, res) => {
  try {
    const cart = await Order.findOne({ userId: req.user.userId, status: 'CART' }).lean();
    res.json({ success: true, cart: cart ? cartSummary(cart) : null });
  } catch (err) {
    console.error('[GET CART]', err.message);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /cart/add — from ProductGrid/autocomplete "Add" click
router.post('/cart/add', auth, async (req, res) => {
  try {
    const { productName, qty = 1 } = req.body;
    if (!productName?.trim()) return res.status(400).json({ success: false, error: 'Product name required' });

    const allProducts = await Product.find({ isActive: true }).lean();
    const product     = matchProduct(productName, allProducts);
    if (!product) {
      const suggestions = allProducts.slice(0, 6).map(p => p.name);
      return res.json({ success: false, isInvalid: true, message: `"${productName}" is not available.`, suggestions });
    }

    const safeQty = Math.max(1, parseInt(qty) || 1);
    const userId  = req.user.userId;
    const userDoc = await User.findById(userId).select('defaultAddress').lean();
    const savedAddr = userDoc?.defaultAddress?.trim() || '';

    let cart = await Order.findOne({ userId, status: 'CART' });
    if (!cart) {
      cart = new Order({ userId, items: [], subtotalAmount: 0, discountAmount: 0, totalAmount: 0, address: savedAddr || 'Address Pending', status: 'CART' });
    }

    const existing = cart.items.find(i => i.name.toLowerCase() === product.name.toLowerCase());
    if (existing) existing.qty += safeQty;
    else cart.items.push({ name: product.name, qty: safeQty, price: product.price });

    const discount = await reapplyCoupon(cart, userId);
    cart.recalculate(discount);
    await cart.save();

    res.json({ success: true, message: `Added ${safeQty}× ${product.name} to cart.`, cart: cartSummary(cart) });
  } catch (err) {
    console.error('[CART ADD]', err.message);
    res.status(500).json({ success: false, error: 'Failed to add to cart' });
  }
});

// POST /cart/update — update qty or remove a single item by name
router.post('/cart/update', auth, async (req, res) => {
  try {
    const { productName, qty } = req.body;
    if (!productName?.trim()) return res.status(400).json({ success: false, error: 'productName required' });

    const userId = req.user.userId;
    const cart   = await Order.findOne({ userId, status: 'CART' });
    if (!cart) return res.status(404).json({ success: false, error: 'No active cart' });

    const item = cart.items.find(i => i.name.toLowerCase().includes(productName.toLowerCase()));
    if (!item) return res.status(404).json({ success: false, error: `${productName} not found in cart` });

    if (qty === 0 || qty === null) {
      cart.items = cart.items.filter(i => i !== item);
    } else {
      item.qty = Math.max(1, parseInt(qty) || 1);
    }

    if (cart.items.length === 0) {
      await Order.findByIdAndDelete(cart._id);
      return res.json({ success: true, message: 'Cart is now empty.', cart: null });
    }

    const discount = await reapplyCoupon(cart, userId);
    cart.recalculate(discount);
    await cart.save();

    res.json({ success: true, cart: cartSummary(cart) });
  } catch (err) {
    console.error('[CART UPDATE]', err.message);
    res.status(500).json({ success: false, error: 'Failed to update cart' });
  }
});

// POST /coupon/apply — validate and apply coupon to active CART
router.post('/coupon/apply', auth, async (req, res) => {
  try {
    const { couponCode } = req.body;
    if (!couponCode?.trim()) return res.status(400).json({ success: false, error: 'Coupon code is required' });

    const userId = req.user.userId;
    const cart   = await Order.findOne({ userId, status: 'CART' });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Your cart is empty. Add items before applying a coupon.' });
    }

    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
    if (!coupon) {
      return res.json({ success: false, error: 'Invalid coupon code. Please check and try again.' });
    }

    // Compute subtotal first (without current discount)
    const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
    const result   = coupon.check(userId, subtotal);

    if (!result.valid) {
      return res.json({ success: false, error: result.reason });
    }

    cart.couponCode     = coupon.code;
    cart.discountAmount = result.discountAmount;
    cart.recalculate(result.discountAmount);
    await cart.save();

    await audit(userId, 'COUPON_APPLIED', 'SUCCESS', couponCode, `Discount: ₹${result.discountAmount}`, { cartId: cart._id });

    res.json({
      success:        true,
      message:        `Coupon applied! You save ₹${result.discountAmount.toLocaleString('en-IN')}.`,
      couponCode:     coupon.code,
      discountAmount: result.discountAmount,
      cart:           cartSummary(cart),
    });
  } catch (err) {
    console.error('[COUPON APPLY]', err.message);
    res.status(500).json({ success: false, error: 'Failed to apply coupon' });
  }
});

// DELETE /coupon/remove — remove coupon from active CART
router.delete('/coupon/remove', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cart   = await Order.findOne({ userId, status: 'CART' });
    if (!cart) return res.status(404).json({ success: false, error: 'No active cart' });

    cart.couponCode    = '';
    cart.discountAmount = 0;
    cart.recalculate(0);
    await cart.save();

    res.json({ success: true, message: 'Coupon removed.', cart: cartSummary(cart) });
  } catch (err) {
    console.error('[COUPON REMOVE]', err.message);
    res.status(500).json({ success: false, error: 'Failed to remove coupon' });
  }
});

// GET /coupons/available — list active coupons (for "do I have any discount?" intent)
router.get('/coupons/available', auth, async (req, res) => {
  try {
    const coupons = await Coupon.find({ isActive: true })
      .select('code description discountType discountValue minOrderAmount maxDiscount')
      .lean();
    const safe = coupons.map(c => ({
      code:           c.code,
      description:    c.description,
      discountType:   c.discountType,
      discountValue:  c.discountValue,
      minOrderAmount: c.minOrderAmount,
      maxDiscount:    c.maxDiscount === Infinity ? null : c.maxDiscount,
    }));
    res.json({ success: true, coupons: safe });
  } catch (err) {
    console.error('[COUPONS LIST]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch coupons' });
  }
});

// POST /cart/finalize — CART → ORDER_CREATED with discount-aware Razorpay order
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
        error:           'Delivery address is required.',
        pendingItems:    cart.items,
      });
    }

    // Re-validate coupon at finalize to prevent stale values
    let discountAmount = 0;
    if (cart.couponCode) {
      const coupon = await Coupon.findOne({ code: cart.couponCode, isActive: true });
      if (coupon) {
        const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
        const result   = coupon.check(userId, subtotal);
        if (result.valid) discountAmount = result.discountAmount;
        else { cart.couponCode = ''; }
      } else {
        cart.couponCode = '';
      }
    }

    // Idempotency: reuse if ORDER_CREATED exists with same total and no rzp payment
    const existingOrder = await Order.findOne({
      userId,
      status:      'ORDER_CREATED',
      totalAmount: cart.totalAmount,
    }).sort({ createdAt: -1 });
    if (existingOrder?.razorpayOrderId) {
      await Order.findByIdAndDelete(cart._id);
      return res.json({
        success:         true,
        orderId:         existingOrder._id.toString(),
        razorpayOrderId: existingOrder.razorpayOrderId,
        totalAmount:     existingOrder.totalAmount,
        subtotalAmount:  existingOrder.subtotalAmount,
        discountAmount:  existingOrder.discountAmount,
        couponCode:      existingOrder.couponCode,
        address:         existingOrder.address,
        items:           existingOrder.items,
        reused:          true,
      });
    }

    cart.address = address;
    cart.status  = 'ORDER_CREATED';
    cart.recalculate(discountAmount);

    const payableAmount = Math.max(1, cart.totalAmount); // Razorpay minimum ₹1
    const rzpOrder = await razorpay.orders.create({
      amount:   payableAmount * 100,
      currency: 'INR',
      receipt:  cart._id.toString().slice(-12),
      notes:    { orderId: cart._id.toString(), userId: String(userId), coupon: cart.couponCode || 'none' },
    });

    cart.razorpayOrderId = rzpOrder.id;
    await cart.save();

    // Mark coupon as used (will be confirmed on payment success)
    await audit(userId, 'ORDER_CREATED', 'SUCCESS',
      `Items: ${cart.items.map(i => `${i.qty}x${i.name}`).join(', ')}`,
      `orderId=${cart._id} rzp=${rzpOrder.id} total=₹${cart.totalAmount} discount=₹${discountAmount}`,
      { orderId: cart._id, address, total: cart.totalAmount, discount: discountAmount }
    );

    res.json({
      success:         true,
      orderId:         cart._id.toString(),
      razorpayOrderId: rzpOrder.id,
      totalAmount:     cart.totalAmount,
      subtotalAmount:  cart.subtotalAmount,
      discountAmount:  cart.discountAmount,
      couponCode:      cart.couponCode,
      deliveryCharge:  cart.deliveryCharge || 0,
      address:         cart.address,
      items:           cart.items,
    });
  } catch (err) {
    console.error('[FINALIZE CART]', err.message);
    res.status(500).json({ error: 'Failed to finalize cart' });
  }
});

// =============================================================================
// POST /chat — main AI shopping handler
// =============================================================================

// =============================================================================
// POST /chat — AI shopping handler with STRICT INTENT LAYER
// =============================================================================

// Helper: Category-specific fallback when a requested item is unavailable
async function getCategoryFallbackProducts(query) {
  const q = (query || '').toLowerCase();
  let targetCategory = '';
  
  if (/chocolate|choco|sweet|candy|fudge/i.test(q)) targetCategory = 'Chocolates & Confectionery';
  else if (/biscuit|cookie|wafer|cracker|oreo/i.test(q)) targetCategory = 'Biscuits & Cookies';
  else if (/chip|crisp|snack|nacho|popcorn|namkeen|bhujia/i.test(q)) targetCategory = 'Snacks';
  else if (/coffee|tea|chai|caffeine|brew/i.test(q)) targetCategory = 'Coffee & Tea';
  else if (/juice|soda|drink|beverage|cola|water/i.test(q)) targetCategory = 'Beverages';
  else if (/fruit|apple|banana|mango|berry|orange|grapes|dragon/i.test(q)) targetCategory = 'Fruits';
  else if (/veg|tomato|potato|onion|vegetable/i.test(q)) targetCategory = 'Vegetables';
  else if (/mouse|keyboard|headphone|cable|electronics|gadget|phone/i.test(q)) targetCategory = 'Electronics';

  if (targetCategory) {
    const items = await Product.find({ isActive: true, category: targetCategory }).limit(4).lean();
    if (items.length > 0) return { categoryName: targetCategory, items };
  }

  // Default fallback to popular food & grocery items
  const items = await Product.find({ isActive: true, category: { $in: ['Chocolates & Confectionery', 'Biscuits & Cookies', 'Snacks', 'Groceries'] } }).limit(4).lean();
  return { categoryName: 'Popular Items', items };
}

// Helper: Deterministic Fast-Path Pre-classifier
function classifyFastPathIntent(msgLower, trimmed) {
  // Checkout triggers
  if (/^(checkout|check out|proceed to checkout|go to checkout|i want to checkout|take me to checkout|proceed with my order|i'?m ready to pay|pay now|finalize)$/i.test(msgLower) ||
      /proceed to checkout|ready to pay|take me to checkout|want to checkout/i.test(msgLower)) {
    return { intent: 'CHECKOUT' };
  }

  // Payment triggers
  if (/^(make payment|pay for my order|complete payment|retry payment)$/i.test(msgLower)) {
    return { intent: 'PAYMENT' };
  }

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy|hey there)$/i.test(msgLower)) {
    return { intent: 'GENERAL_CONVERSATION', subtype: 'greeting' };
  }

  // Pleasantries
  if (/^(how are you|how are you doing|how do you do|who are you)$/i.test(msgLower)) {
    return { intent: 'GENERAL_CONVERSATION', subtype: 'pleasantry' };
  }

  // Gratitude
  if (/^(thanks|thank you|thanks a lot|you'?re helpful|appreciate it)$/i.test(msgLower)) {
    return { intent: 'GENERAL_CONVERSATION', subtype: 'thanks' };
  }

  // Capabilities / Help
  if (/^(what can you do|help|capabilities|what are your features|tell me about snapbuy|what is snapbuy)$/i.test(msgLower)) {
    return { intent: 'HELP' };
  }

  // View Cart
  if (/^(what'?s in my cart|show my cart|show cart|view cart|my cart|cart status|how many items in my cart|my total)$/i.test(msgLower)) {
    return { intent: 'VIEW_CART' };
  }

  // Clear Cart
  if (/^(clear cart|empty cart|reset cart)$/i.test(msgLower)) {
    return { intent: 'CLEAR_CART' };
  }

  // Order Status & Tracking
  if (/^(where is my order|track my order|what'?s my order status|when will my order arrive|show my orders|my orders|recent orders)$/i.test(msgLower)) {
    return { intent: 'ORDER_STATUS' };
  }

  // Address Update
  if (/^(my delivery address is|deliver to|change my address|update delivery address|use this address)/i.test(msgLower)) {
    const addr = trimmed.replace(/^(my delivery address is|deliver to|change my address|update delivery address|use this address)\s*/i, '').trim();
    return { intent: 'DELIVERY_ADDRESS', address: addr };
  }

  // Coupon / Discount questions
  if (/(?:student10|coupon|discount|offer|promo)/i.test(msgLower)) {
    if (/student/i.test(msgLower)) return { intent: 'DISCOUNT_OFFER', subtype: 'student' };
    const cMatch = parseCouponIntent(trimmed);
    if (cMatch) return { intent: cMatch.intent, couponCode: cMatch.couponCode };
    return { intent: 'DISCOUNT_OFFER' };
  }

  return null;
}

router.post('/chat', auth, async (req, res) => {
  const { message, isAddress, pendingItems } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, error: 'Message is required' });

  const userId  = req.user.userId;
  const trimmed = message.trim();
  const msgLower = trimmed.toLowerCase();
  
  await audit(userId, 'CHAT_INPUT', 'INFO', trimmed, '', {});

  // 1. ADDRESS INTERCEPTION
  if (isAddress && Array.isArray(pendingItems) && pendingItems.length > 0) {
    try {
      let cart = await Order.findOne({ userId, status: 'CART' });
      if (!cart) {
        cart = new Order({
          userId, items: pendingItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
          subtotalAmount: 0, discountAmount: 0, totalAmount: 0, status: 'CART',
        });
      }
      cart.address = trimmed;
      const discount = cart.couponCode ? await reapplyCoupon(cart, userId) : 0;
      cart.recalculate(discount);
      await cart.save();
      await User.findByIdAndUpdate(userId, { defaultAddress: trimmed });

      return res.json({
        success: true,
        message: `Address saved. Your order is ready — ₹${cart.totalAmount.toLocaleString('en-IN')}.`,
        parsed:  { items: cart.items, address: trimmed },
        showCheckout: true,
        cart: cartSummary(cart)
      });
    } catch (err) {
      return res.json({ success: false, message: 'Failed to process address. Please try again.' });
    }
  }

  // 2. GET CART CONTEXT
  let cart = await Order.findOne({ userId, status: 'CART' });

  // 3. INTENT CLASSIFICATION (Fast-Path First, then LLM)
  let intent = classifyFastPathIntent(msgLower, trimmed);

  if (!intent) {
    try {
      const prompt = `You are the SnapBuy Intent Classifier. Classify the user's message into exactly one of these intents:
GENERAL_CONVERSATION, ABOUT_SNAPBUY, HELP, DISCOUNT_OFFER, DELIVERY, ORDER_STATUS, PAYMENT, CHECKOUT, VIEW_CART, CLEAR_CART, ADD_TO_CART, REMOVE_FROM_CART, UPDATE_QUANTITY, PRODUCT_SEARCH.

Rules:
- Greetings (Hi, Hello, How are you) -> GENERAL_CONVERSATION
- "What can you do?" -> HELP
- "What is SnapBuy?" -> ABOUT_SNAPBUY
- "Student offer", "Any discounts?" -> DISCOUNT_OFFER
- "Where is my order" -> ORDER_STATUS
- "I want chips", "Find chocolates", "Show me coffee", "Do you have Oreo?" -> PRODUCT_SEARCH
- "Add 2 chocolates", "Buy a mouse" -> ADD_TO_CART
- "Remove mouse" -> REMOVE_FROM_CART
- "Make it 3" -> UPDATE_QUANTITY
- "Checkout", "Proceed to checkout" -> CHECKOUT
- "Pay now" -> PAYMENT

Respond ONLY with valid JSON.
Format: {"intent": "INTENT_NAME", "query": "extracted product name if product intent", "quantity": 1}`;

      const resp = await groq.chat.completions.create({
        messages: [{ role: 'system', content: prompt }, { role: 'user', content: trimmed }],
        model: 'llama3-8b-8192',
        temperature: 0,
        max_tokens: 100,
      });
      
      let raw = resp.choices[0]?.message?.content || '{}';
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      intent = JSON.parse(raw);
    } catch (e) {
      // Safe fallback: ONLY route to PRODUCT_SEARCH if text has shopping keywords
      if (/(?:buy|find|show|search|want|need|get|chocolate|biscuit|coffee|tea|chips|mouse|keyboard|juice|milk|oil|rice)/i.test(msgLower)) {
        intent = { intent: 'PRODUCT_SEARCH', query: trimmed, quantity: 1 };
      } else {
        intent = { intent: 'GENERAL_CONVERSATION' };
      }
    }
  }

  const intentType = intent.intent;
  console.log(`[CHAT] Intent detected: ${intentType}`);

  // 4. INTENT HANDLERS
  if (intentType === 'GENERAL_CONVERSATION') {
    if (intent.subtype === 'pleasantry' || /how are you/i.test(msgLower)) {
      return res.json({ success: true, message: "I'm doing well, thanks for asking! What would you like to shop for today?" });
    }
    if (intent.subtype === 'thanks' || /thank/i.test(msgLower)) {
      return res.json({ success: true, message: "You're welcome! Let me know if you need anything else." });
    }
    return res.json({ success: true, message: "Hi! Welcome to SnapBuy. How can I help you today?" });
  }

  if (intentType === 'ABOUT_SNAPBUY') {
    return res.json({ success: true, message: "SnapBuy is an AI-powered instant commerce platform designed to help you discover products, manage your cart, apply offers, and checkout seamlessly." });
  }

  if (intentType === 'HELP') {
    return res.json({ success: true, message: "I can help you find products, compare options, add items to your cart, update quantities, apply available coupons, and guide you through checkout." });
  }

  if (intentType === 'DISCOUNT_OFFER') {
    return res.json({ success: true, message: "SnapBuy offers a 15% student discount with the applicable student offer (STUDENT10). You can apply the available student coupon during checkout." });
  }

  if (intentType === 'DELIVERY' || intentType === 'DELIVERY_ADDRESS') {
    if (intent.address) {
      if (!cart) cart = new Order({ userId, items: [], subtotalAmount: 0, discountAmount: 0, totalAmount: 0, status: 'CART' });
      cart.address = intent.address;
      const discount = cart.couponCode ? await reapplyCoupon(cart, userId) : 0;
      cart.recalculate(discount);
      await cart.save();
      await User.findByIdAndUpdate(userId, { defaultAddress: intent.address });
      return res.json({ success: true, message: `Updated your delivery address to "${intent.address}".`, cart: cartSummary(cart) });
    }
    return res.json({ success: true, message: "SnapBuy supports fast delivery for all orders. You can specify your delivery address during checkout." });
  }

  if (intentType === 'PAYMENT') {
    if (!cart || cart.items.length === 0) return res.json({ success: true, message: "Your cart is empty. Add something to your cart before proceeding to payment." });
    return res.json({ success: true, message: `Your cart total is ₹${cart.totalAmount.toLocaleString('en-IN')}. Let's proceed to secure payment.`, showCheckout: true, cart: cartSummary(cart) });
  }

  if (intentType === 'ORDER_STATUS') {
    const orders = await Order.find({ userId, status: { $nin: ['CART'] } }).sort({ createdAt: -1 }).limit(1).lean();
    if (!orders.length) return res.json({ success: true, message: "You don't have any active orders right now." });
    const latest = orders[0];
    const statusText = latest.trackingStatus || latest.status;
    return res.json({
      success: true,
      message: `Your order #${latest._id.toString().slice(-6)} is currently ${statusText.toLowerCase().replace(/_/g, ' ')}. Delivered to ${latest.address || 'your address'}.`,
      orderData: latest
    });
  }

  if (intentType === 'VIEW_CART') {
    if (!cart || cart.items.length === 0) return res.json({ success: true, message: "Your cart is currently empty." });
    const summary = cart.items.map(i => `${i.qty}× ${i.name} — ₹${(i.price * i.qty).toLocaleString('en-IN')}`).join('\n');
    return res.json({ success: true, message: `Here is your current cart:\n${summary}\n\nTotal: ₹${cart.totalAmount.toLocaleString('en-IN')}`, cart: cartSummary(cart) });
  }

  if (intentType === 'CLEAR_CART') {
    if (cart) await Order.findByIdAndDelete(cart._id);
    return res.json({ success: true, message: "Your cart has been cleared.", cart: null });
  }

  if (intentType === 'CHECKOUT') {
    if (!cart || cart.items.length === 0) return res.json({ success: true, message: 'Your cart is empty. Add something to your cart before checkout.' });
    if (!cart.address || cart.address === 'Address Pending') {
      return res.json({ success: true, message: `You're ready for checkout. Your current total is ₹${cart.totalAmount.toLocaleString('en-IN')}. Please provide your delivery address below.`, addressRequired: true, cart: cartSummary(cart) });
    }
    return res.json({ success: true, message: `You're ready for checkout. Your current total is ₹${cart.totalAmount.toLocaleString('en-IN')}. Let's complete your delivery and payment details.`, showCheckout: true, cart: cartSummary(cart) });
  }

  // Handle Cart Modifications & Product Search
  if (['ADD_TO_CART', 'REMOVE_FROM_CART', 'UPDATE_QUANTITY', 'PRODUCT_SEARCH'].includes(intentType)) {
    const q = (intent.query || trimmed).replace(/^(add|buy|get|find|show me|search for)\s+/i, '').trim();

    // 4-tier MongoDB Search
    const smartSearch = async (query, limit = 6) => {
      if (!query) return [];
      try {
        const txt = await Product.find(
          { isActive: true, $text: { $search: query } },
          { score: { $meta: 'textScore' }, name: 1, price: 1, category: 1, image: 1, imageUrl: 1 }
        ).sort({ score: { $meta: 'textScore' } }).limit(limit).lean();
        if (txt.length > 0) return txt;
      } catch {}

      const byName = await Product.find({ isActive: true, name: { $regex: query, $options: 'i' } }, 'name price category image imageUrl').limit(limit).lean();
      if (byName.length > 0) return byName;

      const byCat = await Product.find({ isActive: true, category: { $regex: query, $options: 'i' } }, 'name price category image imageUrl').limit(limit).lean();
      if (byCat.length > 0) return byCat;

      return Product.find({ isActive: true, tags: { $regex: query, $options: 'i' } }, 'name price category image imageUrl').limit(limit).lean();
    };

    const results = await smartSearch(q);

    // UNAVAILABLE PRODUCT HANDLING
    if (results.length === 0) {
      const fallback = await getCategoryFallbackProducts(q);
      return res.json({
        success: true,
        message: `That item isn't available on SnapBuy right now. We're continuously expanding our selection. Meanwhile, here are some similar options in ${fallback.categoryName} you may like:`,
        items: fallback.items.map(p => ({ id: p._id, name: p.name, price: p.price, category: p.category })),
        intentType: 'PRODUCT_SEARCH'
      });
    }

    if (intentType === 'PRODUCT_SEARCH') {
      return res.json({
        success: true,
        message: `Sure. Here are some options available on SnapBuy:`,
        items: results.map(p => ({ id: p._id, name: p.name, price: p.price, category: p.category })),
        intentType: 'PRODUCT_SEARCH'
      });
    }

    const matchedProduct = results[0];
    if (!cart) cart = new Order({ userId, items: [], subtotalAmount: 0, discountAmount: 0, totalAmount: 0, address: 'Address Pending', status: 'CART' });
    const existingItem = cart.items.find(i => i.name === matchedProduct.name);

    if (intentType === 'REMOVE_FROM_CART') {
      cart.items = cart.items.filter(i => i.name !== matchedProduct.name);
      const discount = cart.couponCode ? await reapplyCoupon(cart, userId) : 0;
      cart.recalculate(discount);
      await cart.save();
      return res.json({ success: true, message: `Removed ${matchedProduct.name} from your cart. Total: ₹${cart.totalAmount.toLocaleString('en-IN')}.`, cart: cartSummary(cart) });
    }

    const qtyToAdd = Math.max(1, parseInt(intent.quantity) || 1);
    if (intentType === 'UPDATE_QUANTITY') {
      if (existingItem) existingItem.qty = qtyToAdd;
      else cart.items.push({ name: matchedProduct.name, qty: qtyToAdd, price: matchedProduct.price });
    } else {
      if (existingItem) existingItem.qty += qtyToAdd;
      else cart.items.push({ name: matchedProduct.name, qty: qtyToAdd, price: matchedProduct.price });
    }

    const discount = cart.couponCode ? await reapplyCoupon(cart, userId) : 0;
    cart.recalculate(discount);
    await cart.save();
    return res.json({
      success: true,
      message: `Done. I've added ${qtyToAdd} × ${matchedProduct.name} to your cart. Current cart total is ₹${cart.totalAmount.toLocaleString('en-IN')}.`,
      cart: cartSummary(cart)
    });
  }

  // General Fallback (No fake product search!)
  return res.json({
    success: true,
    message: "Of course! I can help you find products, manage your cart, apply available offers, or complete your order. What would you like to do?"
  });
});

router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment parameters' });
    }

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) {
      await audit(req.user.userId, 'PAYMENT_CAPTURED', 'FAILURE', razorpay_payment_id, 'Signature mismatch', {});
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id })
                || (req.body.orderId ? await Order.findById(req.body.orderId) : null);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status === 'PAID') {
      return res.json({ success: true, message: 'Payment already recorded.', duplicate: true, receipt: buildReceipt(order, razorpay_payment_id) });
    }

    order.razorpayPaymentId = razorpay_payment_id;
    order.status            = 'PAID';
    order.updatedAt         = new Date();
    await order.save();

    // Record coupon usage
    if (order.couponCode) {
      try {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode },
          {
            $inc:  { usedCount: 1 },
            $push: { usedBy: { userId: order.userId, usedAt: new Date() } },
          }
        );
      } catch (e) { console.warn('[COUPON USAGE] update failed (non-fatal):', e.message); }
    }

    await audit(order.userId, 'PAYMENT_CAPTURED', 'SUCCESS',
      razorpay_payment_id, `Order ${order._id} paid ₹${order.totalAmount}`,
      { orderId: order._id, total: order.totalAmount, coupon: order.couponCode });

    res.json({ success: true, message: 'Payment verified.', receipt: buildReceipt(order, razorpay_payment_id) });
  } catch (err) {
    console.error('[VERIFY]', err.message);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

function buildReceipt(order, paymentId) {
  return {
    orderId:           order._id.toString(),
    razorpayPaymentId: paymentId || order.razorpayPaymentId,
    items:             order.items,
    subtotalAmount:    order.subtotalAmount || order.totalAmount,
    discountAmount:    order.discountAmount || 0,
    couponCode:        order.couponCode || '',
    deliveryCharge:    order.deliveryCharge || 0,
    totalAmount:       order.totalAmount,
    address:           order.address,
    paidAt:            order.updatedAt ? order.updatedAt.toISOString() : new Date().toISOString(),
  };
}

// POST /retry-payment
router.post('/retry-payment', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId required' });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId.toString() !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });
    if (order.status === 'PAID') return res.status(400).json({ error: 'This order is already paid.' });
    if ((order.retryCount || 0) >= 3) return res.status(400).json({ error: 'Maximum retry attempts (3) reached.', maxRetriesReached: true });

    const rzpOrder = await razorpay.orders.create({
      amount:   Math.max(1, order.totalAmount) * 100, currency: 'INR',
      receipt:  `retry${(order.retryCount || 0) + 1}_${order._id.toString().slice(-8)}`,
      notes:    { orderId: order._id.toString(), userId: req.user.userId, retry: 'true' },
    });

    order.razorpayOrderId = rzpOrder.id;
    order.status          = 'RETRY_GENERATED';
    order.retryCount      = (order.retryCount || 0) + 1;
    order.updatedAt       = new Date();
    await order.save();

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

// GET /orders/me
router.get('/orders/me', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId, status: { $nin: ['CART'] } }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, orders });
  } catch (err) {
    console.error('[ORDERS]', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig  = req.headers['x-razorpay-signature'];
    const body = req.rawBody || req.body;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');
    if (sig !== expected) return res.status(400).json({ error: 'Invalid signature' });
    const event = JSON.parse(body);
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const order   = await Order.findOne({ razorpayOrderId: payment.order_id }) || await Order.findById(payment.notes?.orderId);
      if (order && order.status !== 'PAID') {
        order.razorpayPaymentId = payment.id; 
        order.status = 'PAID'; 
        order.trackingStatus = 'PLACED';
        order.trackingUpdates = [{ status: 'PLACED', description: 'Order has been placed successfully.' }];
        order.updatedAt = new Date();
        await order.save();
        if (order.couponCode) {
          await Coupon.findOneAndUpdate({ code: order.couponCode }, { $inc: { usedCount: 1 }, $push: { usedBy: { userId: order.userId, usedAt: new Date() } } });
        }
      }
    }
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const order   = await Order.findOne({ razorpayOrderId: payment.order_id }) || await Order.findById(payment.notes?.orderId);
      if (order && order.status !== 'PAID') { order.status = 'FAILED'; order.updatedAt = new Date(); await order.save(); }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[WEBHOOK]', err.message);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// POST /orders/track/:orderId
router.post('/orders/track/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, userId: req.user.userId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({
      success: true,
      trackingStatus: order.trackingStatus,
      trackingUpdates: order.trackingUpdates,
      deliveryPartner: order.deliveryPartner,
      deliveryPhone: order.deliveryPhone,
      estimatedDelivery: '30-45 minutes'
    });
  } catch (err) {
    console.error('[TRACKING]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking details' });
  }
});

module.exports = router;
