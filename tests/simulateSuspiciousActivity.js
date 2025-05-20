const axios = require('axios');

// Helper function to add delay between operations
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function simulateSuspiciousActivity() {
  try {
    console.log('Starting suspicious activity simulation...');

    // Get authentication token for existing user
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'idontlovempp',
      email: 'idontlovempp@email.com',
      password: 'idontlovempp'
    });

    console.log('Successfully logged in');
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id; // Get the user ID from login response
    console.log('User ID:', userId);

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const baseUrl = 'http://localhost:3000/api';
    const createdCpuIds = [];

    // Fetch manufacturers
    let manufacturerId;
    try {
      const manufacturersRes = await axios.get('http://localhost:3000/api/manufacturers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const manufacturers = manufacturersRes.data.data || manufacturersRes.data;
      if (!manufacturers.length) {
        console.error('No manufacturers found in the database. Please seed manufacturers first.');
        process.exit(1);
      }
      manufacturerId = manufacturers[0].id;
      console.log('Using manufacturerId:', manufacturerId);
    } catch (err) {
      console.error('Failed to fetch manufacturers:', err.response?.data || err.message);
      process.exit(1);
    }

    // Simulate 150 operations (above the threshold of 100)
    for (let i = 0; i < 150; i++) {
      try {
        // Create operation
        const cpuData = {
          model: `Test CPU ${i}`,
          score: 1000 + i,
          nrCores: 4 + (i % 8),
          clockSpeed: 2.5 + (i % 3),
          manufacturingDate: '2023-01-01',
          priceUSD: 200 + i,
          manufacturerId,
          series: 'Test Series',
          generation: 'Test Gen',
          userId: userId
        };

        console.log(`Creating CPU ${i}...`);
        console.log('Request data:', JSON.stringify(cpuData, null, 2));
        
        const createResponse = await axios.post(`${baseUrl}/cpus`, cpuData, { headers });
        const createdCpu = createResponse.data;
        createdCpuIds.push(createdCpu.id);
        console.log(`Created CPU with ID: ${createdCpu.id}`);

        // Add small delay between operations
        await delay(100);

        // Read operation
        console.log('Reading CPUs...');
        await axios.get(`${baseUrl}/cpus`, { headers });
        await delay(100);

        // Update operation (only if we have created CPUs)
        if (createdCpuIds.length > 0) {
          const cpuToUpdate = createdCpuIds[createdCpuIds.length - 1];
          const updateData = {
            model: `Updated CPU ${i}`,
            score: 2000 + i,
            nrCores: 8,
            clockSpeed: 4.0,
            manufacturingDate: '2024-01-01',
            priceUSD: 200 + i,
            manufacturerId,
            series: `Updated Series ${i}`,
            generation: `${i}th Gen`,
            userId: userId
          };

          console.log(`Updating CPU ${cpuToUpdate}...`);
          await axios.put(`${baseUrl}/cpus/${cpuToUpdate}`, updateData, { headers });
          await delay(100);
        }

        // Delete operation (only if we have created CPUs)
        if (createdCpuIds.length > 0) {
          const cpuToDelete = createdCpuIds.shift(); // Remove and get the oldest CPU ID
          console.log(`Deleting CPU ${cpuToDelete}...`);
          await axios.delete(`${baseUrl}/cpus/${cpuToDelete}`, { headers });
          await delay(100);
        }

      } catch (error) {
        console.error(`Operation ${i} failed:`, {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
        // Continue with next operation even if current one fails
        continue;
      }
    }

    console.log('Suspicious activity simulation completed.');
    console.log('Please check the admin monitoring interface to see if the user is marked as suspicious.');

  } catch (error) {
    console.error('Error during simulation:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

// Run the simulation
simulateSuspiciousActivity(); 