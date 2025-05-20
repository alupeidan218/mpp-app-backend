const { UserAction } = require('../models');

const logAction = async (userId, action, entityType, entityId = null, details = null, req = null) => {
  try {
    await UserAction.create({
      userId,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent']
    });
  } catch (error) {
    console.error('Error logging user action:', error);
  }
};

const getActionLogs = async (filters = {}, page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.startDate) where.createdAt = { ...where.createdAt, [Op.gte]: filters.startDate };
    if (filters.endDate) where.createdAt = { ...where.createdAt, [Op.lte]: filters.endDate };

    const { count, rows } = await UserAction.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return {
      logs: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    console.error('Error fetching action logs:', error);
    throw error;
  }
};

module.exports = {
  logAction,
  getActionLogs
}; 