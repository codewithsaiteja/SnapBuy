const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  emoji: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  }
});

// Static method to seed products
ProductSchema.statics.seedProducts = async function() {
  const products = [
    { name: 'Coffee', price: 499, image: 'https://via.placeholder.com/150?text=Coffee' },
    { name: 'Mouse', price: 799, image: 'https://via.placeholder.com/150?text=Mouse' },
    { name: 'USB-C Cable', price: 299, image: 'https://via.placeholder.com/150?text=USB-C' },
    { name: 'Notebook', price: 150, image: 'https://via.placeholder.com/150?text=Notebook' },
    { name: 'Desk Lamp', price: 1200, image: 'https://via.placeholder.com/150?text=Lamp' }
  ];

  try {
    await this.deleteMany({});
    await this.insertMany(products);
    console.log('✅ Products seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  }
};

ProductSchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
