require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus-marketplace';
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected to ${mongoUri}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
