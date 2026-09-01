require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const mongoose = require('mongoose');
const Product  = require('./models/Product');
const Coupon   = require('./models/Coupon');

const img = (seed, w = 300, h = 300) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const catalogConfig = {
  'Tech Essentials': {
    bases: ['Wireless Mouse', 'Mechanical Keyboard', 'USB-C Cable', 'USB-C Hub', 'Laptop Stand', 'Monitor Stand', 'Webcam 1080p', 'Noise Cancelling Headphones', 'Wired Earphones', 'Power Bank 20000mAh', 'Phone Stand', 'Portable SSD 1TB', 'Pendrive 64GB', 'HDMI Cable', 'Ethernet Cable'],
    variants: [
      { modifier: 'Standard', priceMult: 1 },
      { modifier: 'Pro', priceMult: 1.8 }
    ],
    basePrice: 499
  },
  'Study & Essentials': {
    bases: ['Notebook Set', 'Gel Pens Pack', 'Highlighters Set', 'Sticky Notes Pack', 'Study Planner', 'Backpack', 'Laptop Bag', 'Scientific Calculator', 'Desk Organizer'],
    variants: [
      { modifier: 'Single', priceMult: 1 },
      { modifier: 'Bundle Pack', priceMult: 1.6 }
    ],
    basePrice: 199
  },
  'Work From Home': {
    bases: ['Desk Lamp', 'Ergonomic Chair', 'Monitor Light Bar', 'Desk Mat', 'Cable Organizer', 'Whiteboard', 'Productivity Timer'],
    variants: [
      { modifier: 'Classic', priceMult: 1 },
      { modifier: 'Deluxe', priceMult: 2.2 }
    ],
    basePrice: 599
  },
  'Daily Professional Use': {
    bases: ['Instant Coffee 100g', 'Cold Brew Coffee', 'Travel Mug', 'Stainless Water Bottle', 'Personal Care Grooming Kit'],
    variants: [
      { modifier: 'Standard', priceMult: 1 },
      { modifier: 'Premium', priceMult: 1.5 }
    ],
    basePrice: 249
  }
};

const PRODUCTS = [];
let skuCounter = 1;

for (const [category, config] of Object.entries(catalogConfig)) {
  for (const baseItem of config.bases) {
    for (const variant of config.variants) {
      const price = Math.round(config.basePrice * variant.priceMult);
      const name = `${baseItem} - ${variant.modifier}`;
      const skuStr = skuCounter.toString().padStart(4, '0');
      const seedStr = encodeURIComponent(baseItem.toLowerCase().replace(/ /g, ''));
      
      PRODUCTS.push({
        name,
        price,
        category,
        description: `High quality ${baseItem} (${variant.modifier}) tailored for students, developers, and working professionals.`,
        tags: [baseItem.toLowerCase(), category.toLowerCase(), 'student', 'developer', 'tech'],
        sku: `SNAP-${category.substring(0,3).toUpperCase()}-${skuStr}`,
        image: img(seedStr, 300, 300)
      });
      skuCounter++;
    }
  }
}

// Add simple standalone products as well (e.g., "Coffee", "Wireless Mouse", "Laptop Stand", "Desk Lamp")
const STANDALONE = [
  { name: 'Coffee', price: 150, category: 'Daily Professional Use', tags: ['coffee', 'beverage'] },
  { name: 'Wireless Mouse', price: 899, category: 'Tech Essentials', tags: ['mouse', 'tech'] },
  { name: 'Desk Lamp', price: 699, category: 'Work From Home', tags: ['lamp', 'desk'] },
  { name: 'Laptop Stand', price: 1299, category: 'Work From Home', tags: ['laptop', 'stand'] },
  { name: 'USB-C Cable', price: 299, category: 'Tech Essentials', tags: ['cable', 'usb'] }
];

STANDALONE.forEach((p, idx) => {
  PRODUCTS.push({
    name: p.name,
    price: p.price,
    category: p.category,
    description: `Premium ${p.name} built for peak productivity.`,
    tags: p.tags,
    sku: `SNAP-CORE-${idx + 1}`,
    image: img(p.name.toLowerCase(), 300, 300)
  });
});

const COUPONS = [
  { code: 'WELCOME10', description: '10% OFF on order above ₹500', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 500, maxDiscount: 200, isActive: true },
  { code: 'STUDENT15', description: '15% OFF on order above ₹1000', discountType: 'PERCENTAGE', discountValue: 15, minOrderAmount: 1000, maxDiscount: 300, isActive: true },
  { code: 'TECH20', description: '20% OFF on order above ₹1500', discountType: 'PERCENTAGE', discountValue: 20, minOrderAmount: 1500, maxDiscount: 400, isActive: true }
];

async function seed() {
  try {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('[SEED] MongoDB Connected (Primary URI)');
    } catch (err) {
      console.warn('[SEED] Primary MongoDB Connection Failed, using local fallback...');
      await mongoose.connect('mongodb://127.0.0.1:27017/agentic_checkout', { serverSelectionTimeoutMS: 5000 });
      console.log('[SEED] MongoDB Connected (Local Fallback)');
    }

    await Product.deleteMany({});
    const inserted = await Product.insertMany(PRODUCTS);
    console.log(`[SEED] Products: deleted all, inserted ${inserted.length}`);

    for (const c of COUPONS) {
      await Coupon.findOneAndUpdate({ code: c.code }, { $set: c }, { upsert: true, new: true });
    }
    console.log('[SEED] Coupons updated.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err.message);
    process.exit(1);
  }
}
seed();
