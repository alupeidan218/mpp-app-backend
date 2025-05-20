require('dotenv').config();
const { Sequelize } = require('sequelize');

// Add debugging
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set'
});

const env = process.env.NODE_ENV || 'development';

// Parse Azure connection string
const parseAzureConnectionString = (connectionString) => {
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    return null;
  }
  
  try {
    console.log('Parsing Azure connection string...');
    const parts = connectionString.split(';').reduce((acc, part) => {
      const [key, value] = part.split('=');
      if (!key || !value) {
        console.error(`Invalid connection string part: ${part}`);
        return acc;
      }
      acc[key.trim()] = value.trim();
      return acc;
    }, {});

    // Validate required parts
    const requiredParts = ['Server', 'Database', 'User Id', 'Password'];
    const missingParts = requiredParts.filter(part => !parts[part]);
    
    if (missingParts.length > 0) {
      console.error('Missing required parts in connection string:', missingParts);
      return null;
    }

    console.log('Connection string parsed successfully:', {
      Server: parts.Server,
      Database: parts.Database,
      'User Id': parts['User Id'],
      Password: '****' // Hide password in logs
    });

    return {
      username: parts['User Id'],
      password: parts.Password,
      database: parts.Database,
      host: parts.Server,
      port: 5432,
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      retry: {
        max: 5,
        match: [
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/,
          /TimeoutError/
        ]
      }
    };
  } catch (error) {
    console.error('Error parsing Azure connection string:', error);
    return null;
  }
};

// Get database configuration
const getConfig = () => {
  if (env === 'production') {
    const config = parseAzureConnectionString(process.env.DATABASE_URL);
    if (config) {
      console.log('Using Azure connection string configuration');
      return config;
    }
    console.error('Failed to parse Azure connection string, falling back to development config');
  }

  // Fallback to development config
  return {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'cpu_benchmark',
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    retry: {
      max: 5,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/
      ]
    }
  };
};

const config = getConfig();
console.log('Database configuration:', {
  ...config,
  password: '****', // Hide password in logs
  username: '****'  // Hide username in logs
});

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    dialectOptions: config.dialectOptions,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: config.retry,
    logging: (msg) => console.log(`[Database] ${msg}`)
  }
);

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    console.error('Connection details:', {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      dialect: config.dialect
    });
  });

module.exports = sequelize; 