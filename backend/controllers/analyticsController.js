const User = require('../models/User');
const Trade = require('../models/Trade');
const TradeItem = require('../models/TradeItem');

const getTopUsers = async (req, res) => {
  try {
    const topUsers = await User.find()
      .sort({ totalTrades: -1 })
      .limit(10)
      .select('username totalTrades rating');
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPopularCategories = async (req, res) => {
  try {
    const popularCategories = await TradeItem.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$productDetails.categoryId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          categoryName: { $ifNull: ['$categoryDetails.name', '$productDetails.category'] },
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);
    res.json(popularCategories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getTradeSuccessRate = async (req, res) => {
  try {
    const successRate = await Trade.aggregate([
      {
        $match: {
          status: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    res.json(successRate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const Product = require('../models/Product'); // add at top of file if not present

const getMarketStats = async (req, res) => {
  try {
    const [liveAuctions, itemsTraded] = await Promise.all([
      Product.countDocuments({ status: 'active', listingType: 'auction' }),
      Trade.countDocuments({ status: { $in: ['sold', 'completed'] } })
    ]);
    res.json({ liveAuctions, itemsTraded });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTopUsers,
  getPopularCategories,
  getTradeSuccessRate,
  getMarketStats
};