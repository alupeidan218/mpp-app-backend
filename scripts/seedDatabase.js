const { sequelize } = require('../config/database');
const { User, Manufacturer, CPU } = require('../models');
const bcrypt = require('bcryptjs');

const generateCPUData = (manufacturerId, userId, count) => {
  const cpus = [];
  const intelSeries = ['Core i3', 'Core i5', 'Core i7', 'Core i9'];
  const amdSeries = ['Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9'];
  const generations = ['11th', '12th', '13th', '14th'];
  const manufacturer = manufacturerId === 1 ? 'Intel' : 'AMD';
  const series = manufacturer === 'Intel' ? intelSeries : amdSeries;

  for (let i = 0; i < count; i++) {
    const seriesName = series[Math.floor(Math.random() * series.length)];
    const generation = generations[Math.floor(Math.random() * generations.length)];
    const modelNumber = Math.floor(Math.random() * 900) + 100;
    const cores = Math.floor(Math.random() * 16) + 4;
    const score = Math.floor(Math.random() * 5000) + 1000;
    const price = Math.floor(Math.random() * 500) + 100;
    const clockSpeed = (Math.random() * 2 + 2).toFixed(1);
    const manufacturingDate = new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000);

    cpus.push({
      model: `${manufacturer} ${seriesName}-${generation} ${modelNumber}`,
      score,
      nrCores: cores,
      clockSpeed: parseFloat(clockSpeed),
      manufacturingDate: manufacturingDate.toISOString().split('T')[0],
      priceUSD: price,
      manufacturerId,
      userId
    });
  }

  return cpus;
};

const seedDatabase = async () => {
  try {
    // Create default admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin'
    });

    console.log('Created admin user:', adminUser.username);

    // Create manufacturers
    const manufacturers = await Promise.all([
      Manufacturer.create({
        name: 'Intel',
        description: 'Intel Corporation is an American multinational corporation and technology company.',
        foundedYear: 1968,
        headquarters: 'Santa Clara, California'
      }),
      Manufacturer.create({
        name: 'AMD',
        description: 'Advanced Micro Devices, Inc. is an American multinational semiconductor company.',
        foundedYear: 1969,
        headquarters: 'Santa Clara, California'
      })
    ]);

    console.log('Created manufacturers:', manufacturers.map(m => m.name).join(', '));

    // Generate and insert CPU data
    const intelCPUs = generateCPUData(manufacturers[0].id, adminUser.id, 1000);
    const amdCPUs = generateCPUData(manufacturers[1].id, adminUser.id, 1000);

    // Insert in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < intelCPUs.length; i += batchSize) {
      await CPU.bulkCreate(intelCPUs.slice(i, i + batchSize));
    }
    for (let i = 0; i < amdCPUs.length; i += batchSize) {
      await CPU.bulkCreate(amdCPUs.slice(i, i + batchSize));
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase(); 