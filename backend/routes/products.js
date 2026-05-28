const express = require('express');
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const User = require('../models/User');
const mailer = require('../utils/mailer');
const protect = require('../middleware/authMiddleware');
const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Get Bidding Craze
router.get('/craze', async (req, res) => {
  try {
    const products = await Product.aggregate([
      { $match: { status: 'active', listingType: { $ne: 'barter' } } },
      { $addFields: { bidCount: { $size: { $ifNull: ['$bids', []] } } } },
      { $sort: { bidCount: -1, createdAt: -1 } },
      { $limit: 4 },
      { $lookup: { from: 'users', localField: 'seller', foreignField: '_id', as: 'sellerObj' } },
      { $unwind: '$sellerObj' },
      // Reshape seller back to match normal mongoose populate
      { $addFields: { seller: { _id: '$sellerObj._id', username: '$sellerObj.username', profilePic: '$sellerObj.profilePic', firstName: '$sellerObj.firstName' } } },
      { $project: { sellerObj: 0 } }
    ]);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active listings with filters
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sortBy, listingType, status } = req.query;
    let query = {};
    if (status) query.status = status;

    if (listingType === 'auction') {
      query.$or = [{ listingType: 'auction' }, { listingType: { $exists: false } }, { listingType: null }];
    } else if (listingType === 'barter') {
      query.listingType = 'barter';
    }

    // Apply category filter
    if (category) {
      query.category = category;
    }

    // Apply price range filters
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);

      if (Object.keys(priceFilter).length > 0) {
        query.$or = [
          { currentPrice: priceFilter },
          { currentPrice: { $exists: false }, basePrice: priceFilter },
          { currentPrice: null, basePrice: priceFilter }
        ];
      }
    }

    // Determine sort order
    let sort = { createdAt: -1 }; // default newest
    if (sortBy === 'price_asc') sort = { currentPrice: 1 };
    else if (sortBy === 'price_desc') sort = { currentPrice: -1 };
    else if (sortBy === 'oldest') sort = { createdAt: 1 };

    let products;
    if (search) {
      // Use text search with relevance scoring
      products = await Product.find(
        { ...query, $text: { $search: search } },
        { score: { $meta: 'textScore' } }
      )
        .populate('seller', 'username firstName lastName profilePic')
        .sort({ score: { $meta: 'textScore' }, ...sort });
    } else {
      products = await Product.find(query)
        .populate('seller', 'username firstName lastName profilePic')
        .sort(sort);
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create listing
router.post('/', protect, upload.single('image'), async (req, res) => {
  const { title, description, category, basePrice, durationMs, listingType, targetTrade } = req.body;
  try {
    let endTime = new Date();
    if (listingType === 'barter') {
      endTime.setFullYear(endTime.getFullYear() + 1); // 1 year essentially if no end date
    } else {
      if (!durationMs || isNaN(Number(durationMs))) {
        return res.status(400).json({ message: 'Duration is required for auctions' });
      }
      endTime = new Date(Date.now() + Number(durationMs));
    }

    let imageUrl = 'placeholder.jpg';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const product = await Product.create({
      title, description, category: category || 'Other',
      basePrice: listingType === 'barter' ? 0 : basePrice,
      currentPrice: listingType === 'barter' ? 0 : basePrice,
      seller: req.user._id,
      endTime,
      image: imageUrl,
      listingType: listingType || 'auction',
      targetTrade: targetTrade || ''
    });

    const io = req.app.get('io');
    const typeStr = listingType === 'barter' ? 'Trade' : 'Auction';
    const catchyMsg = `🔥 FRESH DROP: "@${req.user.username}" just launched "${title}" for ${typeStr}!`;

    if (io) {
      io.emit('new_drop', {
        title: "🚨 New Catch in the Market!",
        text: catchyMsg,
        imageUrl
      });
      // Fallback old global_ticker
      io.emit('global_ticker', { text: `💫 @${req.user.username} just listed "${title}"!` });
    }

    // Mass Mailer to all onboarded users (Async without blocking response)
    User.find({ email: { $exists: true, $ne: '' } }).then(users => {
      const emails = users.map(u => u.email).filter(Boolean);
      if (emails.length > 0) {
        mailer.sendMail({
          bcc: emails,
          subject: `🚨 Marketplace Alert: New ${typeStr} Drop!`,
          html: `
                  <h2 style="color: #111827;">🔥 New Item Alert!</h2>
                  <p style="font-size: 16px;">Hey there! <strong>@${req.user.username}</strong> just dropped something exciting on CampusBID.</p>
                  <div style="background: #f4f5f7; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">${title}</h3>
                    <p>${description}</p>
                    <p style="margin-bottom: 0;"><strong>Category:</strong> ${category || 'Other'}</p>
                    ${listingType === 'barter' ? `<p><strong>Looking for:</strong> ${targetTrade}</p>` : `<p><strong>Starting Price:</strong> ₹${basePrice}</p>`}
                  </div>
                  <p>Hurry up and check it out before someone else snags it! 🏃‍♂️💨</p>
                  <br/>
                  <p>Happy Trading,<br/>The CampusBID Team</p>
                `
        });
      }
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Get Hostel Leaderboard
router.get('/stats/leaderboard', async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'seller',
          foreignField: '_id',
          as: 'sellerObj'
        }
      },
      { $unwind: '$sellerObj' },
      {
        $group: {
          _id: '$sellerObj.hostelName',
          productCount: { $sum: 1 },
          activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          soldCount: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } }
        }
      },
      { $sort: { productCount: -1 } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Top Traders
router.get('/stats/top-traders', async (req, res) => {
  try {
    const stats = await User.find()
      .sort({ totalTrades: -1 })
      .limit(4)
      .select('_id username firstName profilePic isVerified totalTrades');
    
    // Map totalTrades to soldCount so frontend still works or just return stats
    // We will return totalTrades, frontend expects soldCount currently but we will update frontend
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Auctions Ending Soon
router.get('/ending-soon/items', async (req, res) => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const products = await Product.find({
      status: 'active',
      listingType: { $ne: 'barter' },
      endTime: { $lte: oneHourLater, $gte: now }
    })
      .sort({ endTime: 1 })
      .limit(4)
      .populate('seller', 'username firstName profilePic');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Epic Bidding (formerly Recent Barters)
router.get('/epic-bidding/items', async (req, res) => {
  try {
    const products = await Product.find({
      status: 'active',
      listingType: { $ne: 'barter' }
    })
      .sort({ currentPrice: -1 })
      .limit(4)
      .populate('seller', 'username firstName profilePic');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Trending Categories
router.get('/stats/categories', async (req, res) => {
  try {
    const stats = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single product details
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'username firstName lastName profilePic')
      .populate('bids.bidder', 'username')
      .populate('finalBuyer', 'username');
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Finish Bidding (Seller only)
router.post('/:id/finish', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only seller can finish bidding' });
    }

    const { buyerId } = req.body;
    product.status = 'sold';
    if (buyerId) {
      product.finalBuyer = buyerId;
    } else if (product.bids.length > 0) {
      // fallback to highest bidder
      product.bids.sort((a, b) => b.amount - a.amount);
      product.finalBuyer = product.bids[0].bidder;
    }
    await product.save();

    // Broadcast via socket io if accessible or just rely on REST for final state
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change Product Image (Seller only)
router.post('/:id/image', protect, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only seller can change the image' });
    }

    if (req.file) {
      product.image = `/uploads/${req.file.filename}`;
      await product.save();
      return res.json({ image: product.image });
    }
    res.status(400).json({ message: 'No image uploaded' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Product Details (Seller only)
router.put('/:id/details', protect, async (req, res) => {
  const { title, description, category } = req.body;
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only seller can edit details' });
    }

    product.title = title || product.title;
    product.description = description !== undefined ? description : product.description;
    product.category = category || product.category;

    await product.save();
    res.json({ title: product.title, description: product.description, category: product.category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete Product (Seller only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only seller can delete the listing' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Watchlist
router.post('/:id/watchlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.id;

    const index = user.watchlist.indexOf(productId);
    let message = '';
    if (index > -1) {
      user.watchlist.splice(index, 1);
      message = 'Removed from watchlist';
    } else {
      user.watchlist.push(productId);
      message = 'Added to watchlist';
    }

    await user.save();
    res.json({ message, watchlist: user.watchlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
