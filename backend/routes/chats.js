const express = require('express');
const Message = require('../models/Message');
const protect = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/:productId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ product: req.params.productId })
      .populate('sender', 'username firstName lastName profilePic')
      .populate('recipient', 'username firstName lastName profilePic')
      .sort('createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
