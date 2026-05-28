const express = require('express');
const Favorite = require('../models/Favorite');
const protect = require('../middleware/authMiddleware');
const router = express.Router();

// Get user favorites
router.get('/', protect, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user._id }).populate('productId');
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add or remove favorite
router.post('/', protect, async (req, res) => {
  const { productId } = req.body;
  try {
    const existing = await Favorite.findOne({ userId: req.user._id, productId });
    if (existing) {
      await existing.deleteOne();
      res.json({ message: 'Removed from favorites' });
    } else {
      const favorite = await Favorite.create({ userId: req.user._id, productId });
      res.status(201).json(favorite);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
