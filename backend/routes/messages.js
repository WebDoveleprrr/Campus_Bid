const express = require('express');
const Message = require('../models/Message');
const protect = require('../middleware/authMiddleware');
const router = express.Router();

// Get messages for a user
router.get('/', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }]
    }).populate('sender recipient', 'username firstName');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
