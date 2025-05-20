const express = require('express');
const router = express.Router();
const { Manufacturer } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');

// GET /api/manufacturers - Get paginated, filterable, sortable list of manufacturers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      limit = 25,
      offset = 0,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    console.log('Search query:', search); // Debug log

    const where = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
      console.log('Search where clause:', where); // Debug log
    }

    const total = await Manufacturer.count({ where });
    console.log('Total matches:', total); // Debug log

    const manufacturers = await Manufacturer.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    console.log('Found manufacturers:', manufacturers.length); // Debug log

    res.json({
      data: manufacturers,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/manufacturers - Create a new manufacturer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const manufacturer = await Manufacturer.create(req.body);
    res.status(201).json(manufacturer);
  } catch (error) {
    console.error('Error creating manufacturer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/manufacturers/:id - Update a manufacturer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const manufacturer = await Manufacturer.findByPk(req.params.id);
    if (!manufacturer) {
      return res.status(404).json({ error: 'Manufacturer not found' });
    }
    await manufacturer.update(req.body);
    res.json(manufacturer);
  } catch (error) {
    console.error('Error updating manufacturer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/manufacturers/:id - Delete a manufacturer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const manufacturer = await Manufacturer.findByPk(req.params.id);
    if (!manufacturer) {
      return res.status(404).json({ error: 'Manufacturer not found' });
    }
    await manufacturer.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting manufacturer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 