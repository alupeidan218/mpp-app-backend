const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Manufacturer = require('./Manufacturer');
const User = require('./User');

const CPU = sequelize.define('CPU', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  nrCores: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  clockSpeed: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  manufacturingDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  priceUSD: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  series: {
    type: DataTypes.STRING,
    allowNull: true
  },
  generation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  manufacturerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Manufacturers',
      key: 'id'
    }
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['score']
    },
    {
      fields: ['priceUSD']
    },
    {
      fields: ['manufacturingDate']
    },
    {
      fields: ['series']
    },
    {
      fields: ['generation']
    },
    {
      fields: ['model']
    },
    {
      fields: ['nrCores']
    },
    {
      fields: ['clockSpeed']
    },
    {
      fields: ['manufacturerId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['manufacturerId', 'series']
    },
    {
      fields: ['manufacturerId', 'generation']
    },
    {
      fields: ['priceUSD', 'score']
    }
  ],
  scopes: {
    active: {
      where: {
        isArchived: false
      }
    },
    byManufacturer: (manufacturerId) => ({
      where: {
        manufacturerId
      }
    }),
    byPriceRange: (min, max) => ({
      where: {
        priceUSD: {
          [sequelize.Op.between]: [min, max]
        }
      }
    }),
    byScoreRange: (min, max) => ({
      where: {
        score: {
          [sequelize.Op.between]: [min, max]
        }
      }
    })
  }
});

// Define the relationships
CPU.belongsTo(Manufacturer, { foreignKey: 'manufacturerId' });
Manufacturer.hasMany(CPU, { foreignKey: 'manufacturerId' });

CPU.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(CPU, { foreignKey: 'userId' });

// Add instance methods
CPU.prototype.getPerformanceRatio = function() {
  return this.score / this.priceUSD;
};

CPU.prototype.isHighEnd = function() {
  return this.score > 5000 && this.priceUSD > 300;
};

module.exports = CPU; 