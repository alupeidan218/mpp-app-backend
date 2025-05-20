const { faker } = require('@faker-js/faker');
const { User, CPU, Manufacturer, sequelize } = require('../models');
const bcrypt = require('bcryptjs');

async function generateData() {
  try {
    console.log('Purging old data...');
    await CPU.destroy({ where: {} });
    await Manufacturer.destroy({ where: {} });

    // Realistic base manufacturers
    const baseManufacturers = [
      'Intel', 'AMD', 'ARM', 'Apple', 'IBM', 'Qualcomm', 'VIA', 'Samsung', 'NVIDIA', 'HiSilicon', 'MediaTek', 'Texas Instruments', 'Motorola', 'Broadcom', 'Marvell', 'Cavium', 'SiFive', 'Zhaoxin', 'Transmeta', 'Centaur', 'Cyrix', 'National Semiconductor', 'DEC', 'Sun Microsystems', 'Fujitsu', 'NEC', 'Toshiba', 'Sharp', 'Rockchip', 'Allwinner', 'Spreadtrum', 'Unisoc', 'Altera', 'Xilinx', 'Atmel', 'Microchip', 'Analog Devices', 'Infineon', 'STMicroelectronics', 'Renesas', 'NXP', 'Sony', 'Panasonic', 'Philips', 'Hitachi', 'T.I.', 'LSI Logic', 'Fairchild', 'Western Digital', 'MOS Technology', 'Raspberry Pi Foundation'
    ];

    // Generate 100,000+ manufacturers by combining base names with locations/divisions
    const manufacturerCount = 100000;
    const manufacturerBatchSize = 1000;
    const manufacturerEntries = [];
    const usedNames = new Set();
    let generated = 0;
    while (generated < manufacturerCount) {
      const base = baseManufacturers[generated % baseManufacturers.length];
      const location = faker.location.city() + ' ' + faker.location.country();
      const name = `${base} ${location}`;
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      manufacturerEntries.push({
        name: name,
        description: `${base} division in ${location}`,
        foundedYear: faker.number.int({ min: 1960, max: 2023 }),
        headquarters: location
      });
      generated++;
      if (manufacturerEntries.length >= manufacturerBatchSize || generated === manufacturerCount) {
        await Manufacturer.bulkCreate(manufacturerEntries);
        console.log(`Inserted ${generated} manufacturers...`);
        manufacturerEntries.length = 0;
      }
    }

    // Create or find admin user
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (adminUser) {
      await adminUser.update({ password: await bcrypt.hash('admin123', 10) });
    } else {
      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin'
      });
    }

    // Create regular users if they don't exist
    const regularUsers = await Promise.all(
      Array(10).fill().map(async () => {
        const username = faker.internet.username();
        const [user] = await User.findOrCreate({
          where: { username },
          defaults: {
            email: faker.internet.email(),
            password: faker.internet.password(),
            role: 'user'
          }
        });
        return user;
      })
    );

    // Fetch all manufacturer IDs
    const allManufacturers = await Manufacturer.findAll({ attributes: ['id', 'name'] });
    const manufacturerIds = allManufacturers.map(m => m.id);
    const manufacturerNames = allManufacturers.map(m => m.name);

    // Generate realistic CPU models for each manufacturer
    const cpuEntries = [];
    const cpuBatchSize = 1000;
    const totalCPUs = 100000;
    console.log(`Generating ${totalCPUs} CPU entries...`);
    for (let i = 0; i < totalCPUs; i++) {
      const manufacturerIdx = Math.floor(Math.random() * manufacturerIds.length);
      const manufacturerId = manufacturerIds[manufacturerIdx];
      const manufacturerName = manufacturerNames[manufacturerIdx];
      const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
      let model = '';
      let series = '';
      let generation = '';
      if (manufacturerName.includes('Intel')) {
        series = faker.helpers.arrayElement(['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Xeon', 'Pentium', 'Celeron']);
        generation = faker.helpers.arrayElement(['8th Gen', '9th Gen', '10th Gen', '11th Gen', '12th Gen', '13th Gen']);
        model = `${series}-${faker.number.int({ min: 1000, max: 13900 })}`;
      } else if (manufacturerName.includes('AMD')) {
        series = faker.helpers.arrayElement(['Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'EPYC', 'Athlon', 'Threadripper']);
        generation = faker.helpers.arrayElement(['Zen', 'Zen+', 'Zen 2', 'Zen 3', 'Zen 4']);
        model = `${series} ${faker.number.int({ min: 1000, max: 9999 })}`;
      } else if (manufacturerName.includes('Apple')) {
        series = faker.helpers.arrayElement(['M1', 'M2', 'A14', 'A15', 'A16']);
        generation = '';
        model = `${series} ${faker.helpers.arrayElement(['Pro', 'Max', 'Ultra', ''])}`.trim();
      } else if (manufacturerName.includes('ARM')) {
        series = faker.helpers.arrayElement(['Cortex-A', 'Cortex-M', 'Cortex-R']);
        generation = `v${faker.number.int({ min: 7, max: 9 })}`;
        model = `${series}${faker.number.int({ min: 1, max: 99 })}`;
      } else {
        series = faker.helpers.arrayElement(['Custom', 'Embedded', 'Server', 'Mobile', 'Desktop']);
        generation = `Gen${faker.number.int({ min: 1, max: 10 })}`;
        model = `${series}-${faker.number.int({ min: 100, max: 9999 })}`;
      }
      const entry = {
        model: model,
        score: faker.number.int({ min: 1000, max: 10000 }),
        nrCores: faker.number.int({ min: 2, max: 64 }),
        clockSpeed: faker.number.float({ min: 1.0, max: 5.5, precision: 0.01 }),
        manufacturingDate: faker.date.past({ years: 5 }),
        priceUSD: faker.number.float({ min: 50, max: 10000, precision: 0.01 }),
        series: series,
        generation: generation,
        userId: user.id,
        manufacturerId
      };
      cpuEntries.push(entry);
      if (cpuEntries.length >= cpuBatchSize || i === totalCPUs - 1) {
        await CPU.bulkCreate(cpuEntries);
        console.log(`Inserted ${i + 1} CPUs...`);
        cpuEntries.length = 0;
      }
    }
    console.log('Data generation completed successfully!');
  } catch (error) {
    console.error('Error generating data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the seeder
generateData(); 