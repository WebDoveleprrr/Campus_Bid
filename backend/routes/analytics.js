const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
router.get('/market-stats', analyticsController.getMarketStats);

router.get('/top-users', analyticsController.getTopUsers);
router.get('/popular-categories', analyticsController.getPopularCategories);
router.get('/trade-success-rate', analyticsController.getTradeSuccessRate);

module.exports = router;
