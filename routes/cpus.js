const express = require('express');
const router = express.Router();
const { CPU, Manufacturer } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');

// GET /api/cpus - Get all CPUs with filtering and sorting
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      limit = 25,
      offset = 0,
      sortBy = 'score',
      sortOrder = 'desc',
      manufacturerId,
      minPrice,
      maxPrice,
      minScore,
      maxScore,
      series,
      generation,
      search
    } = req.query;

    // Build query options
    const queryOptions = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: Manufacturer,
          attributes: ['name', 'description']
        }
      ],
      where: {}
    };

    // Only admins can see all CPUs; users see only their own
    if (req.user.role !== 'admin') {
      queryOptions.where.userId = req.user.id;
    }

    // Add filters
    if (manufacturerId) {
      queryOptions.where.manufacturerId = manufacturerId;
    }

    if (minPrice || maxPrice) {
      queryOptions.where.priceUSD = {};
      if (minPrice) queryOptions.where.priceUSD[Op.gte] = parseFloat(minPrice);
      if (maxPrice) queryOptions.where.priceUSD[Op.lte] = parseFloat(maxPrice);
    }

    if (minScore || maxScore) {
      queryOptions.where.score = {};
      if (minScore) queryOptions.where.score[Op.gte] = parseInt(minScore);
      if (maxScore) queryOptions.where.score[Op.lte] = parseInt(maxScore);
    }

    if (series) {
      queryOptions.where.series = series;
    }

    if (generation) {
      queryOptions.where.generation = generation;
    }

    if (search) {
      queryOptions.where[Op.or] = [
        { model: { [Op.iLike]: `%${search}%` } },
        { series: { [Op.iLike]: `%${search}%` } },
        { generation: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get total count for pagination
    const total = await CPU.count({ where: queryOptions.where });

    // Get CPUs with pagination
    const cpus = await CPU.findAll(queryOptions);

    res.json({
      data: cpus,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching CPUs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cpus/:id - Get a specific CPU
router.get('/:id', async (req, res) => {
  try {
    const cpu = await CPU.findByPk(req.params.id, {
      include: [{
        model: Manufacturer,
        attributes: ['name', 'description']
      }]
    });

    if (!cpu) {
      return res.status(404).json({ error: 'CPU not found' });
    }

    res.json(cpu);
  } catch (error) {
    console.error('Error fetching CPU:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cpus - Create a new CPU
router.post('/', async (req, res) => {
  try {
    const cpu = await CPU.create({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json(cpu);
  } catch (error) {
    console.error('Error creating CPU:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/cpus/:id - Update a CPU
router.put('/:id', async (req, res) => {
  try {
    const cpu = await CPU.findByPk(req.params.id);
    if (!cpu) {
      return res.status(404).json({ error: 'CPU not found' });
    }

    // Check if user has permission to update
    if (cpu.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this CPU' });
    }

    await cpu.update(req.body);
    res.json(cpu);
  } catch (error) {
    console.error('Error updating CPU:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cpus/:id - Delete a CPU
router.delete('/:id', async (req, res) => {
  try {
    const cpu = await CPU.findByPk(req.params.id);
    if (!cpu) {
      return res.status(404).json({ error: 'CPU not found' });
    }

    // Check if user has permission to delete
    if (cpu.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this CPU' });
    }

    await cpu.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting CPU:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 