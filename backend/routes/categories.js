const express = require('express');
const Category = require('../models/Category');
const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a category
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  try {
    const category = await Category.create({ name, description });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
