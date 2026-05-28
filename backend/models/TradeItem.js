const mongoose = require('mongoose');

const TradeItemSchema = new mongoose.Schema({
  tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  cash: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('TradeItem', TradeItemSchema);
