const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Trade = require('../models/Trade');
const TradeItem = require('../models/TradeItem');
const Message = require('../models/Message');
const Favorite = require('../models/Favorite');

const seedData = async () => {
  try {
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const categoryCount = await Category.countDocuments();

    if (productCount === 0) {
      console.log('Seeding started...');

      // 1. Create Categories (Electronics, Books, Furniture)
      const categories = await Category.insertMany([
        { name: 'Electronics', description: 'Gadgets and devices' },
        { name: 'Books', description: 'Educational and fiction books' },
        { name: 'Furniture', description: 'Home and dorm furniture' }
      ]);

      // 2. Create Users (3)
      const user1 = await User.create({
        username: 'alice_trades',
        email: 'alice@example.com',
        password: 'password123',
        totalTrades: 5,
        rating: 4.8
      });
      const user2 = await User.create({
        username: 'bob_books',
        email: 'bob@example.com',
        password: 'password123',
        totalTrades: 12,
        rating: 4.5
      });
      const user3 = await User.create({
        username: 'charlie_tech',
        email: 'charlie@example.com',
        password: 'password123',
        totalTrades: 2,
        rating: 4.0
      });

      // 3. Create Products (3-5)
      // Using coordinates [72.83, 19.07]
      const products = await Product.insertMany([
        {
          title: 'MacBook Pro 2021',
          description: 'M1 chip, good condition',
          category: 'Electronics',
          categoryId: categories[0]._id,
          basePrice: 60000,
          currentPrice: 60000,
          seller: user3._id,
          listingType: 'auction'
        },
        {
          title: 'Data Structures and Algorithms in Java',
          description: 'Like new',
          category: 'Books',
          categoryId: categories[1]._id,
          basePrice: 500,
          currentPrice: 500,
          seller: user2._id,
          listingType: 'auction'
        },
        {
          title: 'IKEA Study Chair',
          description: 'Ergonomic chair, very comfortable',
          category: 'Furniture',
          categoryId: categories[2]._id,
          basePrice: 2000,
          currentPrice: 2000,
          seller: user1._id,
          listingType: 'barter'
        },
        {
          title: 'Sony Wireless Headphones',
          description: 'Noise cancelling, slight wear',
          category: 'Electronics',
          categoryId: categories[0]._id,
          basePrice: 5000,
          currentPrice: 5000,
          seller: user3._id,
          listingType: 'auction'
        }
      ]);

      // 4. Create Trades (2)
      const trade1 = await Trade.create({
        users: [user2._id, user3._id],
        status: 'completed'
      });

      const trade2 = await Trade.create({
        users: [user1._id, user2._id],
        status: 'pending'
      });

      // 5. TradeItems
      await TradeItem.insertMany([
        { tradeId: trade1._id, userId: user2._id, productId: products[1]._id },
        { tradeId: trade2._id, userId: user1._id, productId: products[2]._id }
      ]);

      // 6. Optional: 1 message, 1 favorite

      await Message.create({
        product: products[0]._id,
        sender: user2._id,
        recipient: user3._id,
        text: 'Is this still available?',
        isPrivate: true
      });

      await Favorite.create({
        userId: user1._id,
        productId: products[3]._id
      });

      console.log('Seeding completed');
    } else {
      console.log('Data already exists, skipping seed.');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

module.exports = seedData;

// Run seed directly when file is executed
if (require.main === module) {
  mongoose.connect('mongodb://127.0.0.1:27017/campus-marketplace')
    .then(() => {
      console.log('Connected to DB');
      return seedData();
    })
    .then(() => {
      console.log('Seeding complete');
      process.exit();
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}