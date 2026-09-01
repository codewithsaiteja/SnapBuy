const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
  },
  originalPrice: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    default: '',
    trim: true,
  },
  subcategory: {
    type: String,
    default: '',
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  // image field (used by existing order references)
  image: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  // Tags for natural language matching (e.g. ["milk chocolate","chocolate","sweet"])
  tags: {
    type: [String],
    default: [],
  },
  // Target audience chips (student, developer, professional, office, remote)
  targetAudience: {
    type: [String],
    default: [],
  },
  // Optional badge (e.g. "Best Seller", "Popular", "New")
  badge: {
    type: String,
    default: '',
  },
  stock: {
    type: Number,
    default: 100,
  },
  sku: {
    type: String,
    default: '',
    trim: true,
  },
  rating: {
    type: Number,
    default: 4.0,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Full-text search index — covers name, subcategory, category, tags, description
ProductSchema.index({ name: 'text', subcategory: 'text', category: 'text', tags: 'text', description: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ subcategory: 1 });
ProductSchema.index({ targetAudience: 1 });

module.exports = mongoose.model('Product', ProductSchema);
