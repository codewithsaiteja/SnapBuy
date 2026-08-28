const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('📦 Connected to MongoDB');

    // Always re-seed to ensure correct prices/names
    await Product.deleteMany({});
    await Product.insertMany([
      { name: 'Coffee',       price: 499,  image: '' },
      { name: 'Mouse',        price: 799,  image: '' },
      { name: 'USB-C Cable',  price: 299,  image: '' },
      { name: 'Notebook',     price: 150,  image: '' },
      { name: 'Desk Lamp',    price: 1200, image: '' },
    ]);

    console.log('✅ Products seeded: Coffee ₹499, Mouse ₹799, USB-C Cable ₹299, Notebook ₹150, Desk Lamp ₹1200');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();
