const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    sparse: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  firstName: { type: String },
  middleName: { type: String },
  lastName: { type: String },
  mobileNumber: { type: String },
  hostelName: { type: String },
  hostelBlock: { type: String },
  roomNumber: { type: String },
  profilePic: { type: String },
  onboarded: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating_avg: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  totalTrades: { type: Number, default: 0 },
  rating: { type: Number, default: 0 }
}, { timestamps: true });

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
