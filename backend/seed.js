const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB Connected (Primary URI)');
  } catch (err) {
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/agentic_checkout', { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB Connected (Local Fallback)');
    } catch (e) {
      console.error('All MongoDB connections failed:', e.message);
      process.exit(1);
    }
  }
};

// Explicit products to guarantee key searches always work
const EXPLICIT_PRODUCTS = [
  // Chocolates
  { name: 'Milk Chocolate Bar', category: 'Chocolates & Confectionery', subcategory: 'Milk Chocolate', price: 60, tags: ['chocolate','chocolates','milk chocolate','sweet','cocoa','choco'] },
  { name: 'Dark Chocolate 70%', category: 'Chocolates & Confectionery', subcategory: 'Dark Chocolate', price: 80, tags: ['chocolate','chocolates','dark chocolate','sweet','cocoa','choco'] },
  { name: 'White Chocolate Slab', category: 'Chocolates & Confectionery', subcategory: 'White Chocolate', price: 75, tags: ['chocolate','chocolates','white chocolate','sweet','cocoa','choco'] },
  { name: 'Hazelnut Chocolate Box', category: 'Chocolates & Confectionery', subcategory: 'Hazelnut Chocolate', price: 149, tags: ['chocolate','chocolates','hazelnut','sweet','cocoa','choco','gift'] },
  { name: 'Caramel Chocolate Bar', category: 'Chocolates & Confectionery', subcategory: 'Caramel Chocolate', price: 90, tags: ['chocolate','chocolates','caramel','sweet','choco'] },
  { name: 'Almond Chocolate Bar', category: 'Chocolates & Confectionery', subcategory: 'Almond Chocolate', price: 99, tags: ['chocolate','chocolates','almond','sweet','choco','nuts'] },
  { name: 'Wafer Chocolate Bar', category: 'Chocolates & Confectionery', subcategory: 'Wafer Chocolate', price: 30, tags: ['chocolate','chocolates','wafer','sweet','choco','crispy'] },
  { name: 'Premium Assorted Chocolates', category: 'Chocolates & Confectionery', subcategory: 'Assorted Chocolates', price: 299, tags: ['chocolate','chocolates','assorted','gift','premium','sweet','choco'] },
  { name: 'Mini Chocolate Bites Pack', category: 'Chocolates & Confectionery', subcategory: 'Mini Chocolates', price: 120, tags: ['chocolate','chocolates','mini','sweet','choco','bites'] },
  { name: 'Chocolate Gift Pack', category: 'Chocolates & Confectionery', subcategory: 'Gift Chocolates', price: 399, tags: ['chocolate','chocolates','gift','premium','sweet','choco'] },

  // Snacks
  { name: 'Salted Potato Chips', category: 'Snacks', subcategory: 'Potato Chips', price: 20, tags: ['chips','snacks','potato chips','salty','crisps','namkeen'] },
  { name: 'Masala Potato Chips', category: 'Snacks', subcategory: 'Masala Chips', price: 20, tags: ['chips','snacks','masala chips','salty','crisps'] },
  { name: 'Cheese Nachos', category: 'Snacks', subcategory: 'Nachos', price: 35, tags: ['nachos','snacks','cheese','salty','crisps'] },
  { name: 'Butter Popcorn', category: 'Snacks', subcategory: 'Popcorn', price: 30, tags: ['popcorn','snacks','butter','salty','movie snacks'] },
  { name: 'Roasted Salted Peanuts', category: 'Snacks', subcategory: 'Peanuts', price: 25, tags: ['peanuts','snacks','nuts','salty','roasted'] },
  { name: 'Classic Namkeen Mix', category: 'Snacks', subcategory: 'Namkeen', price: 40, tags: ['namkeen','snacks','salty','indian snacks','mixture'] },
  { name: 'Bhujia Sev', category: 'Snacks', subcategory: 'Bhujia', price: 35, tags: ['bhujia','snacks','sev','namkeen','salty','indian snacks'] },
  { name: 'Corn Chips Original', category: 'Snacks', subcategory: 'Corn Snacks', price: 25, tags: ['corn chips','snacks','salty','crunchy'] },
  { name: 'Trail Mix Nuts & Berries', category: 'Snacks', subcategory: 'Trail Mix', price: 80, tags: ['trail mix','snacks','nuts','healthy','berries'] },

  // Biscuits
  { name: 'Glucose Biscuits Pack', category: 'Biscuits & Cookies', subcategory: 'Glucose Biscuits', price: 15, tags: ['biscuits','cookies','glucose biscuits','snack','tea time'] },
  { name: 'Butter Biscuits', category: 'Biscuits & Cookies', subcategory: 'Butter Biscuits', price: 25, tags: ['biscuits','cookies','butter biscuits','snack','tea time'] },
  { name: 'Cream Sandwich Biscuits', category: 'Biscuits & Cookies', subcategory: 'Cream Biscuits', price: 30, tags: ['biscuits','cookies','cream biscuits','snack','sandwich biscuits'] },
  { name: 'Chocolate Biscuits', category: 'Biscuits & Cookies', subcategory: 'Chocolate Biscuits', price: 35, tags: ['biscuits','cookies','chocolate biscuits','snack','chocolate'] },
  { name: 'Digestive Biscuits', category: 'Biscuits & Cookies', subcategory: 'Digestive Biscuits', price: 55, tags: ['biscuits','cookies','digestive','healthy biscuits','wheat'] },
  { name: 'Coconut Cookies', category: 'Biscuits & Cookies', subcategory: 'Coconut Biscuits', price: 30, tags: ['biscuits','cookies','coconut','snack','tea time'] },
  { name: 'Salt Crackers', category: 'Biscuits & Cookies', subcategory: 'Salt Biscuits', price: 20, tags: ['biscuits','cookies','crackers','salt biscuits','salty'] },
  { name: 'Oat Cookies Healthy', category: 'Biscuits & Cookies', subcategory: 'Oat Biscuits', price: 60, tags: ['biscuits','cookies','oat','healthy','oats'] },
  { name: 'Chocolate Chip Cookies', category: 'Biscuits & Cookies', subcategory: 'Cookies', price: 75, tags: ['biscuits','cookies','chocolate chip','snack'] },

  // Coffee
  { name: 'Instant Coffee Powder 100g', category: 'Coffee & Tea', subcategory: 'Instant Coffee', price: 120, tags: ['coffee','instant coffee','brew','caffeine','hot drink'] },
  { name: 'Filter Coffee Blend 250g', category: 'Coffee & Tea', subcategory: 'Filter Coffee', price: 180, tags: ['coffee','filter coffee','brew','south indian coffee'] },
  { name: 'Ground Coffee Premium', category: 'Coffee & Tea', subcategory: 'Ground Coffee', price: 250, tags: ['coffee','ground coffee','premium','brew','arabica'] },
  { name: 'Cold Coffee Mix Sachet', category: 'Coffee & Tea', subcategory: 'Cold Coffee', price: 30, tags: ['coffee','cold coffee','iced coffee','sachet'] },
  { name: 'Green Tea Bags 25pc', category: 'Coffee & Tea', subcategory: 'Green Tea', price: 90, tags: ['tea','green tea','healthy tea','antioxidant'] },
  { name: 'Masala Chai Blend 250g', category: 'Coffee & Tea', subcategory: 'Masala Tea', price: 110, tags: ['tea','masala tea','chai','indian tea','spiced tea'] },
  { name: 'Black Tea Premium Leaves', category: 'Coffee & Tea', subcategory: 'Black Tea', price: 95, tags: ['tea','black tea','premium tea','leaves'] },
  { name: 'Ginger Lemon Tea Bags', category: 'Coffee & Tea', subcategory: 'Herbal Tea', price: 80, tags: ['tea','herbal tea','ginger tea','lemon tea','health'] },

  // Beverages
  { name: 'Mango Fruit Juice 1L', category: 'Beverages', subcategory: 'Fruit Juice', price: 90, tags: ['juice','beverages','mango juice','fruit juice','drink'] },
  { name: 'Orange Juice 500ml', category: 'Beverages', subcategory: 'Fruit Juice', price: 50, tags: ['juice','beverages','orange juice','fruit juice','drink'] },
  { name: 'Coconut Water 330ml', category: 'Beverages', subcategory: 'Coconut Water', price: 35, tags: ['coconut water','beverages','healthy drink','natural'] },
  { name: 'Energy Drink Can 250ml', category: 'Beverages', subcategory: 'Energy Drink', price: 99, tags: ['energy drink','beverages','caffeine','boost','drink'] },
  { name: 'Sparkling Water 500ml', category: 'Beverages', subcategory: 'Sparkling Water', price: 40, tags: ['sparkling water','beverages','soda','carbonated','water'] },
  { name: 'Flavoured Milk Chocolate 200ml', category: 'Beverages', subcategory: 'Flavoured Milk', price: 30, tags: ['milk','beverages','chocolate milk','flavoured','drink'] },
  { name: 'Lemon Soda Drink 300ml', category: 'Beverages', subcategory: 'Soda', price: 25, tags: ['soda','beverages','lemon','cold drink','fizzy'] },

  // Breakfast
  { name: 'Corn Flakes 500g', category: 'Breakfast & Cereals', subcategory: 'Corn Flakes', price: 110, tags: ['corn flakes','breakfast','cereal','morning','milk'] },
  { name: 'Oats 1kg', category: 'Breakfast & Cereals', subcategory: 'Oats', price: 130, tags: ['oats','breakfast','healthy','cereal','porridge'] },
  { name: 'Granola Honey Nut 400g', category: 'Breakfast & Cereals', subcategory: 'Granola', price: 199, tags: ['granola','breakfast','cereal','nuts','honey'] },
  { name: 'Peanut Butter Creamy 350g', category: 'Breakfast & Cereals', subcategory: 'Peanut Butter', price: 220, tags: ['peanut butter','breakfast','spread','protein'] },

  // Dairy
  { name: 'Fresh Curd 400g', category: 'Dairy & Eggs', subcategory: 'Curd', price: 40, tags: ['curd','dairy','yogurt','fresh'] },
  { name: 'Salted Butter 100g', category: 'Dairy & Eggs', subcategory: 'Butter', price: 55, tags: ['butter','dairy','salted','spread'] },
  { name: 'Paneer 200g', category: 'Dairy & Eggs', subcategory: 'Paneer', price: 90, tags: ['paneer','dairy','cheese','cottage cheese'] },
  { name: 'Eggs Pack of 12', category: 'Dairy & Eggs', subcategory: 'Eggs', price: 84, tags: ['eggs','dairy','protein','dozen'] },

  // Groceries
  { name: 'Basmati Rice 1kg', category: 'Groceries', subcategory: 'Rice', price: 95, tags: ['rice','groceries','staple','basmati','grain'] },
  { name: 'Whole Wheat Atta 1kg', category: 'Groceries', subcategory: 'Atta', price: 65, tags: ['atta','groceries','wheat flour','staple','roti'] },
  { name: 'Toor Dal 500g', category: 'Groceries', subcategory: 'Dal', price: 80, tags: ['dal','groceries','pulses','toor dal','lentils'] },
  { name: 'Sunflower Cooking Oil 1L', category: 'Groceries', subcategory: 'Cooking Oil', price: 150, tags: ['cooking oil','groceries','oil','sunflower'] },
  { name: 'Sugar 1kg', category: 'Groceries', subcategory: 'Sugar', price: 50, tags: ['sugar','groceries','sweet','staple'] },
  { name: 'Iodized Salt 1kg', category: 'Groceries', subcategory: 'Salt', price: 25, tags: ['salt','groceries','iodized','staple'] },
  { name: 'Cumin Seeds 100g', category: 'Groceries', subcategory: 'Spices', price: 35, tags: ['spices','groceries','cumin','masala','jeera'] },
  { name: 'Mixed Dry Fruits 250g', category: 'Groceries', subcategory: 'Dry Fruits', price: 250, tags: ['dry fruits','groceries','nuts','healthy','raisins'] },

  // Personal Care
  { name: 'Anti-Dandruff Shampoo 400ml', category: 'Personal Care', subcategory: 'Shampoo', price: 180, tags: ['shampoo','personal care','hair care','anti-dandruff'] },
  { name: 'Moisturizing Body Wash 250ml', category: 'Personal Care', subcategory: 'Body Wash', price: 150, tags: ['body wash','personal care','shower','moisturizing'] },
  { name: 'Toothpaste Whitening 150g', category: 'Personal Care', subcategory: 'Toothpaste', price: 85, tags: ['toothpaste','personal care','dental','whitening','oral care'] },
  { name: 'Fresh Deodorant Spray 150ml', category: 'Personal Care', subcategory: 'Deodorant', price: 175, tags: ['deodorant','personal care','body spray','fresh'] },
  { name: 'SPF50 Sunscreen 75ml', category: 'Personal Care', subcategory: 'Sunscreen', price: 220, tags: ['sunscreen','personal care','skin care','spf','sun protection'] },
  { name: 'Antibacterial Hand Wash 300ml', category: 'Personal Care', subcategory: 'Hand Wash', price: 90, tags: ['hand wash','personal care','antibacterial','hygiene'] },
  { name: 'Coconut Hair Oil 200ml', category: 'Personal Care', subcategory: 'Hair Oil', price: 110, tags: ['hair oil','personal care','coconut','hair care'] },
  { name: 'Face Wash Gel 100ml', category: 'Personal Care', subcategory: 'Face Wash', price: 95, tags: ['face wash','personal care','skin care','gel','cleanse'] },

  // Household Cleaning
  { name: 'Liquid Dishwash 500ml', category: 'Household Cleaning', subcategory: 'Dishwash', price: 75, tags: ['dishwash','cleaning','household','dishes','detergent'] },
  { name: 'Floor Cleaner 1L', category: 'Household Cleaning', subcategory: 'Floor Cleaner', price: 120, tags: ['floor cleaner','cleaning','household','mop'] },
  { name: 'Washing Detergent Powder 1kg', category: 'Household Cleaning', subcategory: 'Detergent', price: 110, tags: ['detergent','cleaning','laundry','washing powder','household'] },
  { name: 'Toilet Cleaner 500ml', category: 'Household Cleaning', subcategory: 'Toilet Cleaner', price: 85, tags: ['toilet cleaner','cleaning','bathroom','household'] },
  { name: 'Garbage Bags 30pc', category: 'Household Cleaning', subcategory: 'Garbage Bags', price: 65, tags: ['garbage bags','cleaning','household','trash bags'] },
  { name: 'Tissue Box 100 Sheets', category: 'Household Cleaning', subcategory: 'Tissue', price: 50, tags: ['tissue','cleaning','household','paper','napkins'] },

  // Student
  { name: 'A4 Notebook 200 Pages', category: 'Student Essentials', subcategory: 'Notebooks', price: 55, tags: ['notebook','student','stationery','college','school'] },
  { name: 'Blue Ball Pen Pack of 10', category: 'Student Essentials', subcategory: 'Pens', price: 40, tags: ['pen','student','stationery','writing','blue pen'] },
  { name: 'Pastel Highlighters Set', category: 'Student Essentials', subcategory: 'Highlighters', price: 75, tags: ['highlighter','student','stationery','college','color'] },
  { name: 'Scientific Calculator', category: 'Student Essentials', subcategory: 'Calculators', price: 350, tags: ['calculator','student','scientific','math','college'] },
  { name: 'College Backpack', category: 'Student Essentials', subcategory: 'Backpacks', price: 699, tags: ['backpack','student','bag','college','school'] },
  { name: 'Sticky Notes Combo Pack', category: 'Student Essentials', subcategory: 'Sticky Notes', price: 60, tags: ['sticky notes','student','stationery','post-it','notes'] },

  // Electronics
  { name: 'Wireless Mouse Ergonomic', category: 'Electronics', subcategory: 'Wireless Mouse', price: 599, tags: ['wireless mouse','electronics','computer','mouse','bluetooth'] },
  { name: 'Mechanical Keyboard RGB', category: 'Electronics', subcategory: 'Mechanical Keyboard', price: 2499, tags: ['mechanical keyboard','electronics','keyboard','gaming','rgb'] },
  { name: 'USB-C Fast Charger 65W', category: 'Electronics', subcategory: 'Chargers', price: 899, tags: ['charger','electronics','usb-c','fast charging','adapter'] },
  { name: 'Wireless Earbuds TWS', category: 'Electronics', subcategory: 'Earphones', price: 1299, tags: ['earbuds','electronics','wireless','bluetooth','audio'] },
  { name: 'Power Bank 20000mAh', category: 'Electronics', subcategory: 'Power Banks', price: 1599, tags: ['power bank','electronics','charging','portable','battery'] },
  { name: 'USB Drive 64GB', category: 'Electronics', subcategory: 'USB Drives', price: 499, tags: ['usb drive','electronics','storage','flash drive','pendrive'] },
  { name: 'HDMI Cable 2m', category: 'Electronics', subcategory: 'HDMI Cables', price: 299, tags: ['hdmi cable','electronics','cable','display','4k'] },
  { name: 'Laptop Stand Adjustable', category: 'Office & Work', subcategory: 'Laptop Stands', price: 899, tags: ['laptop stand','office','work from home','ergonomic'] },
  { name: 'Mouse Pad Large', category: 'Office & Work', subcategory: 'Mouse Pads', price: 199, tags: ['mouse pad','office','desk','work','gaming'] },
];

// Generate additional products to fill up to 1587
const subcategoriesMap = {
  'Groceries': { items: ['Rice', 'Wheat', 'Atta', 'Sugar', 'Salt', 'Pulses', 'Dal', 'Cooking Oil', 'Spices', 'Dry Fruits', 'Nuts'], keywords: ['groceries','staple','food','pantry'] },
  'Snacks': { items: ['Potato Chips', 'Masala Chips', 'Nachos', 'Popcorn', 'Peanuts', 'Namkeen', 'Mixture', 'Bhujia', 'Corn Snacks'], keywords: ['snacks','chips','namkeen','salty','crunchy'] },
  'Biscuits & Cookies': { items: ['Glucose Biscuits', 'Butter Biscuits', 'Cream Biscuits', 'Chocolate Biscuits', 'Digestive Biscuits', 'Coconut Biscuits', 'Salt Crackers', 'Oat Biscuits', 'Cookies'], keywords: ['biscuits','cookies','snack','tea time'] },
  'Chocolates & Confectionery': { items: ['Milk Chocolate', 'Dark Chocolate', 'White Chocolate', 'Caramel Chocolate', 'Hazelnut Chocolate', 'Almond Chocolate', 'Wafer Chocolate', 'Chocolate Bars', 'Mini Chocolates'], keywords: ['chocolate','chocolates','sweet','choco','cocoa','candy','confectionery'] },
  'Beverages': { items: ['Fruit Juice', 'Energy Drink', 'Coconut Water', 'Sparkling Water', 'Flavoured Milk', 'Soda', 'Cold Drink', 'Milkshake'], keywords: ['beverages','drinks','juice','cold drink'] },
  'Coffee & Tea': { items: ['Instant Coffee', 'Filter Coffee', 'Ground Coffee', 'Green Tea', 'Masala Tea', 'Black Tea', 'Herbal Tea', 'Tea Bags'], keywords: ['coffee','tea','brew','caffeine','hot drink'] },
  'Breakfast & Cereals': { items: ['Corn Flakes', 'Muesli', 'Oats', 'Granola', 'Peanut Butter', 'Jam', 'Honey'], keywords: ['breakfast','cereal','morning','healthy'] },
  'Instant Food & Noodles': { items: ['Instant Noodles', 'Pasta', 'Macaroni', 'Soup', 'Ready-to-eat', 'Noodles'], keywords: ['noodles','instant food','pasta','quick meal','maggi'] },
  'Bakery': { items: ['Bread', 'Buns', 'Cakes', 'Muffins', 'Croissants', 'Pav'], keywords: ['bakery','bread','cake','muffin','baked'] },
  'Dairy & Eggs': { items: ['Milk', 'Curd', 'Yogurt', 'Butter', 'Cheese', 'Paneer', 'Eggs'], keywords: ['dairy','milk','eggs','fresh','protein'] },
  'Fruits': { items: ['Apples', 'Bananas', 'Oranges', 'Grapes', 'Mangoes', 'Papaya', 'Watermelon'], keywords: ['fruits','fresh fruits','healthy','natural'] },
  'Vegetables': { items: ['Onions', 'Potatoes', 'Tomatoes', 'Carrots', 'Cabbage', 'Spinach', 'Capsicum'], keywords: ['vegetables','veggies','fresh','greens'] },
  'Personal Care': { items: ['Shampoo', 'Conditioner', 'Soap', 'Body Wash', 'Face Wash', 'Toothpaste', 'Toothbrush', 'Deodorant', 'Moisturizer', 'Sunscreen', 'Hair Oil', 'Hand Wash'], keywords: ['personal care','hygiene','beauty','grooming','skin care','hair care'] },
  'Household Cleaning': { items: ['Detergent', 'Dishwash', 'Floor Cleaner', 'Toilet Cleaner', 'Glass Cleaner', 'Garbage Bags', 'Sponges', 'Tissue', 'Paper Towels'], keywords: ['cleaning','household','detergent','cleaner','home'] },
  'Student Essentials': { items: ['Notebooks', 'Pens', 'Pencils', 'Highlighters', 'Files', 'Folders', 'Calculators', 'Sticky Notes', 'Backpacks', 'Desk Organizers'], keywords: ['student','stationery','college','school','study'] },
  'Office & Work': { items: ['Printer Paper', 'Staplers', 'Markers', 'Mouse Pads', 'Laptop Stands', 'Desk Organizers', 'Pens'], keywords: ['office','work','stationery','desk','professional'] },
  'Electronics': { items: ['Wireless Mouse', 'Mechanical Keyboard', 'USB Cables', 'HDMI Cables', 'Chargers', 'Power Banks', 'Earphones', 'Headphones', 'USB Drives', 'Webcams', 'Phone Cases'], keywords: ['electronics','gadgets','tech','digital','accessories'] },
};

const categories = Object.keys(subcategoriesMap);
const variants = ['100g', '200g', '250g', '500g', '1kg', '1L', '500ml', 'Pack', 'Set', '6pc', '12pc', 'Small', 'Medium', 'Large', 'Premium', 'Economy'];
const prefixes = ['Fresh', 'Premium', 'Classic', 'Natural', 'Organic', 'Pure', 'Rich', 'Best', 'Original', 'Quality'];

const generateProducts = (num) => {
  const products = [];
  for (let i = 0; i < num; i++) {
    const category = categories[i % categories.length];
    const catData = subcategoriesMap[category];
    const subcategory = catData.items[Math.floor(Math.random() * catData.items.length)];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const name = `${prefix} ${subcategory} ${variant}`;
    const isFood = !['Electronics', 'Student Essentials', 'Office & Work'].includes(category);
    const price = Math.floor(Math.random() * (isFood ? 480 : 4980) + 20);

    products.push({
      name,
      description: `${prefix} quality ${subcategory.toLowerCase()} for your daily needs.`,
      price,
      originalPrice: Math.floor(price * 1.2),
      stock: Math.floor(Math.random() * 490 + 10),
      category,
      subcategory,
      rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      reviews: Math.floor(Math.random() * 2000),
      tags: [
        subcategory.toLowerCase(),
        category.toLowerCase(),
        ...catData.keywords,
      ],
      isActive: true,
    });
  }
  return products;
};

async function seed() {
  await connectDB();
  try {
    console.log('Clearing old products...');
    await Product.deleteMany({});

    // Drop text index so we can recreate with new schema fields
    try { await Product.collection.dropIndex('name_text_description_text_category_text_tags_text'); } catch {}
    try { await Product.collection.dropIndex('name_text_subcategory_text_category_text_tags_text_description_text'); } catch {}

    // Insert explicit guaranteed products first
    console.log(`Inserting ${EXPLICIT_PRODUCTS.length} explicit products...`);
    await Product.insertMany(EXPLICIT_PRODUCTS.map(p => ({ ...p, isActive: true, stock: p.stock || 100 })));

    const remaining = 1587 - EXPLICIT_PRODUCTS.length;
    console.log(`Generating ${remaining} additional products...`);
    const generated = generateProducts(remaining);
    await Product.insertMany(generated);

    const count = await Product.countDocuments();
    console.log('\nProducts seeded successfully.');
    console.log('Total products:', count);

    const cats = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    cats.forEach(c => console.log(`  ${c._id}: ${c.count}`));

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
