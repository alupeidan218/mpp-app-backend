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
  if (!connectionString) return null;
  
  const parts = connectionString.split(';').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

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
    }
  };
};

// Get database configuration
const getConfig = () => {
  if (env === 'production') {
    const config = parseAzureConnectionString(process.env.DATABASE_URL);
    if (config) {
      console.log('Using Azure connection string configuration');
      return config;
    }
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
    }
  }
);

module.exports = sequelize; 