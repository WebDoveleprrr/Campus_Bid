const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['Electronics', 'Mobiles & Tablets', 'Books', 'Stationery', 'Clothing', 'Beauty & Health', 'Furniture', 'Home & Kitchen', 'Sports & Outdoors', 'Vehicles & Bicycles', 'Toys & Games', 'Other'], default: 'Other' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  image: { type: String }, // optional simple URL or base64 placeholder
  listingType: { type: String, enum: ['auction', 'barter'], default: 'auction' },
  targetTrade: { type: String }, // Optional field for what seller wants in return
  basePrice: { type: Number, min: [0, 'Price must be positive'] }, // Optional for Barter
  currentPrice: { type: Number, min: [0, 'Price must be positive'] },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bids: [BidSchema],
  endTime: { type: Date },
  status: { type: String, enum: ['active', 'sold', 'expired', 'available', 'traded'], default: 'active' },
  finalBuyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

ProductSchema.index({ title: 'text', description: 'text', category: 'text' }, { weights: { title: 10, category: 5, description: 2 } });
ProductSchema.index({ category: 1 });

module.exports = mongoose.model('Product', ProductSchema);

