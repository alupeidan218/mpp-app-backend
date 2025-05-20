const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAction = sequelize.define('UserAction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      isInt: true
    }
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  indexes: [
    {
      name: 'idx_user_actions_timestamp',
      fields: ['timestamp']
    },
    {
      name: 'idx_user_actions_user',
      fields: ['userId']
    },
    {
      name: 'idx_user_actions_composite',
      fields: ['userId', 'action', 'timestamp']
    }
  ]
});

module.exports = UserAction; 