const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const statisticsService = require('../services/StatisticsService');

// Get all CPU statistics
router.get('/cpu', authenticateToken, async (req, res) => {
  try {
    const statistics = await statisticsService.getCPUStatistics();
    res.json(statistics);
  } catch (error) {
    console.error('Error fetching CPU statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get performance comparison for a specific manufacturer
router.get('/performance/:manufacturerId', authenticateToken, async (req, res) => {
  try {
    const comparison = await statisticsService.getPerformanceComparison(req.params.manufacturerId);
    res.json(comparison);
  } catch (error) {
    console.error('Error fetching performance comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get price-performance ratio
router.get('/price-performance', authenticateToken, async (req, res) => {
  try {
    const ratio = await statisticsService.getPricePerformanceRatio();
    res.json(ratio);
  } catch (error) {
    console.error('Error fetching price-performance ratio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 