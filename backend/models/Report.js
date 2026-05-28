const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  reason: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
