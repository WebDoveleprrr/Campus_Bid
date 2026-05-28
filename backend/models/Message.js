const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  isPrivate: { type: Boolean, default: false }, // if false, it's group chat
  offer: {
    description: { type: String },
    cashAmount: { type: Number },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] }
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
