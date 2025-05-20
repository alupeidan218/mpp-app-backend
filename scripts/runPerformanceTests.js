const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get JWT token for testing
async function getTestToken() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error getting test token:', error);
    process.exit(1);
  }
}

// Run JMeter test
async function runJMeterTest() {
  try {
    const token = await getTestToken();
    const jmeterPath = process.env.JMETER_HOME || 'C:\\apache-jmeter-5.6.2'; // Update this path
    const testPlanPath = path.join(__dirname, '..', 'tests', 'jmeter', 'CPU_Test_Plan.jmx');
    const resultsPath = path.join(__dirname, '..', 'tests', 'jmeter', 'results');

    // Create results directory if it doesn't exist
    if (!fs.existsSync(resultsPath)) {
      fs.mkdirSync(resultsPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsPath, `report-${timestamp}`);

    const command = `${path.join(jmeterPath, 'bin', 'jmeter')} -n -t "${testPlanPath}" -l "${path.join(reportPath, 'results.jtl')}" -e -o "${reportPath}" -JTOKEN="${token}"`;

    console.log('Running JMeter test...');
    console.log(`Command: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running JMeter test: ${error}`);
        return;
      }
      if (stderr) {
        console.error(`JMeter stderr: ${stderr}`);
        return;
      }
      console.log(`JMeter stdout: ${stdout}`);
      console.log(`Test completed. Results saved to: ${reportPath}`);
    });
  } catch (error) {
    console.error('Error running performance tests:', error);
  }
}

// Run the tests
runJMeterTest(); 