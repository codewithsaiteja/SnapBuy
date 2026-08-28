const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Seeding');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const CATALOG = [
  {
    category: 'Groceries',
    items: [
      {
        name: 'Basmati Rice',
        description: 'Premium quality aromatic long-grain basmati rice.',
        variants: [
          { label: '1kg', price: 120 },
          { label: '2kg', price: 230 },
          { label: '5kg', price: 550 },
          { label: '10kg', price: 1050 },
          { label: '25kg', price: 2500 }
        ]
      },
      {
        name: 'Wheat Atta',
        description: 'Whole wheat flour for soft and nutritious rotis.',
        variants: [
          { label: '1kg', price: 60 },
          { label: '2kg', price: 115 },
          { label: '5kg', price: 275 },
          { label: '10kg', price: 530 },
          { label: '20kg', price: 1020 }
        ]
      },
      {
        name: 'Toor Dal',
        description: 'Premium split pigeon peas, high in protein.',
        variants: [
          { label: '500g', price: 90 },
          { label: '1kg', price: 175 },
          { label: '2kg', price: 340 },
          { label: '5kg', price: 820 },
          { label: '10kg', price: 1600 }
        ]
      },
      {
        name: 'Sugar',
        description: 'Pure white sulphur-free sugar crystals.',
        variants: [
          { label: '500g', price: 25 },
          { label: '1kg', price: 48 },
          { label: '2kg', price: 92 },
          { label: '5kg', price: 225 },
          { label: '10kg', price: 440 }
        ]
      },
      {
        name: 'Salt',
        description: 'Iodized table salt for daily cooking.',
        variants: [
          { label: '500g', price: 15 },
          { label: '1kg', price: 25 },
          { label: '2kg', price: 48 },
          { label: '5kg', price: 110 },
          { label: '10kg', price: 210 }
        ]
      },
      {
        name: 'Cooking Oil',
        description: 'Healthy sunflower cooking oil for daily use.',
        variants: [
          { label: '500ml', price: 95 },
          { label: '1L', price: 180 },
          { label: '2L', price: 350 },
          { label: '5L', price: 850 },
          { label: '10L', price: 1650 }
        ]
      },
      {
        name: 'Ghee',
        description: 'Pure and aromatic cow ghee.',
        variants: [
          { label: '200ml', price: 190 },
          { label: '500ml', price: 450 },
          { label: '1L', price: 880 },
          { label: '2L', price: 1720 },
          { label: '5L', price: 4200 }
        ]
      },
      {
        name: 'Milk',
        description: 'Fresh and pasteurized toned milk.',
        variants: [
          { label: '500ml', price: 30 },
          { label: '1L', price: 58 },
          { label: '2L', price: 112 },
          { label: '5L', price: 270 },
          { label: '10L', price: 530 }
        ]
      },
      {
        name: 'Curd',
        description: 'Fresh and thick set curd.',
        variants: [
          { label: '200g', price: 25 },
          { label: '400g', price: 48 },
          { label: '1kg', price: 110 },
          { label: '2kg', price: 210 },
          { label: '5kg', price: 500 }
        ]
      },
      {
        name: 'Paneer',
        description: 'Fresh cottage cheese, soft and delicious.',
        variants: [
          { label: '200g', price: 95 },
          { label: '500g', price: 225 },
          { label: '1kg', price: 430 },
          { label: '2kg', price: 840 },
          { label: '5kg', price: 2050 }
        ]
      },
      {
        name: 'Butter',
        description: 'Creamy salted table butter.',
        variants: [
          { label: '100g', price: 60 },
          { label: '200g', price: 115 },
          { label: '500g', price: 275 },
          { label: '1kg', price: 530 },
          { label: '2kg', price: 1040 }
        ]
      },
      {
        name: 'Bread',
        description: 'Fresh bakery sandwich bread.',
        variants: [
          { label: 'Regular', price: 40 },
          { label: 'Large', price: 60 },
          { label: 'Whole Wheat', price: 55 },
          { label: 'Multi Grain', price: 65 },
          { label: 'Garlic Bread', price: 85 }
        ]
      },
      {
        name: 'Eggs',
        description: 'Fresh farm eggs rich in protein.',
        variants: [
          { label: '6-Pack', price: 50 },
          { label: '12-Pack', price: 95 },
          { label: '30-Pack', price: 220 },
          { label: '60-Pack', price: 420 },
          { label: '120-Pack', price: 800 }
        ]
      },
      {
        name: 'Noodles',
        description: 'Instant noodles with authentic spice mix.',
        variants: [
          { label: '1-Pack', price: 20 },
          { label: '4-Pack', price: 75 },
          { label: '8-Pack', price: 140 },
          { label: '12-Pack', price: 200 },
          { label: '24-Pack', price: 380 }
        ]
      },
      {
        name: 'Pasta',
        description: 'Durum wheat pasta, perfect for meals.',
        variants: [
          { label: '250g', price: 70 },
          { label: '500g', price: 130 },
          { label: '1kg', price: 250 },
          { label: '2kg', price: 480 },
          { label: '5kg', price: 1150 }
        ]
      },
      {
        name: 'Corn Flakes',
        description: 'Crisp corn flakes for a healthy breakfast.',
        variants: [
          { label: '250g', price: 100 },
          { label: '500g', price: 190 },
          { label: '1kg', price: 360 },
          { label: '2kg', price: 700 },
          { label: '5kg', price: 1680 }
        ]
      },
      {
        name: 'Oats',
        description: 'Wholegrain rolled oats.',
        variants: [
          { label: '400g', price: 90 },
          { label: '1kg', price: 210 },
          { label: '2kg', price: 400 },
          { label: '5kg', price: 950 },
          { label: '10kg', price: 1850 }
        ]
      },
      {
        name: 'Coffee',
        description: 'Premium roasted coffee beans and powder.',
        variants: [
          { label: '100g', price: 150 },
          { label: '250g', price: 350 },
          { label: '500g', price: 650 },
          { label: '1kg', price: 1200 },
          { label: 'Pack of 2 250g', price: 680 }
        ]
      }
    ]
  },
  {
    category: 'Electrical',
    items: [
      {
        name: 'Extension Board',
        description: 'Multi-plug extension strip with surge protection.',
        variants: [
          { label: '3-Way 1.5m', price: 299 },
          { label: '4-Way 2m', price: 399 },
          { label: '5-Way 3m', price: 499 },
          { label: '6-Way 5m', price: 699 },
          { label: 'Surge Protector', price: 999 }
        ]
      },
      {
        name: 'Smart Bulb',
        description: 'LED smart bulb compatible with smart assistants.',
        variants: [
          { label: '9W White', price: 349 },
          { label: '12W White', price: 449 },
          { label: '15W White', price: 549 },
          { label: '9W RGB', price: 599 },
          { label: '12W RGB', price: 699 }
        ]
      },
      {
        name: 'USB Hub',
        description: 'High-speed multi-port USB adapter.',
        variants: [
          { label: '3-Port USB 2.0', price: 249 },
          { label: '4-Port USB 3.0', price: 499 },
          { label: '7-Port Powered', price: 899 },
          { label: 'Type-C 4-in-1', price: 999 },
          { label: 'Type-C 8-in-1', price: 1999 }
        ]
      },
      {
        name: 'Charger',
        description: 'Fast power adapter charger.',
        variants: [
          { label: '5W Standard', price: 199 },
          { label: '18W Fast', price: 399 },
          { label: '33W Fast', price: 599 },
          { label: '65W GaN', price: 1499 },
          { label: '100W GaN', price: 2499 }
        ]
      },
      {
        name: 'Power Bank',
        description: 'Portable emergency battery charger bank.',
        variants: [
          { label: '5000mAh', price: 699 },
          { label: '10000mAh', price: 1199 },
          { label: '20000mAh', price: 1899 },
          { label: '30000mAh', price: 2799 },
          { label: '50000mAh', price: 4499 }
        ]
      },
      {
        name: 'Adapter',
        description: 'Universal power and device connectivity adapter.',
        variants: [
          { label: 'Universal Travel', price: 499 },
          { label: 'Type-C to USB', price: 199 },
          { label: 'Type-C to HDMI', price: 699 },
          { label: 'Micro USB to Type-C', price: 99 },
          { label: 'Headphone Jack', price: 299 }
        ]
      },
      {
        name: 'Plug',
        description: 'High-quality electrical power plug.',
        variants: [
          { label: '3-Pin Male', price: 49 },
          { label: 'Smart Plug 10A', price: 699 },
          { label: 'Smart Plug 16A', price: 899 },
          { label: '2-Pin Male', price: 39 },
          { label: 'Multi Plug Adapter', price: 149 }
        ]
      }
    ]
  },
  {
    category: 'Electronics',
    items: [
      {
        name: 'Wireless Mouse',
        description: 'Ergonomic 2.4GHz computer mouse.',
        variants: [
          { label: 'Basic', price: 399 },
          { label: 'Silent', price: 599 },
          { label: 'Ergonomic', price: 899 },
          { label: 'Gaming RGB', price: 1299 },
          { label: 'Premium Dual Mode', price: 1799 }
        ]
      },
      {
        name: 'Keyboard',
        description: 'Wired and wireless computer keyboards.',
        variants: [
          { label: 'Membrane', price: 599 },
          { label: 'Wireless Slim', price: 1199 },
          { label: 'Mechanical Blue', price: 2199 },
          { label: 'Mechanical Red', price: 2499 },
          { label: 'Bluetooth Multi-Device', price: 2999 }
        ]
      },
      {
        name: 'Headphones',
        description: 'Stereo audio over-ear headphones.',
        variants: [
          { label: 'Wired Over-Ear', price: 599 },
          { label: 'Wireless On-Ear', price: 1199 },
          { label: 'Active Noise Cancelling', price: 3499 },
          { label: 'Gaming with Mic', price: 1999 },
          { label: 'Studio Monitor', price: 4999 }
        ]
      },
      {
        name: 'Earphones',
        description: 'In-ear wired and wireless buds.',
        variants: [
          { label: 'Wired In-Ear', price: 199 },
          { label: 'Type-C Wired', price: 299 },
          { label: 'Wireless Neckband', price: 799 },
          { label: 'TWS Earbuds', price: 1499 },
          { label: 'ANC TWS Earbuds', price: 2499 }
        ]
      },
      {
        name: 'USB-C Cable',
        description: 'Fast sync & charge Type-C cable.',
        variants: [
          { label: '0.5m', price: 149 },
          { label: '1m', price: 199 },
          { label: '2m', price: 299 },
          { label: '3m', price: 399 },
          { label: 'Braided 1.5m', price: 349 }
        ]
      },
      {
        name: 'HDMI Cable',
        description: 'High-speed audio & video display cable.',
        variants: [
          { label: '1m', price: 199 },
          { label: '2m', price: 299 },
          { label: '3m', price: 399 },
          { label: '5m', price: 599 },
          { label: '10m', price: 999 }
        ]
      }
    ]
  },
  {
    category: 'Personal Care',
    items: [
      {
        name: 'Shampoo',
        description: 'Mild hair cleansing shampoo.',
        variants: [
          { label: '100ml', price: 99 },
          { label: '200ml', price: 180 },
          { label: '400ml', price: 320 },
          { label: '650ml', price: 480 },
          { label: '1L', price: 680 }
        ]
      },
      {
        name: 'Conditioner',
        description: 'Softening and detangling hair conditioner.',
        variants: [
          { label: '100ml', price: 110 },
          { label: '200ml', price: 199 },
          { label: '400ml', price: 350 },
          { label: '650ml', price: 530 },
          { label: '1L', price: 750 }
        ]
      },
      {
        name: 'Soap',
        description: 'Moisturizing skin bathing soap bar.',
        variants: [
          { label: '1-Pack', price: 35 },
          { label: '3-Pack', price: 99 },
          { label: '5-Pack', price: 155 },
          { label: '8-Pack', price: 235 },
          { label: '12-Pack', price: 340 }
        ]
      },
      {
        name: 'Hand Wash',
        description: 'Liquid germ protection hand wash.',
        variants: [
          { label: '200ml', price: 79 },
          { label: '500ml', price: 139 },
          { label: '1L', price: 220 },
          { label: '1.5L', price: 299 },
          { label: '5L', price: 850 }
        ]
      },
      {
        name: 'Face Wash',
        description: 'Purifying foaming skin face wash.',
        variants: [
          { label: '50ml', price: 89 },
          { label: '100ml', price: 150 },
          { label: '150ml', price: 210 },
          { label: '200ml', price: 270 },
          { label: 'Pack of 2 100ml', price: 280 }
        ]
      },
      {
        name: 'Moisturizer',
        description: 'Softening body and face cream skin moisturizer.',
        variants: [
          { label: '50ml', price: 120 },
          { label: '100ml', price: 199 },
          { label: '200ml', price: 340 },
          { label: '400ml', price: 599 },
          { label: '1L', price: 1190 }
        ]
      },
      {
        name: 'Sunscreen',
        description: 'UV protection sunscreen gel.',
        variants: [
          { label: '30ml', price: 199 },
          { label: '50ml', price: 320 },
          { label: '100ml', price: 550 },
          { label: 'SPF 30 50ml', price: 270 },
          { label: 'SPF 50 100ml', price: 599 }
        ]
      },
      {
        name: 'Toothpaste',
        description: 'Antibacterial dental cavity protection toothpaste.',
        variants: [
          { label: '50g', price: 35 },
          { label: '100g', price: 65 },
          { label: '200g', price: 120 },
          { label: 'Pack of 2 200g', price: 220 },
          { label: 'Pack of 4 200g', price: 410 }
        ]
      },
      {
        name: 'Toothbrush',
        description: 'Multi-angle bristles soft toothbrush.',
        variants: [
          { label: '1-Pack', price: 30 },
          { label: '2-Pack', price: 55 },
          { label: '4-Pack', price: 100 },
          { label: '6-Pack', price: 140 },
          { label: 'Electric', price: 999 }
        ]
      },
      {
        name: 'Deodorant',
        description: 'Aromatic freshness spray deodorant.',
        variants: [
          { label: '100ml', price: 120 },
          { label: '150ml', price: 180 },
          { label: '200ml', price: 230 },
          { label: 'Pack of 2', price: 330 },
          { label: 'Pack of 3', price: 470 }
        ]
      },
      {
        name: 'Hair Oil',
        description: 'Nourishing oil for healthy hair.',
        variants: [
          { label: '100ml', price: 75 },
          { label: '200ml', price: 135 },
          { label: '500ml', price: 290 },
          { label: '1L', price: 540 },
          { label: '2L', price: 1020 }
        ]
      }
    ]
  },
  {
    category: 'Home & Kitchen',
    items: [
      {
        name: 'Dish Soap',
        description: 'Degreasing lemon kitchen dish soap.',
        variants: [
          { label: '250ml', price: 45 },
          { label: '500ml', price: 85 },
          { label: '1L', price: 160 },
          { label: '2L', price: 299 },
          { label: '5L', price: 699 }
        ]
      },
      {
        name: 'Scrubber',
        description: 'Nylon and steel scouring pads kitchen scrubber.',
        variants: [
          { label: '1-Pack', price: 15 },
          { label: '3-Pack', price: 40 },
          { label: '6-Pack', price: 75 },
          { label: '12-Pack', price: 135 },
          { label: 'Sponge 4-Pack', price: 99 }
        ]
      },
      {
        name: 'Dustbin',
        description: 'Pedal and swing indoor waste dustbin.',
        variants: [
          { label: '5L Pedal', price: 199 },
          { label: '10L Pedal', price: 320 },
          { label: '20L Swing', price: 480 },
          { label: '32L Outdoor', price: 799 },
          { label: 'Smart Sensor 12L', price: 1999 }
        ]
      },
      {
        name: 'Cloth Hanger',
        description: 'Durable anti-slip wardrobe clothes hanger.',
        variants: [
          { label: '6-Pack', price: 99 },
          { label: '12-Pack', price: 180 },
          { label: '24-Pack', price: 330 },
          { label: '6-Pack Wooden', price: 449 },
          { label: '12-Pack Metal', price: 299 }
        ]
      },
      {
        name: 'Bucket',
        description: 'Heavy-duty plastic utility bucket.',
        variants: [
          { label: '5L', price: 79 },
          { label: '10L', price: 129 },
          { label: '15L', price: 179 },
          { label: '20L', price: 229 },
          { label: '25L', price: 279 }
        ]
      },
      {
        name: 'Mug',
        description: 'Graduated liquid measuring and bath mug.',
        variants: [
          { label: '500ml', price: 29 },
          { label: '1L', price: 49 },
          { label: '1.5L', price: 69 },
          { label: '2L', price: 89 },
          { label: 'Pack of 2 1L', price: 89 }
        ]
      },
      {
        name: 'Plate',
        description: 'Ceramic and melamine dinner plates.',
        variants: [
          { label: '1 Dinner Plate', price: 79 },
          { label: '4-Pack', price: 299 },
          { label: '6-Pack', price: 420 },
          { label: '6-Pack Quarter', price: 240 },
          { label: '12-Piece Set', price: 1199 }
        ]
      },
      {
        name: 'Bowl',
        description: 'Salad and soup mixing bowls.',
        variants: [
          { label: '1 Small Bowl', price: 39 },
          { label: '4-Pack', price: 180 },
          { label: '6-Pack Serving', price: 390 },
          { label: '6-Pack Soup', price: 250 },
          { label: '12-Piece Set', price: 690 }
        ]
      },
      {
        name: 'Glass',
        description: 'Water and juice drinking glasses.',
        variants: [
          { label: '1 Tumbler', price: 49 },
          { label: '4-Pack', price: 180 },
          { label: '6-Pack Water', price: 250 },
          { label: '6-Pack Juice', price: 290 },
          { label: '6-Pack Crystal', price: 799 }
        ]
      },
      {
        name: 'Storage Container',
        description: 'Airtight food storage box container.',
        variants: [
          { label: '250ml', price: 49 },
          { label: '500ml', price: 79 },
          { label: '1L', price: 119 },
          { label: '3-Piece Set', price: 299 },
          { label: '6-Piece Set', price: 549 }
        ]
      }
    ]
  }
];

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const generateProducts = () => {
  const products = [];

  CATALOG.forEach(({ category, items }) => {
    items.forEach((item) => {
      item.variants.forEach((variant) => {
        const name = `${item.name} (${variant.label})`;
        const seed = slugify(name);
        const imageUrl = `https://picsum.photos/seed/${seed}/200/200`;

        products.push({
          name,
          price: variant.price,
          category,
          description: `${item.description} — ${variant.label}.`,
          emoji: '', // Force empty emoji to comply with emoji-free requirement
          image: imageUrl,
          imageUrl,
        });
      });
    });
  });

  return products;
};

const importData = async () => {
  try {
    await Product.deleteMany();
    const products = generateProducts();

    if (products.length < 250) {
      throw new Error(`Expected 250+ products, generated ${products.length}`);
    }

    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products successfully`);
    process.exit(0);
  } catch (error) {
    console.error('Error with data import', error);
    process.exit(1);
  }
};

connectDB().then(importData);
