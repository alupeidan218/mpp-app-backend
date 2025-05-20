const sequelize = require('../config/database');
const User = require('./User');
const Manufacturer = require('./Manufacturer');
const CPU = require('./CPU');
const UserAction = require('./UserAction');
const UploadedFile = require('./UploadedFile')(sequelize);

// Define associations
CPU.belongsTo(Manufacturer, { foreignKey: 'manufacturerId' });
Manufacturer.hasMany(CPU, { foreignKey: 'manufacturerId' });

CPU.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(CPU, { foreignKey: 'userId' });

UserAction.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(UserAction, { foreignKey: 'userId' });

UploadedFile.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(UploadedFile, { foreignKey: 'userId' });

// Initialize database and sync models
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync all models with the database
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized successfully.');

    // Create initial manufacturers if they don't exist
    const manufacturers = ['Intel', 'AMD'];
    for (const name of manufacturers) {
      await Manufacturer.findOrCreate({
        where: { name },
        defaults: {
          description: `${name} is a leading manufacturer of computer processors.`,
          foundedYear: name === 'Intel' ? 1968 : 1969,
          headquarters: name === 'Intel' ? 'Santa Clara, California' : 'Santa Clara, California'
        }
      });
    }
    console.log('Initial manufacturers created successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Manufacturer,
  CPU,
  UserAction,
  UploadedFile,
  initializeDatabase
}; 