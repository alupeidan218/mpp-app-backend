const { User, CPU, Manufacturer, sequelize } = require('../models');
const { Op } = require('sequelize');

async function simulateAttack() {
  try {
    console.log('Starting attack simulation...');

    // Get a regular user
    const user = await User.findOne({
      where: { role: 'user' }
    });

    if (!user) {
      console.error('No regular user found. Please create a user first.');
      return;
    }

    // Get a manufacturer
    const manufacturer = await Manufacturer.findOne();

    if (!manufacturer) {
      console.error('No manufacturer found. Please create a manufacturer first.');
      return;
    }

    console.log(`Simulating suspicious activity for user: ${user.username}`);

    // Generate 200 CPU entries in a short time
    const batchSize = 20;
    const totalEntries = 200;

    for (let i = 0; i < totalEntries; i += batchSize) {
      const entries = Array(batchSize).fill().map(() => ({
        model: `Test CPU ${i + Math.floor(Math.random() * 1000)}`,
        score: Math.floor(Math.random() * 10000),
        nrCores: Math.floor(Math.random() * 32) + 1,
        clockSpeed: Math.random() * 5 + 1,
        manufacturingDate: new Date(),
        priceUSD: Math.random() * 2000 + 100,
        series: 'Test Series',
        generation: 'Test Generation',
        userId: user.id,
        manufacturerId: manufacturer.id
      }));

      await CPU.bulkCreate(entries);
      console.log(`Created batch ${i / batchSize + 1} of ${totalEntries / batchSize}`);
    }

    console.log('Attack simulation completed!');
    console.log('The user should be marked as suspicious within 5 minutes.');
  } catch (error) {
    console.error('Error during attack simulation:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the simulation
simulateAttack(); 