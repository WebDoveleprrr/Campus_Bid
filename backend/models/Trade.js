const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

TradeSchema.index({ status: 1 });

module.exports = mongoose.model('Trade', TradeSchema);
