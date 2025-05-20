'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await queryInterface.bulkInsert('Users', [{
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Create manufacturers
    await queryInterface.bulkInsert('Manufacturers', [
      {
        name: 'Intel',
        description: 'Intel is a leading manufacturer of computer processors.',
        foundedYear: 1968,
        headquarters: 'Santa Clara, California',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'AMD',
        description: 'AMD is a leading manufacturer of computer processors.',
        foundedYear: 1969,
        headquarters: 'Santa Clara, California',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {});
    await queryInterface.bulkDelete('Manufacturers', null, {});
  }
}; 