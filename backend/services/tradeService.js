const mongoose = require('mongoose');
const Trade = require('../models/Trade');
const Product = require('../models/Product');
const User = require('../models/User');

const completeTrade = async (tradeId) => {
  try {
    const trade = await Trade.findById(tradeId);
    if (!trade) throw new Error('Trade not found');

    const tradeItems = await mongoose.model('TradeItem').find({ tradeId });
    const productIds = tradeItems.map(item => item.productId);

    // update products -> status = "traded"
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { status: 'traded' } }
    );

    // update trade -> status = "completed"
    trade.status = 'completed';
    await trade.save();

    // increment users.totalTrades
    await User.updateMany(
      { _id: { $in: trade.users } },
      { $inc: { totalTrades: 1 } }
    );

    return trade;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  completeTrade
};
