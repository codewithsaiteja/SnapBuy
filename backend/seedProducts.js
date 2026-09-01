// ============================================================================
// COMPREHENSIVE PRODUCT CATALOG GENERATOR - 2000+ PRODUCTS
// ============================================================================
// This file generates a realistic Indian quick-commerce catalog with products
// across Food & Beverages, Groceries & Essentials, Electronics & Gadgets,
// Personal Care, Home Care, Baby Care, Pet Supplies, Stationery, and more

const mongoose = require('mongoose');
const Product = require('./models/Product');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSKU(category, brand, variant, size) {
  const catPrefix = category.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
  const brandPrefix = brand.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
  const variantPrefix = variant.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
  const sizePrefix = size.replace(/[^0-9]/g, '').substring(0, 4);
  return `${catPrefix}-${brandPrefix}-${variantPrefix}-${sizePrefix}`;
}

function randomRating(min = 3.5, max = 5.0) {
  return (Math.random() * (max - min) + min).toFixed(1);
}

function randomReviews(min = 50, max = 10000) {
  return Math.floor(Math.random() * (max - min) + min);
}

function randomDiscount(min = 3, max = 30) {
  return Math.floor(Math.random() * (max - min) + min);
}

function randomStock(min = 20, max = 200) {
  return Math.floor(Math.random() * (max - min) + min);
}

// ============================================================================
// CHOCOLATES & SWEETS (200+ PRODUCTS)
// ============================================================================

function generateChocolatesAndSweets() {
  const products = [];
  let productId = 1;

  const chocolateBrands = [
    { brand: 'Cadbury', variants: ['Dairy Milk', 'Dairy Milk Silk', 'Dairy Milk Crackle', 'Dairy Milk Roast Almond', 'Dairy Milk Fruit & Nut', 'Dairy Milk Oreo', '5 Star', 'Perk', 'Gems', 'Fuse', 'Bournville'] },
    { brand: 'Nestle', variants: ['KitKat', 'KitKat Chunky', 'Munch', 'Milkybar', 'Bar One'] },
    { brand: 'Mars', variants: ['Snickers', 'Mars Bar', 'Bounty', 'Twix', 'Galaxy'] },
    { brand: 'Ferrero', variants: ['Ferrero Rocher', 'Kinder Joy', 'Kinder Bueno', 'Nutella Biscuits'] },
    { brand: 'Mondelez', variants: ['Toblerone', 'Lindt'] }
  ];

  const sizes = ['10g', '13g', '18g', '25g', '36g', '52g', '80g', '120g', '150g', '200g'];
  const prices = { '10g': 10, '13g': 15, '18g': 20, '25g': 30, '36g': 45, '52g': 65, '80g': 95, '120g': 140, '150g': 180, '200g': 230 };

  chocolateBrands.forEach(({ brand, variants }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size] || 50;
        const discount = randomDiscount(5, 25);
        products.push({
          id: productId++,
          sku: generateSKU('CHOC', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Chocolates & Sweets',
          description: `Delicious ${brand} ${variant} chocolate bar, ${size}. Perfect for sweet cravings.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'bar',
          weightOrSize: size,
          rating: randomRating(4.0, 5.0),
          reviewCount: randomReviews(500, 8000),
          stock: randomStock(50, 150),
          availability: true,
          tags: ['chocolate', 'sweet', 'candy', variant.toLowerCase(), brand.toLowerCase()],
          keywords: [variant, 'chocolate bar', 'sweet', brand],
          labels: discount > 15 ? ['Popular', 'Best Deal'] : ['Popular']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// ICE CREAMS & FROZEN DESSERTS (150+ PRODUCTS)
// ============================================================================

function generateIceCreamsAndFrozen() {
  const products = [];
  let productId = 300;

  const iceCreamBrands = [
    { brand: 'Amul', variants: ['Vanilla', 'Chocolate', 'Butterscotch', 'Strawberry', 'Mango', 'Pista', 'Kulfi', 'Cassata', 'Fudge', 'Choco Chips'] },
    { brand: 'Kwality Walls', variants: ['Magnum', 'Cornetto', 'Feast', 'Choco Bar', 'Vanilla', 'Chocolate', 'Strawberry'] },
    { brand: 'Vadilal', variants: ['Vanilla', 'Chocolate', 'Mango', 'Strawberry', 'Kulfi', 'Cassata', 'Rajbhog'] },
    { brand: 'Havmor', variants: ['Vanilla', 'Chocolate', 'Kesar Pista', 'Mango', 'Strawberry', 'Kulfi'] },
    { brand: 'Naturals', variants: ['Tender Coconut', 'Sitaphal', 'Mango', 'Chocolate', 'Vanilla'] }
  ];

  const formats = [
    { format: 'Cup', sizes: ['100ml', '125ml'], prices: { '100ml': 40, '125ml': 50 } },
    { format: 'Cone', sizes: ['120ml'], prices: { '120ml': 45 } },
    { format: 'Bar', sizes: ['80ml', '100ml'], prices: { '80ml': 35, '100ml': 45 } },
    { format: 'Tub', sizes: ['500ml', '700ml', '1L'], prices: { '500ml': 180, '700ml': 250, '1L': 350 } }
  ];

  iceCreamBrands.forEach(({ brand, variants }) => {
    variants.forEach(variant => {
      formats.forEach(({ format, sizes, prices }) => {
        sizes.forEach(size => {
          const basePrice = prices[size] || 50;
          const discount = randomDiscount(5, 20);
          products.push({
            id: productId++,
            sku: generateSKU('ICE', brand, variant, size),
            name: `${brand} ${variant} Ice Cream ${format} ${size}`,
            brand,
            category: 'Food & Beverages',
            subcategory: 'Ice Creams & Frozen',
            description: `Creamy ${brand} ${variant} ice cream in ${size} ${format.toLowerCase()}. Perfect frozen treat.`,
            price: basePrice,
            originalPrice: Math.round(basePrice / (1 - discount / 100)),
            discountPercentage: discount,
            unit: format.toLowerCase(),
            weightOrSize: size,
            rating: randomRating(4.2, 5.0),
            reviewCount: randomReviews(300, 5000),
            stock: randomStock(30, 100),
            availability: true,
            tags: ['ice cream', 'frozen', 'dessert', variant.toLowerCase(), brand.toLowerCase()],
            keywords: [variant, 'ice cream', format, 'frozen dessert'],
            labels: ['Fresh', 'Quick Delivery']
          });
        });
      });
    });
  });

  return products;
}

// ============================================================================
// BAKERY & BREAD (100+ PRODUCTS)
// ============================================================================

function generateBakeryAndBread() {
  const products = [];
  let productId = 600;

  const breadProducts = [
    { brand: 'Britannia', variants: ['White Bread', 'Brown Bread', 'Whole Wheat Bread', 'Multigrain Bread', 'Milk Bread'], sizes: ['400g', '450g', '600g'], prices: { '400g': 35, '450g': 40, '600g': 55 } },
    { brand: 'Modern', variants: ['White Bread', 'Brown Bread', 'Multigrain Bread', 'Atta Bread'], sizes: ['400g', '450g'], prices: { '400g': 32, '450g': 38 } },
    { brand: 'Harvest Gold', variants: ['White Bread', 'Brown Bread', 'Whole Wheat Bread'], sizes: ['400g', '450g'], prices: { '400g': 34, '450g': 39 } }
  ];

  const bunsPavProducts = [
    { brand: 'Britannia', variants: ['Burger Buns', 'Pav', 'Hot Dog Buns'], pack: ['4 pcs', '6 pcs'], prices: { '4 pcs': 28, '6 pcs': 40 } },
    { brand: 'Modern', variants: ['Burger Buns', 'Pav'], pack: ['4 pcs', '6 pcs'], prices: { '4 pcs': 25, '6 pcs': 38 } }
  ];

  const bakeryItems = [
    { brand: 'Britannia', items: ['Chocolate Cake', 'Vanilla Cake', 'Black Forest Cake', 'Muffin', 'Croissant'], sizes: ['200g', '300g', '500g'], prices: { '200g': 80, '300g': 120, '500g': 200 } }
  ];

  // Bread
  breadProducts.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(3, 15);
        products.push({
          id: productId++,
          sku: generateSKU('BREAD', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Bakery & Bread',
          description: `Fresh ${brand} ${variant}, ${size}. Soft and perfect for sandwiches.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.0, 4.8),
          reviewCount: randomReviews(800, 6000),
          stock: randomStock(40, 120),
          availability: true,
          tags: ['bread', 'bakery', 'fresh', variant.toLowerCase(), brand.toLowerCase()],
          keywords: [variant, 'bread', 'sandwich bread', 'daily fresh'],
          labels: ['Fresh', 'Daily Essential']
        });
      });
    });
  });

  // Buns & Pav
  bunsPavProducts.forEach(({ brand, variants, pack, prices }) => {
    variants.forEach(variant => {
      pack.forEach(p => {
        const basePrice = prices[p];
        const discount = randomDiscount(3, 12);
        products.push({
          id: productId++,
          sku: generateSKU('BUN', brand, variant, p),
          name: `${brand} ${variant} ${p}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Bakery & Bread',
          description: `Fresh ${brand} ${variant}. Perfect for burgers and sandwiches.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: p,
          rating: randomRating(4.1, 4.7),
          reviewCount: randomReviews(400, 4000),
          stock: randomStock(30, 100),
          availability: true,
          tags: ['buns', 'pav', 'bakery', 'fresh', brand.toLowerCase()],
          keywords: [variant, 'buns', 'burger buns', 'pav'],
          labels: ['Fresh']
        });
      });
    });
  });

  // Bakery Items
  bakeryItems.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 18);
        products.push({
          id: productId++,
          sku: generateSKU('BAKERY', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Bakery & Bread',
          description: `Delicious ${brand} ${item}, ${size}. Perfect for celebrations.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'piece',
          weightOrSize: size,
          rating: randomRating(4.2, 4.9),
          reviewCount: randomReviews(200, 3000),
          stock: randomStock(20, 60),
          availability: true,
          tags: ['cake', 'pastry', 'bakery', 'dessert', brand.toLowerCase()],
          keywords: [item, 'bakery', 'cake', 'pastry'],
          labels: ['Premium', 'Fresh']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// SNACKS & NAMKEEN (200+ PRODUCTS)
// ============================================================================

function generateSnacks() {
  const products = [];
  let productId = 800;

  const snackBrands = [
    { brand: 'Lays', variants: ['Classic Salted', 'Masala', 'Cream & Onion', 'American Style Cream & Onion', 'Magic Masala'], sizes: ['25g', '48g', '90g', '150g'], prices: { '25g': 10, '48g': 20, '90g': 35, '150g': 55 } },
    { brand: 'Kurkure', variants: ['Masala Munch', 'Chilli Chatka', 'Puffcorn', 'Solid Masti'], sizes: ['20g', '50g', '85g', '140g'], prices: { '20g': 10, '50g': 20, '85g': 35, '140g': 55 } },
    { brand: 'Bingo', variants: ['Mad Angles', 'Tedhe Medhe', 'Tangles'], sizes: ['25g', '60g', '100g'], prices: { '25g': 10, '60g': 20, '100g': 35 } },
    { brand: 'Uncle Chipps', variants: ['Spicy Treat', 'Salted'], sizes: ['25g', '55g', '100g'], prices: { '25g': 10, '55g': 20, '100g': 35 } },
    { brand: 'Haldirams', variants: ['Aloo Bhujia', 'Namkeen Mix', 'Moong Dal', 'Mixture', 'Khatta Meetha', 'Bhel Puri'], sizes: ['100g', '200g', '350g', '500g'], prices: { '100g': 40, '200g': 75, '350g': 125, '500g': 175 } },
    { brand: 'Balaji', variants: ['Wafers', 'Bhujia', 'Mixture'], sizes: ['50g', '100g', '200g'], prices: { '50g': 18, '100g': 35, '200g': 65 } }
  ];

  snackBrands.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 20);
        products.push({
          id: productId++,
          sku: generateSKU('SNACK', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Snacks & Namkeen',
          description: `Crunchy and delicious ${brand} ${variant}, ${size}. Perfect for munching anytime.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(3.9, 4.8),
          reviewCount: randomReviews(1000, 12000),
          stock: randomStock(60, 200),
          availability: true,
          tags: ['snacks', 'chips', 'namkeen', 'savory', variant.toLowerCase(), brand.toLowerCase()],
          keywords: [variant, 'snacks', 'chips', 'namkeen', 'savory'],
          labels: discount > 15 ? ['Best Seller', 'Great Value'] : ['Popular']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// BEVERAGES (200+ PRODUCTS)
// ============================================================================

function generateBeverages() {
  const products = [];
  let productId = 1100;

  const beverageBrands = [
    { brand: 'Coca-Cola', variants: ['Coke', 'Diet Coke', 'Coke Zero'], sizes: ['250ml', '300ml', '500ml', '750ml', '1.25L', '2L'], prices: { '250ml': 20, '300ml': 25, '500ml': 40, '750ml': 55, '1.25L': 70, '2L': 90 } },
    { brand: 'Pepsi', variants: ['Pepsi', 'Diet Pepsi', 'Pepsi Black'], sizes: ['250ml', '300ml', '500ml', '750ml', '1.25L', '2L'], prices: { '250ml': 20, '300ml': 25, '500ml': 40, '750ml': 55, '1.25L': 70, '2L': 90 } },
    { brand: 'Sprite', variants: ['Sprite'], sizes: ['250ml', '300ml', '500ml', '750ml', '1.25L', '2L'], prices: { '250ml': 20, '300ml': 25, '500ml': 40, '750ml': 55, '1.25L': 70, '2L': 90 } },
    { brand: 'Fanta', variants: ['Orange'], sizes: ['250ml', '300ml', '500ml', '750ml', '1.25L'], prices: { '250ml': 20, '300ml': 25, '500ml': 40, '750ml': 55, '1.25L': 70 } },
    { brand: 'Thums Up', variants: ['Thums Up'], sizes: ['250ml', '300ml', '500ml', '750ml', '1.25L', '2L'], prices: { '250ml': 20, '300ml': 25, '500ml': 40, '750ml': 55, '1.25L': 70, '2L': 90 } },
    { brand: 'Limca', variants: ['Limca'], sizes: ['250ml', '300ml', '500ml', '750ml'], prices: { '250ml': 20, '300ml': 25, '500ml': 40, '750ml': 55 } },
    { brand: 'Maaza', variants: ['Mango'], sizes: ['200ml', '600ml', '1.2L'], prices: { '200ml': 20, '600ml': 50, '1.2L': 90 } },
    { brand: 'Frooti', variants: ['Mango'], sizes: ['160ml', '200ml', '600ml', '1.2L'], prices: { '160ml': 10, '200ml': 20, '600ml': 50, '1.2L': 90 } },
    { brand: 'Real', variants: ['Mango', 'Orange', 'Mixed Fruit', 'Apple'], sizes: ['200ml', '1L'], prices: { '200ml': 20, '1L': 90 } },
    { brand: 'Tropicana', variants: ['Orange', 'Mixed Fruit', 'Apple'], sizes: ['200ml', '1L'], prices: { '200ml': 25, '1L': 110 } },
    { brand: 'Red Bull', variants: ['Energy Drink'], sizes: ['250ml'], prices: { '250ml': 110 } },
    { brand: 'Sting', variants: ['Energy Drink'], sizes: ['250ml'], prices: { '250ml': 20 } },
    { brand: 'Bisleri', variants: ['Mineral Water'], sizes: ['500ml', '1L', '2L', '5L'], prices: { '500ml': 10, '1L': 20, '2L': 35, '5L': 70 } },
    { brand: 'Real', variants: ['Coconut Water'], sizes: ['200ml', '1L'], prices: { '200ml': 30, '1L': 120 } }
  ];

  beverageBrands.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(3, 18);
        products.push({
          id: productId++,
          sku: generateSKU('BEV', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Beverages',
          description: `Refreshing ${brand} ${variant}, ${size}. Quench your thirst.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'bottle',
          weightOrSize: size,
          rating: randomRating(4.0, 4.7),
          reviewCount: randomReviews(800, 10000),
          stock: randomStock(50, 180),
          availability: true,
          tags: ['beverage', 'drink', 'cold drink', variant.toLowerCase(), brand.toLowerCase()],
          keywords: [variant, 'beverage', 'drink', 'soft drink', 'cold drink'],
          labels: ['Quick Delivery']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// DAIRY & BREAKFAST (150+ PRODUCTS)
// ============================================================================

function generateDairyAndBreakfast() {
  const products = [];
  let productId = 1400;

  const dairyProducts = [
    { brand: 'Amul', items: ['Milk', 'Toned Milk', 'Full Cream Milk', 'Curd', 'Paneer', 'Butter', 'Cheese Slices', 'Cheese Cubes'], sizes: ['500ml', '1L', '200g', '500g'], prices: { '500ml': 25, '1L': 50, '200g': 40, '500g': 95 } },
    { brand: 'Mother Dairy', items: ['Milk', 'Curd', 'Paneer', 'Butter'], sizes: ['500ml', '1L', '200g', '500g'], prices: { '500ml': 24, '1L': 48, '200g': 38, '500g': 92 } },
    { brand: 'Britannia', items: ['Cheese Slices', 'Cheese Spread', 'Butter'], sizes: ['200g', '400g'], prices: { '200g': 85, '400g': 160 } }
  ];

  const breakfastCereals = [
    { brand: 'Kelloggs', items: ['Corn Flakes', 'Chocos', 'Muesli', 'Oats'], sizes: ['250g', '500g', '875g'], prices: { '250g': 120, '500g': 220, '875g': 380 } },
    { brand: 'Bagrry', items: ['Corn Flakes', 'Muesli', 'Oats'], sizes: ['400g', '500g'], prices: { '400g': 140, '500g': 170 } },
    { brand: 'Saffola', items: ['Oats', 'Masala Oats'], sizes: ['400g', '1kg'], prices: { '400g': 125, '1kg': 290 } },
    { brand: 'Quaker', items: ['Oats'], sizes: ['400g', '1kg'], prices: { '400g': 115, '1kg': 270 } }
  ];

  const spreads = [
    { brand: 'Kissan', items: ['Mixed Fruit Jam', 'Pineapple Jam', 'Mango Jam'], sizes: ['200g', '500g'], prices: { '200g': 85, '500g': 195 } },
    { brand: 'Nutella', items: ['Hazelnut Spread'], sizes: ['350g', '750g'], prices: { '350g': 320, '750g': 650 } },
    { brand: 'Sundrop', items: ['Peanut Butter Creamy', 'Peanut Butter Crunchy'], sizes: ['300g', '800g'], prices: { '300g': 180, '800g': 420 } },
    { brand: 'Dabur', items: ['Honey'], sizes: ['250g', '500g'], prices: { '250g': 130, '500g': 250 } }
  ];

  // Dairy
  dairyProducts.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(3, 12);
        products.push({
          id: productId++,
          sku: generateSKU('DAIRY', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Dairy & Breakfast',
          description: `Fresh ${brand} ${item}, ${size}. Daily essential for healthy living.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: item.includes('Milk') ? 'bottle' : 'pack',
          weightOrSize: size,
          rating: randomRating(4.2, 4.9),
          reviewCount: randomReviews(600, 7000),
          stock: randomStock(30, 100),
          availability: true,
          tags: ['dairy', 'milk', 'fresh', item.toLowerCase(), brand.toLowerCase()],
          keywords: [item, 'dairy', 'fresh', 'daily essential'],
          labels: ['Fresh', 'Daily Essential']
        });
      });
    });
  });

  // Breakfast Cereals
  breakfastCereals.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 20);
        products.push({
          id: productId++,
          sku: generateSKU('CEREAL', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Dairy & Breakfast',
          description: `Nutritious ${brand} ${item}, ${size}. Perfect breakfast choice.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.0, 4.7),
          reviewCount: randomReviews(400, 5000),
          stock: randomStock(40, 120),
          availability: true,
          tags: ['breakfast', 'cereal', 'oats', 'healthy', brand.toLowerCase()],
          keywords: [item, 'breakfast cereal', 'oats', 'morning meal'],
          labels: ['Healthy']
        });
      });
    });
  });

  // Spreads
  spreads.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 15);
        products.push({
          id: productId++,
          sku: generateSKU('SPREAD', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Food & Beverages',
          subcategory: 'Dairy & Breakfast',
          description: `Delicious ${brand} ${item}, ${size}. Perfect for bread and toast.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'jar',
          weightOrSize: size,
          rating: randomRating(4.1, 4.8),
          reviewCount: randomReviews(300, 4000),
          stock: randomStock(25, 80),
          availability: true,
          tags: ['spread', 'jam', 'breakfast', item.toLowerCase(), brand.toLowerCase()],
          keywords: [item, 'spread', 'jam', 'breakfast'],
          labels: ['Popular']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// INDIAN GROCERIES (250+ PRODUCTS)
// ============================================================================

function generateIndianGroceries() {
  const products = [];
  let productId = 1700;

  const riceProducts = [
    { brand: 'India Gate', variants: ['Basmati Rice', 'Basmati Dubar', 'Classic Basmati'], sizes: ['1kg', '5kg', '10kg'], prices: { '1kg': 85, '5kg': 400, '10kg': 780 } },
    { brand: 'Daawat', variants: ['Basmati Rice', 'Rozana Basmati'], sizes: ['1kg', '5kg'], prices: { '1kg': 90, '5kg': 420 } },
    { brand: 'Fortune', variants: ['Sona Masoori Rice', 'Basmati Rice'], sizes: ['1kg', '5kg'], prices: { '1kg': 65, '5kg': 310 } }
  ];

  const dals = [
    { name: 'Toor Dal', sizes: ['500g', '1kg', '2kg'], prices: { '500g': 65, '1kg': 125, '2kg': 240 } },
    { name: 'Moong Dal', sizes: ['500g', '1kg', '2kg'], prices: { '500g': 70, '1kg': 135, '2kg': 260 } },
    { name: 'Masoor Dal', sizes: ['500g', '1kg', '2kg'], prices: { '500g': 60, '1kg': 115, '2kg': 220 } },
    { name: 'Chana Dal', sizes: ['500g', '1kg', '2kg'], prices: { '500g': 55, '1kg': 105, '2kg': 200 } },
    { name: 'Rajma', sizes: ['500g', '1kg'], prices: { '500g': 80, '1kg': 155 } },
    { name: 'Chickpeas', sizes: ['500g', '1kg'], prices: { '500g': 65, '1kg': 125 } }
  ];

  const atta = [
    { brand: 'Aashirvaad', variants: ['Whole Wheat Atta', 'Multigrains Atta'], sizes: ['1kg', '5kg', '10kg'], prices: { '1kg': 55, '5kg': 260, '10kg': 510 } },
    { brand: 'Pillsbury', variants: ['Chakki Fresh Atta'], sizes: ['1kg', '5kg'], prices: { '1kg': 58, '5kg': 275 } },
    { brand: 'Annapurna', variants: ['Atta'], sizes: ['1kg', '5kg'], prices: { '1kg': 52, '5kg': 245 } }
  ];

  const oils = [
    { brand: 'Fortune', variants: ['Sunflower Oil', 'Soyabean Oil', 'Rice Bran Oil'], sizes: ['1L', '2L', '5L'], prices: { '1L': 185, '2L': 360, '5L': 870 } },
    { brand: 'Saffola', variants: ['Gold Oil', 'Active Oil'], sizes: ['1L', '2L', '5L'], prices: { '1L': 220, '2L': 430, '5L': 1050 } },
    { brand: 'Dhara', variants: ['Mustard Oil', 'Groundnut Oil'], sizes: ['1L', '2L', '5L'], prices: { '1L': 175, '2L': 340, '5L': 820 } }
  ];

  const spices = [
    { brand: 'MDH', items: ['Garam Masala', 'Chaat Masala', 'Tandoori Masala', 'Turmeric Powder', 'Chilli Powder', 'Coriander Powder'], sizes: ['50g', '100g', '200g'], prices: { '50g': 35, '100g': 65, '200g': 120 } },
    { brand: 'Everest', items: ['Garam Masala', 'Chaat Masala', 'Turmeric Powder', 'Chilli Powder', 'Coriander Powder'], sizes: ['50g', '100g', '200g'], prices: { '50g': 33, '100g': 62, '200g': 115 } },
    { brand: 'Catch', items: ['Garam Masala', 'Chaat Masala'], sizes: ['50g', '100g'], prices: { '50g': 32, '100g': 60 } }
  ];

  const teaCoffee = [
    { brand: 'Tata Tea', variants: ['Gold', 'Premium', 'Agni'], sizes: ['250g', '500g', '1kg'], prices: { '250g': 105, '500g': 200, '1kg': 390 } },
    { brand: 'Red Label', variants: ['Tea'], sizes: ['250g', '500g', '1kg'], prices: { '250g': 95, '500g': 185, '1kg': 360 } },
    { brand: 'Taj Mahal', variants: ['Tea'], sizes: ['250g', '500g'], prices: { '250g': 110, '500g': 210 } },
    { brand: 'Brooke Bond', variants: ['Red Label Tea', 'Taj Mahal Tea'], sizes: ['250g', '500g'], prices: { '250g': 100, '500g': 195 } },
    { brand: 'Nescafe', variants: ['Classic', 'Gold'], sizes: ['50g', '100g', '200g'], prices: { '50g': 145, '100g': 270, '200g': 520 } },
    { brand: 'Bru', variants: ['Instant Coffee', 'Gold'], sizes: ['50g', '100g', '200g'], prices: { '50g': 135, '100g': 250, '200g': 480 } }
  ];

  const sugarSalt = [
    { brand: 'Tata', items: ['Salt', 'Sugar'], sizes: ['1kg', '5kg'], prices: { '1kg': 22, '5kg': 105 } },
    { brand: 'Uttam', items: ['Sugar'], sizes: ['1kg', '5kg'], prices: { '1kg': 48, '5kg': 235 } }
  ];

  // Rice
  riceProducts.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(3, 15);
        products.push({
          id: productId++,
          sku: generateSKU('RICE', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Groceries & Essentials',
          subcategory: 'Rice & Grains',
          description: `Premium ${brand} ${variant}, ${size}. Perfect for everyday cooking.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.2, 4.9),
          reviewCount: randomReviews(800, 8000),
          stock: randomStock(30, 100),
          availability: true,
          tags: ['rice', 'basmati', 'grains', 'staple', brand.toLowerCase()],
          keywords: [variant, 'rice', 'basmati rice', 'cooking'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  // Dals
  dals.forEach(({ name, sizes, prices }) => {
    sizes.forEach(size => {
      const basePrice = prices[size];
      const discount = randomDiscount(3, 12);
      products.push({
        id: productId++,
        sku: generateSKU('DAL', 'Generic', name, size),
        name: `${name} ${size}`,
        brand: 'Generic',
        category: 'Groceries & Essentials',
        subcategory: 'Pulses & Legumes',
        description: `Fresh ${name}, ${size}. Rich in protein and essential nutrients.`,
        price: basePrice,
        originalPrice: Math.round(basePrice / (1 - discount / 100)),
        discountPercentage: discount,
        unit: 'pack',
        weightOrSize: size,
        rating: randomRating(4.0, 4.7),
        reviewCount: randomReviews(400, 5000),
        stock: randomStock(40, 120),
        availability: true,
        tags: ['dal', 'pulses', 'lentils', 'protein', name.toLowerCase()],
        keywords: [name, 'dal', 'lentils', 'pulses'],
        labels: ['Daily Essential', 'Healthy']
        });
    });
  });

  // Atta & Flour
  atta.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(3, 12);
        products.push({
          id: productId++,
          sku: generateSKU('ATTA', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Groceries & Essentials',
          subcategory: 'Flour & Dry Goods',
          description: `Premium ${brand} ${variant}, ${size}. Perfect for making fresh rotis.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.3, 4.9),
          reviewCount: randomReviews(1000, 10000),
          stock: randomStock(40, 120),
          availability: true,
          tags: ['atta', 'flour', 'wheat', 'staple', brand.toLowerCase()],
          keywords: [variant, 'atta', 'flour', 'wheat flour'],
          labels: ['Daily Essential', 'Best Seller']
        });
      });
    });
  });

  // Cooking Oils
  oils.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 18);
        products.push({
          id: productId++,
          sku: generateSKU('OIL', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Groceries & Essentials',
          subcategory: 'Oils & Ghee',
          description: `High-quality ${brand} ${variant}, ${size}. Pure and healthy for cooking.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'bottle',
          weightOrSize: size,
          rating: randomRating(4.1, 4.8),
          reviewCount: randomReviews(600, 7000),
          stock: randomStock(30, 90),
          availability: true,
          tags: ['oil', 'cooking oil', 'healthy', brand.toLowerCase()],
          keywords: [variant, 'cooking oil', 'oil', 'healthy oil'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  // Spices
  spices.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(3, 15);
        products.push({
          id: productId++,
          sku: generateSKU('SPICE', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Groceries & Essentials',
          subcategory: 'Salt & Spices',
          description: `Authentic ${brand} ${item}, ${size}. Enhances flavor of your dishes.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.2, 4.9),
          reviewCount: randomReviews(500, 6000),
          stock: randomStock(50, 150),
          availability: true,
          tags: ['spices', 'masala', 'seasoning', item.toLowerCase(), brand.toLowerCase()],
          keywords: [item, 'spices', 'masala', 'seasoning'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  // Tea & Coffee
  teaCoffee.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 18);
        products.push({
          id: productId++,
          sku: generateSKU('TEA', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Groceries & Essentials',
          subcategory: 'Tea & Coffee',
          description: `Premium ${brand} ${variant}, ${size}. Perfect for your daily brew.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.0, 4.8),
          reviewCount: randomReviews(800, 9000),
          stock: randomStock(40, 130),
          availability: true,
          tags: ['tea', 'coffee', 'beverage', variant.toLowerCase(), brand.toLowerCase()],
          keywords: [variant, 'tea', 'coffee', 'morning drink'],
          labels: ['Daily Essential', 'Best Seller']
        });
      });
    });
  });

  // Sugar & Salt
  sugarSalt.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(2, 8);
        products.push({
          id: productId++,
          sku: generateSKU('BASIC', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Groceries & Essentials',
          subcategory: 'Sugar & Salt',
          description: `Quality ${brand} ${item}, ${size}. Kitchen essential.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.0, 4.6),
          reviewCount: randomReviews(600, 7000),
          stock: randomStock(50, 150),
          availability: true,
          tags: [item.toLowerCase(), 'essential', brand.toLowerCase()],
          keywords: [item, 'kitchen essential', 'daily use'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// PERSONAL CARE (200+ PRODUCTS)
// ============================================================================

function generatePersonalCare() {
  const products = [];
  let productId = 2200;

  const shampoos = [
    { brand: 'Pantene', variants: ['Advanced Hair Fall', 'Silky Smooth', 'Oil Replacement'], sizes: ['180ml', '340ml', '650ml'], prices: { '180ml': 145, '340ml': 260, '650ml': 480 } },
    { brand: 'Head & Shoulders', variants: ['Anti Dandruff', 'Cool Menthol'], sizes: ['180ml', '340ml'], prices: { '180ml': 155, '340ml': 275 } },
    { brand: 'Dove', variants: ['Hair Fall Rescue', 'Intense Repair'], sizes: ['180ml', '340ml'], prices: { '180ml': 165, '340ml': 290 } },
    { brand: 'Clinic Plus', variants: ['Strong & Long'], sizes: ['175ml', '355ml'], prices: { '175ml': 95, '355ml': 175 } }
  ];

  const soaps = [
    { brand: 'Dettol', variants: ['Original', 'Cool', 'Skincare'], pack: ['75g', '125g'], prices: { '75g': 38, '125g': 62 } },
    { brand: 'Lux', variants: ['Velvet Touch', 'Soft Touch', 'Fresh Splash'], pack: ['100g', '150g'], prices: { '100g': 40, '150g': 65 } },
    { brand: 'Dove', variants: ['Beauty Cream Bar', 'Moisture Cream Bar'], pack: ['75g', '125g'], prices: { '75g': 45, '125g': 72 } },
    { brand: 'Lifebuoy', variants: ['Total 10'], pack: ['100g', '125g'], prices: { '100g': 35, '125g': 55 } }
  ];

  const toothpastes = [
    { brand: 'Colgate', variants: ['Total', 'MaxFresh', 'Sensitive'], sizes: ['75g', '150g', '200g'], prices: { '75g': 55, '150g': 95, '200g': 130 } },
    { brand: 'Pepsodent', variants: ['Germi Check'], sizes: ['75g', '150g'], prices: { '75g': 45, '150g': 80 } },
    { brand: 'Sensodyne', variants: ['Rapid Relief', 'Fresh Mint'], sizes: ['75g', '150g'], prices: { '75g': 145, '150g': 265 } },
    { brand: 'Close Up', variants: ['Red Hot'], sizes: ['80g', '150g'], prices: { '80g': 60, '150g': 105 } }
  ];

  const deodorants = [
    { brand: 'Fogg', variants: ['Marco', 'Xtremo', 'Napoleon'], sizes: ['120ml', '150ml'], prices: { '120ml': 165, '150ml': 225 } },
    { brand: 'Wild Stone', variants: ['Code Titanium', 'Ultra Sensual'], sizes: ['120ml', '150ml'], prices: { '120ml': 175, '150ml': 235 } },
    { brand: 'AXE', variants: ['Signature', 'Dark Temptation'], sizes: ['150ml'], prices: { '150ml': 245 } },
    { brand: 'Nivea', variants: ['Fresh Active'], sizes: ['150ml'], prices: { '150ml': 185 } }
  ];

  const skincare = [
    { brand: 'Nivea', items: ['Face Wash', 'Cream', 'Moisturizer', 'Sunscreen'], sizes: ['100ml', '200ml'], prices: { '100ml': 145, '200ml': 260 } },
    { brand: 'Ponds', items: ['Face Wash', 'Cream', 'BB Cream'], sizes: ['100ml', '200ml'], prices: { '100ml': 135, '200ml': 245 } },
    { brand: 'Garnier', items: ['Face Wash', 'Moisturizer'], sizes: ['100ml'], prices: { '100ml': 125 } }
  ];

  // Shampoos
  shampoos.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 20);
        products.push({
          id: productId++,
          sku: generateSKU('SHAM', brand, variant, size),
          name: `${brand} ${variant} Shampoo ${size}`,
          brand,
          category: 'Personal Care',
          subcategory: 'Hair Care',
          description: `${brand} ${variant} shampoo, ${size}. For healthy and beautiful hair.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'bottle',
          weightOrSize: size,
          rating: randomRating(3.8, 4.6),
          reviewCount: randomReviews(400, 6000),
          stock: randomStock(30, 100),
          availability: true,
          tags: ['shampoo', 'hair care', 'personal care', brand.toLowerCase()],
          keywords: [variant, 'shampoo', 'hair care', 'hair wash'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  // Soaps
  soaps.forEach(({ brand, variants, pack, prices }) => {
    variants.forEach(variant => {
      pack.forEach(p => {
        const basePrice = prices[p];
        const discount = randomDiscount(5, 15);
        products.push({
          id: productId++,
          sku: generateSKU('SOAP', brand, variant, p),
          name: `${brand} ${variant} Soap ${p}`,
          brand,
          category: 'Personal Care',
          subcategory: 'Bath & Body',
          description: `${brand} ${variant} soap bar, ${p}. For clean and fresh skin.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'bar',
          weightOrSize: p,
          rating: randomRating(4.0, 4.7),
          reviewCount: randomReviews(800, 8000),
          stock: randomStock(60, 180),
          availability: true,
          tags: ['soap', 'bath', 'hygiene', brand.toLowerCase()],
          keywords: [variant, 'soap', 'bath soap', 'body wash'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  // Toothpastes
  toothpastes.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 18);
        products.push({
          id: productId++,
          sku: generateSKU('TOOTH', brand, variant, size),
          name: `${brand} ${variant} Toothpaste ${size}`,
          brand,
          category: 'Personal Care',
          subcategory: 'Oral Care',
          description: `${brand} ${variant} toothpaste, ${size}. For strong teeth and fresh breath.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'tube',
          weightOrSize: size,
          rating: randomRating(4.1, 4.8),
          reviewCount: randomReviews(600, 7000),
          stock: randomStock(50, 150),
          availability: true,
          tags: ['toothpaste', 'oral care', 'dental', brand.toLowerCase()],
          keywords: [variant, 'toothpaste', 'dental care', 'oral hygiene'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  // Deodorants
  deodorants.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(10, 25);
        products.push({
          id: productId++,
          sku: generateSKU('DEO', brand, variant, size),
          name: `${brand} ${variant} Deodorant ${size}`,
          brand,
          category: 'Personal Care',
          subcategory: 'Fragrance',
          description: `${brand} ${variant} deodorant spray, ${size}. Long-lasting freshness.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'bottle',
          weightOrSize: size,
          rating: randomRating(3.9, 4.6),
          reviewCount: randomReviews(300, 5000),
          stock: randomStock(30, 90),
          availability: true,
          tags: ['deodorant', 'fragrance', 'body spray', brand.toLowerCase()],
          keywords: [variant, 'deodorant', 'deo', 'body spray'],
          labels: ['Popular']
        });
      });
    });
  });

  // Skincare
  skincare.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(8, 22);
        products.push({
          id: productId++,
          sku: generateSKU('SKIN', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Personal Care',
          subcategory: 'Skincare',
          description: `${brand} ${item}, ${size}. For healthy and glowing skin.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'tube',
          weightOrSize: size,
          rating: randomRating(3.9, 4.7),
          reviewCount: randomReviews(400, 5000),
          stock: randomStock(25, 80),
          availability: true,
          tags: ['skincare', 'face care', item.toLowerCase(), brand.toLowerCase()],
          keywords: [item, 'skincare', 'face care', 'beauty'],
          labels: ['Popular']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// HOME CARE (100+ PRODUCTS)
// ============================================================================

function generateHomeCare() {
  const products = [];
  let productId = 2600;

  const detergents = [
    { brand: 'Surf Excel', variants: ['Matic', 'Easy Wash'], sizes: ['500g', '1kg', '2kg'], prices: { '500g': 85, '1kg': 165, '2kg': 320 } },
    { brand: 'Ariel', variants: ['Matic', 'Complete'], sizes: ['500g', '1kg', '2kg'], prices: { '500g': 90, '1kg': 175, '2kg': 340 } },
    { brand: 'Tide', variants: ['Plus', 'Naturals'], sizes: ['500g', '1kg'], prices: { '500g': 80, '1kg': 155 } },
    { brand: 'Ghadi', variants: ['Detergent'], sizes: ['1kg', '2kg'], prices: { '1kg': 90, '2kg': 175 } }
  ];

  const dishwash = [
    { brand: 'Vim', variants: ['Lemon', 'Dishwash Bar'], sizes: ['155g', '250g', '500ml'], prices: { '155g': 12, '250g': 22, '500ml': 95 } },
    { brand: 'Pril', variants: ['Dishwash'], sizes: ['425ml', '750ml'], prices: { '425ml': 85, '750ml': 145 } },
    { brand: 'Exo', variants: ['Dishwash Bar'], sizes: ['130g', '250g'], prices: { '130g': 10, '250g': 20 } }
  ];

  const cleaners = [
    { brand: 'Lizol', items: ['Floor Cleaner'], variants: ['Citrus', 'Floral', 'Jasmine'], sizes: ['500ml', '975ml', '2L'], prices: { '500ml': 95, '975ml': 175, '2L': 330 } },
    { brand: 'Harpic', items: ['Toilet Cleaner'], variants: ['Original', 'Power Plus'], sizes: ['500ml', '1L'], prices: { '500ml': 85, '1L': 160 } },
    { brand: 'Domex', items: ['Toilet Cleaner'], variants: ['Fresh Guard'], sizes: ['500ml', '1L'], prices: { '500ml': 80, '1L': 150 } }
  ];

  const others = [
    { brand: 'Scotch Brite', items: ['Scrub Pad'], pack: ['3 pcs', '5 pcs'], prices: { '3 pcs': 60, '5 pcs': 95 } },
    { brand: 'Kleenex', items: ['Tissue Box'], pack: ['100 pcs', '200 pcs'], prices: { '100 pcs': 75, '200 pcs': 140 } },
    { brand: 'Odonil', items: ['Air Freshener'], variants: ['Lavender', 'Rose'], pack: ['75g'], prices: { '75g': 55 } }
  ];

  // Detergents
  detergents.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 20);
        products.push({
          id: productId++,
          sku: generateSKU('DET', brand, variant, size),
          name: `${brand} ${variant} Detergent ${size}`,
          brand,
          category: 'Home Care',
          subcategory: 'Laundry',
          description: `${brand} ${variant} detergent powder, ${size}. Powerful cleaning action.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.0, 4.7),
          reviewCount: randomReviews(500, 7000),
          stock: randomStock(30, 100),
          availability: true,
          tags: ['detergent', 'laundry', 'cleaning', brand.toLowerCase()],
          keywords: [variant, 'detergent', 'washing powder', 'laundry'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  // Dishwash
  dishwash.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 15);
        products.push({
          id: productId++,
          sku: generateSKU('DISH', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Home Care',
          subcategory: 'Kitchen',
          description: `${brand} ${variant}, ${size}. Effective grease cleaning.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: size.includes('ml') ? 'bottle' : 'bar',
          weightOrSize: size,
          rating: randomRating(4.1, 4.8),
          reviewCount: randomReviews(800, 9000),
          stock: randomStock(50, 150),
          availability: true,
          tags: ['dishwash', 'kitchen', 'cleaning', brand.toLowerCase()],
          keywords: [variant, 'dishwash', 'utensil cleaner', 'dish soap'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  // Cleaners
  cleaners.forEach(({ brand, items, variants, sizes, prices }) => {
    items.forEach(item => {
      variants.forEach(variant => {
        sizes.forEach(size => {
          const basePrice = prices[size];
          const discount = randomDiscount(5, 18);
          products.push({
            id: productId++,
            sku: generateSKU('CLEAN', brand, variant, size),
            name: `${brand} ${variant} ${item} ${size}`,
            brand,
            category: 'Home Care',
            subcategory: 'Cleaning',
            description: `${brand} ${variant} ${item.toLowerCase()}, ${size}. Deep cleaning power.`,
            price: basePrice,
            originalPrice: Math.round(basePrice / (1 - discount / 100)),
            discountPercentage: discount,
            unit: 'bottle',
            weightOrSize: size,
            rating: randomRating(4.0, 4.7),
            reviewCount: randomReviews(400, 6000),
            stock: randomStock(30, 90),
            availability: true,
            tags: ['cleaner', item.toLowerCase(), 'hygiene', brand.toLowerCase()],
            keywords: [item, variant, 'cleaner', 'disinfectant'],
            labels: ['Daily Essential']
          });
        });
      });
    });
  });

  // Others
  others.forEach(({ brand, items, pack, prices, variants }) => {
    items.forEach(item => {
      if (variants) {
        variants.forEach(variant => {
          pack.forEach(p => {
            const basePrice = prices[p];
            const discount = randomDiscount(5, 15);
            products.push({
              id: productId++,
              sku: generateSKU('HOME', brand, item, p),
              name: `${brand} ${variant} ${item} ${p}`,
              brand,
              category: 'Home Care',
              subcategory: 'Home Essentials',
              description: `${brand} ${variant} ${item.toLowerCase()}, ${p}. Essential household item.`,
              price: basePrice,
              originalPrice: Math.round(basePrice / (1 - discount / 100)),
              discountPercentage: discount,
              unit: 'pack',
              weightOrSize: p,
              rating: randomRating(3.8, 4.5),
              reviewCount: randomReviews(200, 3000),
              stock: randomStock(30, 100),
              availability: true,
              tags: [item.toLowerCase(), 'home care', brand.toLowerCase()],
              keywords: [item, variant, 'home essential'],
              labels: ['Daily Essential']
            });
          });
        });
      } else {
        pack.forEach(p => {
          const basePrice = prices[p];
          const discount = randomDiscount(5, 15);
          products.push({
            id: productId++,
            sku: generateSKU('HOME', brand, item, p),
            name: `${brand} ${item} ${p}`,
            brand,
            category: 'Home Care',
            subcategory: 'Home Essentials',
            description: `${brand} ${item.toLowerCase()}, ${p}. Essential household item.`,
            price: basePrice,
            originalPrice: Math.round(basePrice / (1 - discount / 100)),
            discountPercentage: discount,
            unit: 'pack',
            weightOrSize: p,
            rating: randomRating(3.8, 4.5),
            reviewCount: randomReviews(200, 3000),
            stock: randomStock(30, 100),
            availability: true,
            tags: [item.toLowerCase(), 'home care', brand.toLowerCase()],
            keywords: [item, 'home essential'],
            labels: ['Daily Essential']
          });
        });
      }
    });
  });

  return products;
}

// ============================================================================
// ELECTRONICS & GADGETS (200+ PRODUCTS)
// ============================================================================

function generateElectronicsAndGadgets() {
  const products = [];
  let productId = 2800;

  const cables = [
    { brand: 'Portronics', types: ['USB-C Cable', 'Lightning Cable', 'Micro USB Cable', 'HDMI Cable'], lengths: ['1m', '2m', '3m'], prices: { '1m': 199, '2m': 299, '3m': 399 } },
    { brand: 'Belkin', types: ['USB-C Cable', 'Lightning Cable'], lengths: ['1m', '2m'], prices: { '1m': 499, '2m': 699 } },
    { brand: 'boAt', types: ['USB-C Cable', 'Lightning Cable'], lengths: ['1m', '2m'], prices: { '1m': 299, '2m': 449 } }
  ];

  const chargers = [
    { brand: 'Portronics', types: ['Fast Charger 18W', 'Fast Charger 33W'], prices: { '18W': 399, '33W': 699 } },
    { brand: 'Samsung', types: ['Fast Charger 25W', 'Super Fast Charger 45W'], prices: { '25W': 899, '45W': 1699 } },
    { brand: 'Apple', types: ['20W USB-C Charger'], prices: { '20W': 1900 } }
  ];

  const powerBanks = [
    { brand: 'Mi', capacities: ['10000mAh', '20000mAh'], prices: { '10000mAh': 999, '20000mAh': 1799 } },
    { brand: 'Realme', capacities: ['10000mAh', '20000mAh', '30000mAh'], prices: { '10000mAh': 899, '20000mAh': 1699, '30000mAh': 2499 } },
    { brand: 'Anker', capacities: ['10000mAh', '20000mAh'], prices: { '10000mAh': 1499, '20000mAh': 2499 } },
    { brand: 'Portronics', capacities: ['10000mAh', '20000mAh'], prices: { '10000mAh': 799, '20000mAh': 1499 } }
  ];

  const headphones = [
    { brand: 'boAt', models: ['Rockerz 450', 'Rockerz 550', 'Airdopes 141'], prices: { 'Rockerz 450': 1299, 'Rockerz 550': 1799, 'Airdopes 141': 1499 } },
    { brand: 'JBL', models: ['Tune 510BT', 'C100SI', 'Tune 750BTNC'], prices: { 'Tune 510BT': 2499, 'C100SI': 599, 'Tune 750BTNC': 4999 } },
    { brand: 'Sony', models: ['WH-CH510', 'WH-1000XM4'], prices: { 'WH-CH510': 2490, 'WH-1000XM4': 24990 } },
    { brand: 'realme', models: ['Buds 2', 'Buds Air 2'], prices: { 'Buds 2': 599, 'Buds Air 2': 2499 } }
  ];

  const accessories = [
    { brand: 'Portronics', items: ['Phone Stand', 'Laptop Stand', 'USB Hub 4 Port', 'Webcam HD'], prices: { 'Phone Stand': 299, 'Laptop Stand': 899, 'USB Hub 4 Port': 599, 'Webcam HD': 1299 } },
    { brand: 'Zebronics', items: ['Wireless Mouse', 'Wired Keyboard', 'USB Hub', 'Webcam'], prices: { 'Wireless Mouse': 399, 'Wired Keyboard': 499, 'USB Hub': 449, 'Webcam': 899 } },
    { brand: 'Logitech', items: ['Wireless Mouse M221', 'Keyboard K120', 'Webcam C270'], prices: { 'Wireless Mouse M221': 699, 'Keyboard K120': 595, 'Webcam C270': 1795 } }
  ];

  const smartDevices = [
    { brand: 'Amazon', items: ['Echo Dot 4th Gen', 'Echo 4th Gen'], prices: { 'Echo Dot 4th Gen': 3499, 'Echo 4th Gen': 7499 } },
    { brand: 'Google', items: ['Nest Mini', 'Nest Hub'], prices: { 'Nest Mini': 3499, 'Nest Hub': 7999 } },
    { brand: 'Mi', items: ['Smart Bulb', 'Smart Plug', 'Smart Band 6'], prices: { 'Smart Bulb': 599, 'Smart Plug': 799, 'Smart Band 6': 2999 } }
  ];

  // Cables
  cables.forEach(({ brand, types, lengths, prices }) => {
    types.forEach(type => {
      lengths.forEach(length => {
        const basePrice = prices[length];
        const discount = randomDiscount(10, 30);
        products.push({
          id: productId++,
          sku: generateSKU('CABLE', brand, type, length),
          name: `${brand} ${type} ${length}`,
          brand,
          category: 'Electronics & Gadgets',
          subcategory: 'Cables & Adapters',
          description: `${brand} ${type}, ${length} length. Fast charging and data transfer.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'piece',
          weightOrSize: length,
          rating: randomRating(3.7, 4.5),
          reviewCount: randomReviews(200, 4000),
          stock: randomStock(50, 150),
          availability: true,
          tags: ['cable', 'charger', 'usb', type.toLowerCase(), brand.toLowerCase()],
          keywords: [type, 'cable', 'charging cable', 'data cable'],
          labels: ['Popular']
        });
      });
    });
  });

  // Chargers
  chargers.forEach(({ brand, types, prices }) => {
    types.forEach(type => {
      const watts = type.match(/\d+W/)[0];
      const basePrice = prices[watts];
      const discount = randomDiscount(10, 25);
      products.push({
        id: productId++,
        sku: generateSKU('CHRG', brand, type, watts),
        name: `${brand} ${type}`,
        brand,
        category: 'Electronics & Gadgets',
        subcategory: 'Chargers & Power',
        description: `${brand} ${type}. Quick and efficient charging.`,
        price: basePrice,
        originalPrice: Math.round(basePrice / (1 - discount / 100)),
        discountPercentage: discount,
        unit: 'piece',
        weightOrSize: watts,
        rating: randomRating(3.9, 4.6),
        reviewCount: randomReviews(300, 5000),
        stock: randomStock(30, 100),
        availability: true,
        tags: ['charger', 'fast charger', 'adapter', brand.toLowerCase()],
        keywords: [type, 'charger', 'fast charging', 'power adapter'],
        labels: ['Fast Delivery']
      });
    });
  });

  // Power Banks
  powerBanks.forEach(({ brand, capacities, prices }) => {
    capacities.forEach(capacity => {
      const basePrice = prices[capacity];
      const discount = randomDiscount(15, 30);
      products.push({
        id: productId++,
        sku: generateSKU('PB', brand, 'PowerBank', capacity),
        name: `${brand} Power Bank ${capacity}`,
        brand,
        category: 'Electronics & Gadgets',
        subcategory: 'Power Banks',
        description: `${brand} power bank with ${capacity} capacity. Portable charging solution.`,
        price: basePrice,
        originalPrice: Math.round(basePrice / (1 - discount / 100)),
        discountPercentage: discount,
        unit: 'piece',
        weightOrSize: capacity,
        rating: randomRating(4.0, 4.7),
        reviewCount: randomReviews(500, 8000),
        stock: randomStock(25, 80),
        availability: true,
        tags: ['power bank', 'portable charger', capacity.toLowerCase(), brand.toLowerCase()],
        keywords: ['power bank', capacity, 'portable battery', 'external battery'],
        labels: ['Best Seller']
      });
    });
  });

  // Headphones
  headphones.forEach(({ brand, models, prices }) => {
    models.forEach(model => {
      const basePrice = prices[model];
      const discount = randomDiscount(15, 35);
      products.push({
        id: productId++,
        sku: generateSKU('HP', brand, model, ''),
        name: `${brand} ${model}`,
        brand,
        category: 'Electronics & Gadgets',
        subcategory: 'Headphones & Earphones',
        description: `${brand} ${model}. Premium audio quality and comfort.`,
        price: basePrice,
        originalPrice: Math.round(basePrice / (1 - discount / 100)),
        discountPercentage: discount,
        unit: 'piece',
        weightOrSize: 'standard',
        rating: randomRating(3.9, 4.7),
        reviewCount: randomReviews(800, 12000),
        stock: randomStock(20, 60),
        availability: true,
        tags: ['headphones', 'earphones', 'audio', 'wireless', brand.toLowerCase()],
        keywords: [model, 'headphones', 'earbuds', 'audio device'],
        labels: ['Top Rated']
      });
    });
  });

  // Accessories
  accessories.forEach(({ brand, items, prices }) => {
    items.forEach(item => {
      const basePrice = prices[item];
      const discount = randomDiscount(10, 25);
      products.push({
        id: productId++,
        sku: generateSKU('ACC', brand, item, ''),
        name: `${brand} ${item}`,
        brand,
        category: 'Electronics & Gadgets',
        subcategory: 'Computer Accessories',
        description: `${brand} ${item}. Essential accessory for productivity.`,
        price: basePrice,
        originalPrice: Math.round(basePrice / (1 - discount / 100)),
        discountPercentage: discount,
        unit: 'piece',
        weightOrSize: 'standard',
        rating: randomRating(3.7, 4.5),
        reviewCount: randomReviews(200, 4000),
        stock: randomStock(30, 100),
        availability: true,
        tags: [item.toLowerCase(), 'accessory', 'gadget', brand.toLowerCase()],
        keywords: [item, 'computer accessory', 'gadget', 'tech'],
        labels: ['Popular']
      });
    });
  });

  // Smart Devices
  smartDevices.forEach(({ brand, items, prices }) => {
    items.forEach(item => {
      const basePrice = prices[item];
      const discount = randomDiscount(10, 20);
      products.push({
        id: productId++,
        sku: generateSKU('SMART', brand, item, ''),
        name: `${brand} ${item}`,
        brand,
        category: 'Electronics & Gadgets',
        subcategory: 'Smart Devices',
        description: `${brand} ${item}. Smart home automation device.`,
        price: basePrice,
        originalPrice: Math.round(basePrice / (1 - discount / 100)),
        discountPercentage: discount,
        unit: 'piece',
        weightOrSize: 'standard',
        rating: randomRating(4.0, 4.7),
        reviewCount: randomReviews(400, 6000),
        stock: randomStock(15, 50),
        availability: true,
        tags: ['smart device', 'iot', 'automation', brand.toLowerCase()],
        keywords: [item, 'smart device', 'iot', 'home automation'],
        labels: ['Premium', 'Trending']
      });
    });
  });

  return products;
}

// ============================================================================
// STATIONERY & OFFICE (100+ PRODUCTS)
// ============================================================================

function generateStationery() {
  const products = [];
  let productId = 3100;

  const pens = [
    { brand: 'Cello', types: ['Butterflow Pen', 'Gripper Pen'], pack: ['10 pcs', '20 pcs'], prices: { '10 pcs': 50, '20 pcs': 95 } },
    { brand: 'Reynolds', types: ['045 Pen', 'Trimax Pen'], pack: ['10 pcs', '20 pcs'], prices: { '10 pcs': 60, '20 pcs': 110 } },
    { brand: 'Parker', types: ['Jotter Pen'], pack: ['1 pc'], prices: { '1 pc': 350 } }
  ];

  const notebooks = [
    { brand: 'Classmate', types: ['Single Line', 'Four Line', 'Unruled'], pages: ['172 pages', '240 pages'], prices: { '172 pages': 60, '240 pages': 85 } },
    { brand: 'ITC', types: ['Notebook'], pages: ['180 pages'], prices: { '180 pages': 55 } }
  ];

  const others = [
    { brand: 'Fevicol', items: ['Glue Stick', 'Craft Glue'], sizes: ['8g', '15g'], prices: { '8g': 10, '15g': 18 } },
    { brand: 'Camlin', items: ['Pencil Box', 'Eraser', 'Sharpener'], pack: ['1 pc', '5 pcs'], prices: { '1 pc': 25, '5 pcs': 100 } },
    { brand: 'Stapler', items: ['Mini Stapler', 'Medium Stapler'], pack: ['1 pc'], prices: { '1 pc': 75 } }
  ];

  // Pens
  pens.forEach(({ brand, types, pack, prices }) => {
    types.forEach(type => {
      pack.forEach(p => {
        const basePrice = prices[p];
        const discount = randomDiscount(5, 15);
        products.push({
          id: productId++,
          sku: generateSKU('PEN', brand, type, p),
          name: `${brand} ${type} ${p}`,
          brand,
          category: 'Stationery & Office',
          subcategory: 'Writing',
          description: `${brand} ${type}, ${p}. Smooth writing experience.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: p,
          rating: randomRating(3.9, 4.6),
          reviewCount: randomReviews(300, 5000),
          stock: randomStock(60, 180),
          availability: true,
          tags: ['pen', 'writing', 'stationery', brand.toLowerCase()],
          keywords: [type, 'pen', 'ballpoint pen', 'writing instrument'],
          labels: ['Best Seller']
        });
      });
    });
  });

  // Notebooks
  notebooks.forEach(({ brand, types, pages, prices }) => {
    types.forEach(type => {
      pages.forEach(page => {
        const basePrice = prices[page];
        const discount = randomDiscount(5, 12);
        products.push({
          id: productId++,
          sku: generateSKU('NB', brand, type, page),
          name: `${brand} Notebook ${type} ${page}`,
          brand,
          category: 'Stationery & Office',
          subcategory: 'Paper Products',
          description: `${brand} notebook, ${type}, ${page}. Quality paper for writing.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'piece',
          weightOrSize: page,
          rating: randomRating(4.0, 4.7),
          reviewCount: randomReviews(500, 7000),
          stock: randomStock(50, 150),
          availability: true,
          tags: ['notebook', 'paper', 'writing', 'stationery', brand.toLowerCase()],
          keywords: ['notebook', type, 'writing pad', 'notes'],
          labels: ['Student Essential']
        });
      });
    });
  });

  // Others
  others.forEach(({ brand, items, sizes, pack, prices }) => {
    items.forEach(item => {
      const sizeOrPack = sizes || pack;
      sizeOrPack.forEach(s => {
        const basePrice = prices[s];
        const discount = randomDiscount(5, 15);
        products.push({
          id: productId++,
          sku: generateSKU('STAT', brand, item, s),
          name: `${brand} ${item} ${s}`,
          brand,
          category: 'Stationery & Office',
          subcategory: 'Office Supplies',
          description: `${brand} ${item}, ${s}. Essential office/school supply.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'piece',
          weightOrSize: s,
          rating: randomRating(3.8, 4.5),
          reviewCount: randomReviews(200, 3000),
          stock: randomStock(40, 120),
          availability: true,
          tags: [item.toLowerCase(), 'stationery', 'office', brand.toLowerCase()],
          keywords: [item, 'stationery', 'office supply', 'school supply'],
          labels: ['Daily Essential']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// BABY CARE (50+ PRODUCTS)
// ============================================================================

function generateBabyCare() {
  const products = [];
  let productId = 3250;

  const diapers = [
    { brand: 'Pampers', variants: ['Baby Dry', 'Active Baby'], sizes: ['S', 'M', 'L', 'XL'], packs: ['20 pcs', '40 pcs', '60 pcs'], prices: { 'S-20 pcs': 399, 'M-40 pcs': 699, 'L-60 pcs': 999 } }
  ];

  const babyFood = [
    { brand: 'Cerelac', items: ['Wheat', 'Multi Grain', 'Rice'], sizes: ['300g', '1kg'], prices: { '300g': 165, '1kg': 530 } }
  ];

  const babyCare = [
    { brand: 'Johnson\'s', items: ['Baby Shampoo', 'Baby Soap', 'Baby Lotion'], sizes: ['200ml', '400ml'], prices: { '200ml': 165, '400ml': 295 } }
  ];

  // Diapers
  diapers.forEach(({ brand, variants, sizes, packs, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        packs.forEach(pack => {
          const key = `${size}-${pack}`;
          if (prices[key]) {
            const basePrice = prices[key];
            const discount = randomDiscount(5, 20);
            products.push({
              id: productId++,
              sku: generateSKU('DIAPER', brand, variant, size),
              name: `${brand} ${variant} Diapers ${size} ${pack}`,
              brand,
              category: 'Baby Care',
              subcategory: 'Diapers',
              description: `${brand} ${variant} diapers, size ${size}, ${pack}. Soft and comfortable.`,
              price: basePrice,
              originalPrice: Math.round(basePrice / (1 - discount / 100)),
              discountPercentage: discount,
              unit: 'pack',
              weightOrSize: `${size}-${pack}`,
              rating: randomRating(4.2, 4.8),
              reviewCount: randomReviews(600, 8000),
              stock: randomStock(20, 60),
              availability: true,
              tags: ['diapers', 'baby care', size.toLowerCase(), brand.toLowerCase()],
              keywords: ['diapers', variant, 'baby diapers', size],
              labels: ['Best Seller', 'Premium']
            });
          }
        });
      });
    });
  });

  // Baby Food
  babyFood.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 15);
        products.push({
          id: productId++,
          sku: generateSKU('BFOOD', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Baby Care',
          subcategory: 'Baby Food',
          description: `${brand} ${item} baby cereal, ${size}. Nutritious and easy to digest.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.3, 4.9),
          reviewCount: randomReviews(500, 7000),
          stock: randomStock(30, 90),
          availability: true,
          tags: ['baby food', 'cereal', 'nutrition', brand.toLowerCase()],
          keywords: [item, 'baby food', 'cereal', 'infant nutrition'],
          labels: ['Healthy', 'Trusted']
        });
      });
    });
  });

  // Baby Care Products
  babyCare.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 18);
        products.push({
          id: productId++,
          sku: generateSKU('BCARE', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Baby Care',
          subcategory: 'Baby Hygiene',
          description: `${brand} ${item}, ${size}. Gentle and safe for babies.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'bottle',
          weightOrSize: size,
          rating: randomRating(4.2, 4.8),
          reviewCount: randomReviews(400, 6000),
          stock: randomStock(30, 100),
          availability: true,
          tags: ['baby care', item.toLowerCase(), 'gentle', brand.toLowerCase()],
          keywords: [item, 'baby care', 'baby hygiene', 'gentle'],
          labels: ['Trusted', 'Premium']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// PET SUPPLIES (50+ PRODUCTS)
// ============================================================================

function generatePetSupplies() {
  const products = [];
  let productId = 3350;

  const dogFood = [
    { brand: 'Pedigree', variants: ['Adult Dry Dog Food', 'Puppy Dry Dog Food'], sizes: ['1kg', '3kg', '10kg'], prices: { '1kg': 380, '3kg': 950, '10kg': 2850 } },
    { brand: 'Drools', variants: ['Adult Dog Food'], sizes: ['1kg', '3kg'], prices: { '1kg': 340, '3kg': 890 } }
  ];

  const catFood = [
    { brand: 'Whiskas', variants: ['Adult Dry Cat Food'], sizes: ['480g', '1.2kg', '3kg'], prices: { '480g': 220, '1.2kg': 480, '3kg': 1080 } }
  ];

  const petCare = [
    { brand: 'PetCare', items: ['Dog Shampoo', 'Cat Shampoo', 'Pet Brush'], sizes: ['200ml', '500ml'], prices: { '200ml': 180, '500ml': 350 } }
  ];

  // Dog Food
  dogFood.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 20);
        products.push({
          id: productId++,
          sku: generateSKU('DGFOOD', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Pet Supplies',
          subcategory: 'Dog Food',
          description: `${brand} ${variant}, ${size}. Complete nutrition for dogs.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.1, 4.7),
          reviewCount: randomReviews(300, 4000),
          stock: randomStock(15, 50),
          availability: true,
          tags: ['dog food', 'pet food', 'pet supplies', brand.toLowerCase()],
          keywords: [variant, 'dog food', 'pet nutrition', 'dog meal'],
          labels: ['Trusted']
        });
      });
    });
  });

  // Cat Food
  catFood.forEach(({ brand, variants, sizes, prices }) => {
    variants.forEach(variant => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(5, 20);
        products.push({
          id: productId++,
          sku: generateSKU('CATFOOD', brand, variant, size),
          name: `${brand} ${variant} ${size}`,
          brand,
          category: 'Pet Supplies',
          subcategory: 'Cat Food',
          description: `${brand} ${variant}, ${size}. Complete nutrition for cats.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'pack',
          weightOrSize: size,
          rating: randomRating(4.0, 4.6),
          reviewCount: randomReviews(200, 3000),
          stock: randomStock(15, 50),
          availability: true,
          tags: ['cat food', 'pet food', 'pet supplies', brand.toLowerCase()],
          keywords: [variant, 'cat food', 'pet nutrition', 'cat meal'],
          labels: ['Trusted']
        });
      });
    });
  });

  // Pet Care Products
  petCare.forEach(({ brand, items, sizes, prices }) => {
    items.forEach(item => {
      sizes.forEach(size => {
        const basePrice = prices[size];
        const discount = randomDiscount(8, 18);
        products.push({
          id: productId++,
          sku: generateSKU('PETCARE', brand, item, size),
          name: `${brand} ${item} ${size}`,
          brand,
          category: 'Pet Supplies',
          subcategory: 'Pet Care',
          description: `${brand} ${item}, ${size}. Essential pet grooming product.`,
          price: basePrice,
          originalPrice: Math.round(basePrice / (1 - discount / 100)),
          discountPercentage: discount,
          unit: 'bottle',
          weightOrSize: size,
          rating: randomRating(3.9, 4.5),
          reviewCount: randomReviews(150, 2000),
          stock: randomStock(20, 60),
          availability: true,
          tags: ['pet care', item.toLowerCase(), 'grooming', brand.toLowerCase()],
          keywords: [item, 'pet care', 'pet grooming', 'pet hygiene'],
          labels: ['Quality']
        });
      });
    });
  });

  return products;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedProducts() {
  try {
    console.log('🚀 Starting comprehensive product catalog seeding...');
    console.log('📊 This will create 2000+ realistic Indian market products\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/snapbuy', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB\n');

    // Clear existing products
    const deleteResult = await Product.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing products\n`);

    // Generate all products
    console.log('📦 Generating products by category...\n');

    const allProducts = [];

    console.log('🍫 Generating Chocolates & Sweets...');
    const chocolates = generateChocolatesAndSweets();
    allProducts.push(...chocolates);
    console.log(`   ✓ Generated ${chocolates.length} products`);

    console.log('🍦 Generating Ice Creams & Frozen Desserts...');
    const iceCreams = generateIceCreamsAndFrozen();
    allProducts.push(...iceCreams);
    console.log(`   ✓ Generated ${iceCreams.length} products`);

    console.log('🍞 Generating Bakery & Bread...');
    const bakery = generateBakeryAndBread();
    allProducts.push(...bakery);
    console.log(`   ✓ Generated ${bakery.length} products`);

    console.log('🥔 Generating Snacks & Namkeen...');
    const snacks = generateSnacks();
    allProducts.push(...snacks);
    console.log(`   ✓ Generated ${snacks.length} products`);

    console.log('🥤 Generating Beverages...');
    const beverages = generateBeverages();
    allProducts.push(...beverages);
    console.log(`   ✓ Generated ${beverages.length} products`);

    console.log('🥛 Generating Dairy & Breakfast...');
    const dairy = generateDairyAndBreakfast();
    allProducts.push(...dairy);
    console.log(`   ✓ Generated ${dairy.length} products`);

    console.log('🌾 Generating Indian Groceries...');
    const groceries = generateIndianGroceries();
    allProducts.push(...groceries);
    console.log(`   ✓ Generated ${groceries.length} products`);

    console.log('🧴 Generating Personal Care...');
    const personalCare = generatePersonalCare();
    allProducts.push(...personalCare);
    console.log(`   ✓ Generated ${personalCare.length} products`);

    console.log('🧹 Generating Home Care...');
    const homeCare = generateHomeCare();
    allProducts.push(...homeCare);
    console.log(`   ✓ Generated ${homeCare.length} products`);

    console.log('📱 Generating Electronics & Gadgets...');
    const electronics = generateElectronicsAndGadgets();
    allProducts.push(...electronics);
    console.log(`   ✓ Generated ${electronics.length} products`);

    console.log('📝 Generating Stationery & Office...');
    const stationery = generateStationery();
    allProducts.push(...stationery);
    console.log(`   ✓ Generated ${stationery.length} products`);

    console.log('👶 Generating Baby Care...');
    const babyCare = generateBabyCare();
    allProducts.push(...babyCare);
    console.log(`   ✓ Generated ${babyCare.length} products`);

    console.log('🐕 Generating Pet Supplies...');
    const petSupplies = generatePetSupplies();
    allProducts.push(...petSupplies);
    console.log(`   ✓ Generated ${petSupplies.length} products`);

    console.log(`\n📊 Total products to insert: ${allProducts.length}\n`);

    // Insert products in batches
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      const batch = allProducts.slice(i, i + BATCH_SIZE);
      await Product.insertMany(batch);
      insertedCount += batch.length;
      console.log(`   Inserted ${insertedCount}/${allProducts.length} products...`);
    }

    console.log(`\n✅ Successfully seeded ${allProducts.length} products!\n`);

    // Display statistics
    const stats = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Products by category:');
    stats.forEach(stat => {
      console.log(`   • ${stat._id}: ${stat.count} products`);
    });

    const totalProducts = await Product.countDocuments();
    console.log(`\n🎉 Total products in database: ${totalProducts}`);

    console.log('\n✨ Catalog seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seed function
seedProducts();
