const { User, UserAction } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

class MonitoringService {
  constructor() {
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.suspiciousThreshold = 100; // Number of actions in time window
    this.timeWindow = 15 * 60 * 1000; // 15 minutes
  }

  async startMonitoring() {
    console.log('Starting user activity monitoring...');
    setInterval(() => this.checkSuspiciousActivity(), this.checkInterval);
  }

  async checkSuspiciousActivity() {
    try {
      const timeWindow = new Date(Date.now() - this.timeWindow);

      // Get all users who have performed actions in the time window
      const suspiciousUsers = await UserAction.findAll({
        attributes: [
          'userId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'actionCount']
        ],
        where: {
          timestamp: {
            [Op.gte]: timeWindow
          }
        },
        group: ['userId'],
        having: sequelize.literal(`COUNT(*) >= ${this.suspiciousThreshold}`)
      });

      // Update monitored status for suspicious users
      for (const user of suspiciousUsers) {
        await User.update(
          { isMonitored: true },
          { where: { id: user.userId } }
        );

        console.log(`User ${user.userId} marked as suspicious. Action count: ${user.get('actionCount')}`);
      }
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
    }
  }

  async getMonitoredUsers() {
    try {
      return await User.findAll({
        where: { isMonitored: true },
        attributes: ['id', 'username', 'email', 'role', 'lastLoginAt'],
        include: [{
          model: UserAction,
          limit: 10,
          order: [['timestamp', 'DESC']],
          attributes: ['action', 'entityType', 'timestamp']
        }]
      });
    } catch (error) {
      console.error('Error fetching monitored users:', error);
      throw error;
    }
  }

  async getUserActivityStats(userId) {
    try {
      const timeWindow = new Date(Date.now() - this.timeWindow);
      
      return await UserAction.findAll({
        where: {
          userId,
          timestamp: {
            [Op.gte]: timeWindow
          }
        },
        attributes: [
          'action',
          'entityType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['action', 'entityType'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
      });
    } catch (error) {
      console.error('Error fetching user activity stats:', error);
      throw error;
    }
  }
}

module.exports = new MonitoringService(); 