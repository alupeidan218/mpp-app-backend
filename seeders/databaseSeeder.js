const { faker } = require('@faker-js/faker');
const { CPU, Manufacturer, User } = require('../models');
const bcrypt = require('bcryptjs');

const generateManufacturers = () => {
  return [
    {
      name: 'Intel',
      description: 'Intel Corporation is an American multinational corporation and technology company headquartered in Santa Clara, California.'
    },
    {
      name: 'AMD',
      description: 'Advanced Micro Devices, Inc. is an American multinational semiconductor company based in Santa Clara, California.'
    }
  ];
};

const generateCPUs = (count) => {
  const cpus = [];
  const manufacturers = ['Intel', 'AMD'];
  const intelSeries = ['Core i3', 'Core i5', 'Core i7', 'Core i9'];
  const amdSeries = ['Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9'];
  const generations = ['11th', '12th', '13th', '14th'];

  for (let i = 0; i < count; i++) {
    const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
    const series = manufacturer === 'Intel' 
      ? intelSeries[Math.floor(Math.random() * intelSeries.length)]
      : amdSeries[Math.floor(Math.random() * amdSeries.length)];
    const generation = generations[Math.floor(Math.random() * generations.length)];
    const modelNumber = Math.floor(Math.random() * 900) + 100;
    const cores = Math.floor(Math.random() * 16) + 4;
    const score = Math.floor(Math.random() * 5000) + 5000;
    const price = Math.floor(Math.random() * 500) + 100;

    cpus.push({
      model: `${manufacturer} ${series}-${generation} ${modelNumber}`,
      score: score,
      nrCores: cores,
      clockSpeed: (Math.random() * 2 + 2).toFixed(1),
      manufacturingDate: faker.date.past({ years: 3 }),
      priceUSD: price,
      manufacturerId: manufacturer === 'Intel' ? 1 : 2,
      series: series,
      generation: generation,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent()
    });
  }

  return cpus;
};

const generateUsers = (count) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'password123', // Will be hashed by the model hook
      role: i === 0 ? 'admin' : 'user', // First user is admin
      isMonitored: false,
      lastLoginAt: faker.date.recent()
    });
  }
  return users;
};

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    await CPU.destroy({ where: {}, force: true });
    await Manufacturer.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create manufacturers
    console.log('Creating manufacturers...');
    const manufacturers = await Manufacturer.bulkCreate(generateManufacturers());
    console.log(`Created ${manufacturers.length} manufacturers`);

    // Create users
    console.log('Creating users...');
    const users = await User.bulkCreate(generateUsers(10));
    console.log(`Created ${users.length} users`);

    // Create CPUs
    console.log('Creating CPUs...');
    const cpus = await CPU.bulkCreate(generateCPUs(1000));
    console.log(`Created ${cpus.length} CPUs`);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

module.exports = seedDatabase; 