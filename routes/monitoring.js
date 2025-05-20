const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const monitoringService = require('../services/MonitoringService');
const { UserAction, User } = require('../models');
const { Op } = require('sequelize');

// Get monitored users (admin only)
router.get('/monitored-users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const monitoredUsers = await monitoringService.getMonitoredUsers();
    res.json(monitoredUsers);
  } catch (error) {
    console.error('Error fetching monitored users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/monitoring/logs - Get all activity logs with filtering and pagination (admin only)
router.get('/logs', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      username,
      action,
      entityType,
      startDate,
      endDate
    } = req.query;

    const where = {};
    const include = [{
      model: User,
      attributes: ['id', 'username', 'email'],
      required: true,
      ...(username ? {
        where: {
          username: {
            [Op.iLike]: `%${username}%`
          }
        }
      } : {})
    }];

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = new Date(startDate);
      if (endDate) where.timestamp[Op.lte] = new Date(endDate);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await UserAction.findAndCountAll({
      where,
      include,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      raw: false // Ensure we get full model instances
    });

    // Transform the data to ensure user data is properly included
    const logs = rows.map(log => ({
      ...log.toJSON(),
      user: log.User ? {
        id: log.User.id,
        username: log.User.username,
        email: log.User.email
      } : null
    }));

    res.json({
      logs,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/monitoring/users - Get all monitored users (admin only)
router.get('/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const monitoredUsers = await monitoringService.getMonitoredUsers();
    res.json(monitoredUsers);
  } catch (error) {
    console.error('Error fetching monitored users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/monitoring/users/:id/activity - Get activity stats for a specific user (admin only)
router.get('/users/:id/activity', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const activityStats = await monitoringService.getUserActivityStats(req.params.id);
    res.json(activityStats);
  } catch (error) {
    console.error('Error fetching user activity stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 